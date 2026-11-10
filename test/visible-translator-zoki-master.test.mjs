import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const home=fs.readFileSync("index.html","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const contract=fs.readFileSync("contract-intelligence.html","utf8");
const manifest=JSON.parse(fs.readFileSync("data/ai-contract-dpro14r-manifest.json","utf8"));
const fullContract=fs.readFileSync("ai-contract-dpro14r.html","utf8");

test("root chat visibly exposes full-interface 33-language Translator",()=>{
  assert.match(home,/Translator · 33 јазици/);
  assert.match(home,/id="aiChatLanguage"/);
  assert.match(home,/🌍 Translator · Цел интерфејс \+ AI \+ глас/);
  assert.match(home,/изборот го преведува целиот интерфејс/);
  const block=chat.slice(chat.indexOf("const AI_ADVOCAT_LANGUAGES"),chat.indexOf("const LANGUAGE_KEY"));
  assert.equal((block.match(/code:"[a-z]{2}"/g)||[]).length,33);
});

test("Zoki master package and full DPRO-14R engine are both visible and governed",()=>{
  assert.match(contract,/ZOKI MASTER PACKAGE · 09\.11\.2026/);
  assert.match(contract,/AI_DOGOVORI_PRO_OFFLINE_CELOSEN_2026-11-09\.zip/);
  assert.match(contract,/AI_DOGOVORI_PRO_ONLINE_CELOSEN_2026-11-09\.zip/);
  assert.equal(manifest.releaseArtifacts.sourceMasterSha256,"53cc704406c25cfb18592b44f06a406f97368ba82eb5dd916bc650558d0a277e");
  assert.equal(manifest.releaseArtifacts.offline.sha256,"a470a9a8f4ccfa017e7b5034701cb8f05cab1cfa49bd9d838173ddf233f8fc0b");
  assert.equal(manifest.releaseArtifacts.online.sha256,"9ab0f91116d55d77374cac8f3521e2df3af0cdacb4625cc2bd4960f9ad6c876e");
  assert.equal(manifest.governance.legalValidation,"HOLD");
  assert.equal(manifest.governance.highRiskApprovals,"0/28");
  assert.match(contract,/href="\/ai-contract-dpro14r\.html"/);
  assert.equal((fullContract.match(/function [A-Za-z0-9_]+/g)||[]).length,166);
  assert.equal((fullContract.match(/<button\b/g)||[]).length,81);
  assert.equal((fullContract.match(/class="tab/g)||[]).length,18);
  assert.match(fullContract,/data-tab="normative14g"/);
  assert.match(fullContract,/PRODUCTION NO-GO/);
});
