import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const rc8=require("../consolidator/zoki-rc36/RC8_CORE.js");
const portal=fs.readFileSync("consolidator/index.html","utf8");
const bridge=fs.readFileSync("consolidator/zoki-rc36/bridge.js","utf8");
const chat=fs.readFileSync("assets/zoki-consolidator-conversation-r25.js","utf8");
const home=fs.readFileSync("index.html","utf8");
const external=fs.readFileSync("bot/index.html","utf8");

test("real owner RC8 core integrates into existing v10.4 without replacement",()=>{
  assert.equal(rc8.SCHEMA,"PARAGRAF_RC8_BRIDGE_V1");
  assert.match(portal,/Legal Formatter v10\.4/);
  assert.match(portal,/assets\/legal-formatter-v10\.4\/lfcore\.js/);
  assert.match(portal,/consolidator\/zoki-rc36\/RC8_CORE\.js/);
  assert.match(portal,/consolidator\/zoki-rc36\/bridge\.js/);
  for(const id of ["zrBridge","zrDemo","zrNew","zrFromV104","zrOriginal","zrFind","zrInsert","zrAdd","zrPreview","zrAsOf","zrEvidenceFile","zrExport","zrImport"])
    assert.ok(portal.includes('id="'+id+'"'),"missing "+id);
});
test("RC8 exact replacement preserves original and returns explicit legal HOLD",()=>{
  const d=rc8.draft("TEST_RC36","Синтетички акт");
  d.provisions=[{id:"1.1",text:"Член 1. Стар текст.",source:"DEMO"}];
  d.operations=[{type:"replace_exact",target:"1.1",find:"Стар текст",insert:"Предложен нов текст",reason:"Тест",source:"TEST_SOURCE"}];
  const before=JSON.stringify(d);
  const p=rc8.preview(d);
  assert.equal(JSON.stringify(d),before);
  assert.equal(p.provisions[0].original,"Член 1. Стар текст.");
  assert.equal(p.provisions[0].preview,"Член 1. Предложен нов текст.");
  assert.equal(p.legalApproval,false);
  assert.equal(p.humanGate11,"OPEN");
  assert.equal(p.humanGate35,"OPEN");
  assert.equal(p.production,"NO_GO");
  assert.equal(p.status,"REVIEW_REQUIRED");
});
test("exact-match core must reject ambiguous edits and forged legal approval",()=>{
  const d=rc8.draft("TEST_RC36","Синтетички акт");
  d.provisions=[{id:"1.1",text:"AA AA",source:"DEMO"}];
  d.operations=[{type:"replace_exact",target:"1.1",find:"AA",insert:"BB",reason:"Тест",source:"TEST_SOURCE"}];
  assert.throws(()=>rc8.preview(d),/ТОЧНО ЕДНАШ/);
  d.operations[0].find="AA AA";
  d.legalApproval=true;
  assert.throws(()=>rc8.validate(d),/Забрането/);
});
test("governed consolidation stays local and rejects forged import status",()=>{
  assert.match(bridge,/validateImport\(o\)/);
  assert.match(bridge,/o\.legalApproval!==false/);
  assert.match(bridge,/o\.humanGate11!=="OPEN"/);
  assert.match(bridge,/o\.humanGate35!=="OPEN"/);
  assert.match(bridge,/o\.production!=="NO_GO"/);
  assert.match(bridge,/o\.article48!=="LEGAL_HOLD"/);
  assert.match(bridge,/crypto\.subtle\.digest\("SHA-256",bytes\)/);
  assert.match(bridge,/file\.size>1024\*1024/);
  assert.doesNotMatch(bridge,/fetch\(|XMLHttpRequest|sendBeacon|eval\(/);
});
test("both existing bot UIs can stage a single guided RC36 prompt with manual Send",()=>{
  for(const h of [home,external]){
    assert.match(h,/assets\/zoki-consolidator-conversation-r25\.js/);
  }
  assert.match(chat,/getElementById\("aiChatInput"\)\|\|document\.getElementById\("question"\)/);
  assert.match(chat,/input\.value="Зоки RC36/);
  assert.match(chat,/input\.dispatchEvent\(new Event\("input"/);
  assert.match(chat,/href="\/consolidator\/"/);
  assert.doesNotMatch(chat,/requestSubmit\(|\.submit\(|fetch\(|XMLHttpRequest|sendBeacon/);
});
