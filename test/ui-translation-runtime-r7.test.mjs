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



async function checkNoPaidUiFallback({targetLanguage="en", reason="force_workers_failure"}={}) {
  const originalFetch=globalThis.fetch;
  let paidCalls=0;
  try {
    globalThis.fetch=async()=>{paidCalls++;throw new Error("paid_translation_must_not_run");};
    const env={
      DB,RATE_LIMIT_SALT,
      OPENAI_API_KEY:"configured-but-forbidden",
      OPENAI_MODEL:"gpt-6.1-sol",
      AI:{run:async()=>{throw new Error(reason);}}
    };
    const req=new Request(base+"/api/ui-translate",{
      method:"POST",headers:commonHeaders,
      body:JSON.stringify({targetLanguage,items:[{id:"audit-no-paid",text:"Правен портал и правна едукација"}]})
    });
    const res=await worker.fetch(req,env,{});
    const data=await res.json();
    assert.equal(res.status,503);
    assert.equal(data.error,"ui_translation_provider_unavailable");
    assert.equal(data.paidFallback,false);
    assert.equal(paidCalls,0);
  } finally {
    globalThis.fetch=originalFetch;
  }
}

test("Anonymous UI translation fails closed when Workers AI fails, even with OpenAI credentials",async()=>{
  await checkNoPaidUiFallback();
});

test("Workers AI capacity exhaustion never invokes paid OpenAI for UI translations",async()=>{
  await checkNoPaidUiFallback({reason:"ui_translation_workers_ai_capacity_exhausted"});
});

test("Unsupported M2M100 languages fail closed if Workers AI LLM also fails",async()=>{
  await checkNoPaidUiFallback({targetLanguage:"eo",reason:"ui_translation_workers_ai_failed"});
});

test("Translation daily budget is truly global across different anonymous IP subjects",async()=>{
  const calls=[];
  const observedDB={prepare(sql){
    return {bind(...args){
      calls.push({sql:String(sql),args});
      return {run:async()=>({results:[{request_count:1}]})};
    }};
  }};
  const env={DB:observedDB,RATE_LIMIT_SALT,AI:{run:async(model,input)=>({translated_text:"EN:"+String(input.text||"")})}};
  for(const ip of ["203.0.113.40","203.0.113.41"]){
    const req=new Request(base+"/api/ui-translate",{
      method:"POST",headers:{...commonHeaders,"CF-Connecting-IP":ip},
      body:JSON.stringify({targetLanguage:"en",items:[{id:"daily-test",text:"Правна едукација за сите"}]})
    });
    assert.equal((await worker.fetch(req,env,{})).status,200);
  }
  const globalCalls=calls.filter(x=>x.args[0]==="ui_translate_global_day");
  assert.equal(globalCalls.length,2);
  assert.ok(globalCalls.every(x=>x.args[1]==="__all_clients__"));
  assert.ok(globalCalls.every(x=>x.args[3]===800));
});

test("Repeated short non-sensitive UI strings are cached by hash without repeat Workers AI cost",async()=>{
  let aiCalls=0;
  const env={DB,RATE_LIMIT_SALT,AI:{run:async(model,input)=>{
    aiCalls++;
    return {translated_text:"EN:"+String(input.text||"")};
  }}};
  const makeReq=()=>new Request(base+"/api/ui-translate",{
    method:"POST",headers:commonHeaders,
    body:JSON.stringify({targetLanguage:"en",items:[{id:"cache-r8-test",text:"Правна помош и информации"}]})
  });
  const first=await (await worker.fetch(makeReq(),env,{})).json();
  const firstCalls=aiCalls;
  const second=await (await worker.fetch(makeReq(),env,{})).json();
  assert.equal(first.ok,true);
  assert.equal(second.ok,true);
  assert.equal(second.cached,true);
  assert.equal(second.provider,"workers_ai_ui_cached");
  assert.ok(firstCalls>=1);
  assert.equal(aiCalls,firstCalls);
  assert.deepEqual(second.translations,first.translations);
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

