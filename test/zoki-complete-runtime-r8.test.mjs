import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { loadWorker } from "./load-worker.mjs";

const {worker}=await loadWorker();
const base="https://ai-advokat-github-io.aiadvokat16.workers.dev";
const RATE_LIMIT_SALT="zoki-r8-test-salt-0123456789abcdef";
const DB={
  prepare(){
    return {
      bind(){
        return {
          run:async()=>({results:[{request_count:1}]}),
          first:async()=>({request_count:1})
        };
      }
    };
  }
};
const headers={
  "CF-Connecting-IP":"203.0.113.88",
  "Origin":"https://ai-advokat.github.io"
};

test("33-language translation falls back to bounded Qwen when M2M100 fails",async()=>{
  const calls=[];
  const env={
    DB,RATE_LIMIT_SALT,
    AI:{
      run:async(model,input)=>{
        calls.push(model);
        if(model==="@cf/meta/m2m100-1.2b") throw new Error("simulated m2m failure");
        assert.equal(model,"@cf/qwen/qwen3-30b-a3b-fp8");
        return {response:"Legal sources"};
      }
    }
  };
  const res=await worker.fetch(new Request(base+"/api/ui-translate",{
    method:"POST",
    headers:{...headers,"content-type":"application/json"},
    body:JSON.stringify({targetLanguage:"en",items:[{id:"0",text:"Правни извори"}]})
  }),env,{});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.ok,true);
  assert.equal(data.provider,"m2m100_qwen_fallback");
  assert.equal(data.translations[0].text,"Legal sources");
  assert.ok(calls.includes("@cf/meta/m2m100-1.2b"));
  assert.ok(calls.includes("@cf/qwen/qwen3-30b-a3b-fp8"));
});

test("consolidator converts PDF transiently without storage",async()=>{
  const env={
    DB,RATE_LIMIT_SALT,
    FREE_CHAT_PROVIDER:"workers_ai",
    WORKERS_AI_MARKDOWN_ENABLED:"true",
    AI:{
      run:async()=>({response:"unused"}),
      toMarkdown:async files=>{
        assert.equal(files.length,1);
        return [{format:"text",data:"З А К О Н\nЧлен 1\nТест одредба."}];
      }
    }
  };
  const pdf=new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x37,0x0a]);
  const res=await worker.fetch(new Request(base+"/api/consolidator/import",{
    method:"POST",
    headers:{...headers,"content-type":"application/pdf","x-file-name":"law.pdf"},
    body:pdf
  }),env,{});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.ok,true);
  assert.equal(data.provider,"workers_ai_markdown_conversion");
  assert.equal(data.transient,true);
  assert.equal(data.stored,false);
  assert.match(data.text,/Член 1/);
});

test("Zoki navigation, language contrast and consolidator imports are wired",()=>{
  const bot=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");
  const css=fs.readFileSync("assets/standalone-bot.css","utf8");
  const contract=fs.readFileSync("ai-contract.html","utf8");
  const consolidator=fs.readFileSync("consolidator/index.html","utf8");
  assert.match(bot,/§ Службени извори/);
  assert.match(bot,/◫ Материјали и документи/);
  assert.match(css,/select option\{background:#fff;color:#071524\}/);
  assert.match(contract,/select option\{background:#fff;color:#071524\}/);
  for(const ext of [".txt",".md",".json",".pdf",".docx"]) assert.ok(consolidator.includes(ext),ext);
  assert.match(consolidator,/\/api\/consolidator\/import/);
  assert.match(consolidator,/TXT\/MD\/JSON се читаат локално/);
});
