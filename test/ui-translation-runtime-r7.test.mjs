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


test("OpenAI UI fallback reconstructs protected legal tokens deterministically",async()=>{
  const originalFetch=globalThis.fetch;
  try{
    globalThis.fetch=async(url,options)=>{
      assert.equal(String(url),"https://api.openai.com/v1/responses");
      const body=JSON.parse(options.body);
      const payload=JSON.parse(body.input[0].content[0].text);
      assert.ok(payload.items.every(x=>!String(x.text).includes("10.5281/zenodo.23467865")));
      assert.ok(payload.items.every(x=>!String(x.text).includes("Human Gate")));
      return new Response(JSON.stringify({
        status:"completed",
        id:"resp_ui_test",
        output_text:JSON.stringify({
          translations:payload.items.map(x=>({id:x.id,text:"EN:"+x.text}))
        })
      }),{status:200,headers:{"content-type":"application/json"}});
    };
    const env={
      DB,
      RATE_LIMIT_SALT,
      OPENAI_API_KEY:"test-key",
      OPENAI_MODEL:"gpt-6.1-sol",
      AI:{run:async()=>{throw new Error("force_workers_failure");}}
    };
    const req=new Request(base+"/api/ui-translate",{
      method:"POST",
      headers:commonHeaders,
      body:JSON.stringify({
        targetLanguage:"en",
        items:[{id:"x",text:"AI Advokat · Human Gate · DOI 10.5281/zenodo.23467865 · Судска пракса"}]
      })
    });
    const res=await worker.fetch(req,env,{});
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.provider,"openai_responses_fallback");
    assert.match(data.translations[0].text,/AI Advokat/);
    assert.match(data.translations[0].text,/Human Gate/);
    assert.match(data.translations[0].text,/10\.5281\/zenodo\.23467865/);
    assert.match(data.translations[0].text,/EN:/);
  }finally{
    globalThis.fetch=originalFetch;
  }
});


test("OpenAI fallback preserves article/case identifiers and boundary whitespace",async()=>{
  const originalFetch=globalThis.fetch;
  try{
    globalThis.fetch=async(url,options)=>{
      const body=JSON.parse(options.body);
      const payload=JSON.parse(body.input[0].content[0].text);
      assert.ok(payload.items.every(x=>!String(x.text).includes("Article 5")));
      assert.ok(payload.items.every(x=>!String(x.text).includes("case C-123/45")));
      return new Response(JSON.stringify({
        status:"completed",
        id:"resp_ui_whitespace",
        output_text:JSON.stringify({
          translations:payload.items.map(x=>({id:x.id,text:"EN:"+x.text}))
        })
      }),{status:200,headers:{"content-type":"application/json"}});
    };
    const env={
      DB,RATE_LIMIT_SALT,
      OPENAI_API_KEY:"test-key",OPENAI_MODEL:"gpt-6.1-sol",
      AI:{run:async()=>{throw new Error("force_workers_failure");}}
    };
    const req=new Request(base+"/api/ui-translate",{
      method:"POST",headers:commonHeaders,
      body:JSON.stringify({targetLanguage:"en",items:[{id:"x",text:"Судска пракса AI Advokat · Article 5 · case C-123/45"}]})
    });
    const res=await worker.fetch(req,env,{});
    assert.equal(res.status,200);
    const data=await res.json();
    const out=data.translations[0].text;
    assert.match(out,/EN:Судска пракса AI Advokat/);
    assert.match(out,/Article 5/);
    assert.match(out,/case C-123\/45/);
    assert.doesNotMatch(out,/праксаAI Advokat/);
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test("OpenAI fallback retries without structured format on 400 schema rejection",async()=>{
  const originalFetch=globalThis.fetch;
  let calls=0;
  try{
    globalThis.fetch=async(url,options)=>{
      calls++;
      const body=JSON.parse(options.body);
      if(calls===1){
        assert.ok(body.text?.format);
        return new Response(JSON.stringify({error:{type:"invalid_request_error",code:"unsupported_response_format"}}),{
          status:400,headers:{"content-type":"application/json"}
        });
      }
      assert.equal(body.text,undefined);
      const payload=JSON.parse(body.input[0].content[0].text);
      return new Response(JSON.stringify({
        status:"completed",
        id:"resp_ui_retry",
        output_text:JSON.stringify({translations:payload.items.map(x=>({id:x.id,text:"English UI"}))})
      }),{status:200,headers:{"content-type":"application/json"}});
    };
    const env={
      DB,RATE_LIMIT_SALT,
      OPENAI_API_KEY:"test-key",OPENAI_MODEL:"gpt-6.1-sol",
      AI:{run:async()=>{throw new Error("force_workers_failure");}}
    };
    const req=new Request(base+"/api/ui-translate",{
      method:"POST",headers:commonHeaders,
      body:JSON.stringify({targetLanguage:"en",items:[{id:"x",text:"Правен портал"}]})
    });
    const res=await worker.fetch(req,env,{});
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.provider,"openai_responses_fallback");
    assert.equal(calls,2);
    assert.equal(data.translations[0].text,"English UI");
  }finally{
    globalThis.fetch=originalFetch;
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

