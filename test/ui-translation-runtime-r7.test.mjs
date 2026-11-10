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

test("Esperanto uses bounded Qwen3.8 fallback instead of pretending M2M100 supports it",async()=>{
  const env={
    DB,
    RATE_LIMIT_SALT,
    AI:{
      run:async(model,input)=>{
        assert.equal(model,"@cf/qwen/qwen3.8-27b");
        assert.ok(input);
        return {response:JSON.stringify({translations:[{id:"0",text:"Jura esplorado"}]})};
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
  assert.equal(data.provider,"qwen3.8_ui_fallback");
  assert.equal(data.translationModel,"@cf/qwen/qwen3.8-27b");
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
