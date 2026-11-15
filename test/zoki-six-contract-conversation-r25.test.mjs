import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const code=fs.readFileSync("assets/zoki-six-contract-conversation-r25.js","utf8");
const internal=fs.readFileSync("index.html","utf8");
const external=fs.readFileSync("bot/index.html","utf8");
const models=["nda","cooperation","services","lease","loan","debt"];
test("all six source-supported models have an entry in both existing bot UIs",()=>{
 for(const id of models)assert.match(code,new RegExp('"'+id+'"'));
 for(const html of [internal,external]){
  assert.match(html,/assets\/zoki-six-contract-conversation-r25\.js/);
  assert.match(html,/\/ai-contract\.html/);
 }
});
test("click only stages a generic legal working-draft question; never auto-sends",()=>{
 assert.match(code,/input\.value=prompt\(name\)/);
 assert.match(code,/input\.dispatchEvent\(new Event\("input"/);
 assert.match(code,/type="button"/);
 assert.doesNotMatch(code,/\.requestSubmit\(|\.submit\(|fetch\(|XMLHttpRequest|navigator\.sendBeacon/);
});
test("human access, privacy and legal approval boundaries remain explicit",()=>{
 assert.match(code,/Secure Case Workspace/);
 assert.match(code,/Human Gate: HOLD/);
 assert.match(code,/Не измислувај факти/);
 assert.match(code,/getElementById\("aiChatInput"\)\|\|document\.getElementById\("question"\)/);
});
