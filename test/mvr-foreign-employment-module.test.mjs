import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const data=JSON.parse(fs.readFileSync("data/mvr-foreign-employment-checklists.json","utf8"));

test("AI chat exposes dedicated foreign employment icon/module",()=>{
  assert.match(html,/Престој и вработување на странци/);
  assert.match(html,/data-foreign-employment="verify"/);
  assert.match(html,/МВР чек-листи · прв пат \/ продолжување/);
});

test("module preserves both photographed MVR checklists",()=>{
  assert.equal(data.checklists.first_time.items.length,10);
  assert.equal(data.checklists.renewal.items.length,9);
  assert.match(data.checklists.first_time.items.join("\n"),/неосудуван/);
  assert.match(data.checklists.renewal.items.join("\n"),/Здравствено осигурување/);
  assert.match(data.submission.as_posted,/канцеларија 901/);
  assert.match(data.fees.as_posted.join("\n"),/4\.000 денари/);
  assert.match(data.fees.as_posted.join("\n"),/2\.150 денари/);
});

test("bot prompt enforces source/version verification",()=>{
  assert.match(js,/НЕ е сама по себе важечки правен извор/);
  assert.match(js,/Провери ја секоја ставка според важечките прописи и официјалните извори/);
  assert.match(js,/точен извор, член\/одредба, верзија и датум/);
  assert.equal(data.fees.status,"must_verify_before_payment");
  assert.equal(data.submission.verification_required,true);
});
