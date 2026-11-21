import test from "node:test";
import assert from "node:assert/strict";
import { loadWorker } from "./load-worker.mjs";

const {worker}=await loadWorker();
const base="https://ai-advokat-github-io.aiadvokat16.workers.dev";
const DB={
  prepare(){
    return {
      bind(){
        return {
          run:async()=>({results:[{request_count:1}]})
        };
      }
    };
  }
};
const commonHeaders={
  "content-type":"application/json",
  "CF-Connecting-IP":"203.0.113.44",
  "Origin":"https://ai-advokat.github.io"
};
const RATE_LIMIT_SALT="translator-r7-test-salt-0123456789abcdef";

test("UI translation uses dedicated M2M100 and preserves protected legal identifiers",async()=>{
  const calls=[];
  const env={
    DB,
    RATE_LIMIT_SALT,
    AI:{
      run:async(model,input)=>{
        calls.push({model,input});
        assert.equal(model,"@cf/meta/m2m100-1.2b");
        return {translated_text:"EN:"+String(input.text||"")};
      }
    }
  };
  const req=new Request(base+"/api/ui-translate",{
    method:"POST",
    headers:commonHeaders,
    body:JSON.stringify({
      targetLanguage:"en",
      items:[
        {id:"0",text:"Судска пракса и човечка контрола"},
        {id:"1",text:"AI Advokat · Human Gate · DOI 10.5281/zenodo.23467865"}
      ]
    })
  });
  const res=await worker.fetch(req,env,{});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.ok,true);
  assert.equal(data.provider,"m2m100");
  assert.equal(data.translationModel,"@cf/meta/m2m100-1.2b");
  assert.equal(data.translations.length,2);
  assert.match(data.translations[0].text,/EN:/);
  assert.match(data.translations[1].text,/AI Advokat/);
  assert.match(data.translations[1].text,/Human Gate/);
  assert.match(data.translations[1].text,/10\.5281\/zenodo\.23467865/);
  assert.ok(calls.length>=1);
  assert.ok(calls.every(x=>x.model==="@cf/meta/m2m100-1.2b"));
});

test("Esperanto uses bounded live Workers AI fallback instead of pretending M2M100 supports it",async()=>{
  const env={
    DB,
    RATE_LIMIT_SALT,
    AI:{
      run:async(model,input)=>{
        assert.equal(model,"@cf/openai/gpt-oss-120b");
        assert.ok(input);
        return {response:"Jura esplorado"};
      }
    }
  };
  const req=new Request(base+"/api/ui-translate",{
    method:"POST",
    headers:commonHeaders,
    body:JSON.stringify({targetLanguage:"eo",items:[{id:"0",text:"Правно истражување"}]})
  });
  const res=await worker.fetch(req,env,{});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.ok,true);
  assert.equal(data.provider,"workers_ai_ui_fallback");
  assert.equal(data.translationModel,"@cf/openai/gpt-oss-120b");
  assert.equal(data.translations[0].text,"Jura esplorado");
});

test("Macedonian source mode is a structured passthrough and does not call AI",async()=>{
  let calls=0;
  const env={AI:{run:async()=>{calls++;return {}}}};
  const req=new Request(base+"/api/ui-translate",{
    method:"POST",
    headers:commonHeaders,
    body:JSON.stringify({targetLanguage:"mk",items:[{id:"x",text:"Судска пракса"}]})
  });
  const res=await worker.fetch(req,env,{});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.provider,"source_passthrough");
  assert.deepEqual(data.translations,[{id:"x",text:"Судска пракса"}]);
  assert.equal(calls,0);
});


async function assertPublicUiNeverPays(targetLanguage="en",reason="synthetic_workers_failure"){
  const previous=globalThis.fetch;let externalCalls=0;
  try{
    globalThis.fetch=async()=>{externalCalls++;throw new Error("paid_fallback_forbidden");};
    const env={DB,RATE_LIMIT_SALT,OPENAI_API_KEY:"synthetic-configured",
      OPENAI_MODEL:"test-model",AI:{run:async()=>{throw new Error(reason);}}};
    const r=await worker.fetch(new Request(base+"/api/ui-translate",{
      method:"POST",headers:commonHeaders,
      body:JSON.stringify({targetLanguage,items:[{id:"guard",text:"Правни информации за граѓаните"}]})
    }),env,{});
    assert.equal(r.status,503);
    const body=await r.json();
    assert.equal(body.error,"ui_translation_provider_unavailable");
    assert.equal(body.paidFallback,false);assert.equal(externalCalls,0);
  }finally{globalThis.fetch=previous;}
}
test("RC8-A public UI translation fails closed without paid fallback",async()=>{
  await assertPublicUiNeverPays();
});
test("RC8-A exhaustion never invokes paid OpenAI for public translation",async()=>{
  await assertPublicUiNeverPays("en","ui_translation_workers_ai_capacity_exhausted");
});
test("RC8-A unsupported languages also fail closed without paid fallback",async()=>{
  await assertPublicUiNeverPays("eo");
});
test("RC8-A global translation hourly and daily limits are across clients",async()=>{
  const calls=[];
  const observedDB={prepare(sql){return {bind(...args){calls.push({sql,args});return {run:async()=>({results:[{request_count:1}]})};}};}};
  const env={DB:observedDB,RATE_LIMIT_SALT,AI:{run:async(model,input)=>({translated_text:"EN:"+String(input.text||"")})}};
  for(const ip of ["203.0.113.40","203.0.113.41"]){
    const r=await worker.fetch(new Request(base+"/api/ui-translate",{
      method:"POST",headers:{...commonHeaders,"CF-Connecting-IP":ip},
      body:JSON.stringify({targetLanguage:"en",items:[{id:"shared",text:"Правен портал"}]})
    }),env,{});
    assert.equal(r.status,200);
  }
  for(const scope of ["ui_translate_global_hour","ui_translate_global_day"]){
    const callsOfScope=calls.filter(x=>x.args[0]===scope);
    assert.equal(callsOfScope.length,2);
    assert.ok(callsOfScope.every(x=>x.args[1]==="__all_clients__"));
  }
});

test("M2M100 failure falls back only the failed item instead of the whole batch",async()=>{
  const calls=[];
  const env={
    DB,
    RATE_LIMIT_SALT,
    AI:{
      run:async(model,input)=>{
        calls.push({model,input});
        if(model==="@cf/meta/m2m100-1.2b"){
          const text=String(input.text||"");
          if(text.includes("Втора")) throw new Error("simulated_single_item_m2m_failure");
          return {translated_text:"SQ:"+text};
        }
        assert.equal(model,"@cf/openai/gpt-oss-120b");
        return {response:"SQ:FALLBACK"};
      }
    }
  };
  const req=new Request(base+"/api/ui-translate",{
    method:"POST",
    headers:commonHeaders,
    body:JSON.stringify({
      targetLanguage:"sq",
      items:[
        {id:"0",text:"Прва ставка"},
        {id:"1",text:"Втора ставка"}
      ]
    })
  });
  const res=await worker.fetch(req,env,{});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.ok,true);
  assert.equal(data.provider,"m2m100_workers_ai_item_fallback");
  assert.equal(data.translationModel,"@cf/meta/m2m100-1.2b");
  assert.equal(data.fallbackTranslationModel,"@cf/openai/gpt-oss-120b");
  assert.equal(data.fallbackItemCount,1);
  assert.equal(data.translations[0].text,"SQ:Прва ставка");
  assert.equal(data.translations[1].text,"SQ:FALLBACK");
  assert.equal(calls.filter(x=>x.model==="@cf/openai/gpt-oss-120b").length,1);
});

