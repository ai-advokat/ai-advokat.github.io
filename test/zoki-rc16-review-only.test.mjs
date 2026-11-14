import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const review=read("consolidator/zoki-rc16-review.html");
test("RC16 page remains static and isolated from production legal execution",()=>{
 assert.match(review,/RC16.*REVIEW ONLY.*LEGAL NO-GO/);
 assert.match(review,/HG11/);assert.match(review,/HG35/);
 assert.match(review,/connect-src 'none'/);
 assert.match(review,/form-action 'none'/);
 assert.doesNotMatch(review,/<script\b/i);
 assert.doesNotMatch(review,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage)\s*\(/);
 assert.doesNotMatch(review,/<(?:input|textarea|form|iframe)\b/i);
 assert.doesNotMatch(review,/<(?:link|script)\s+[^>]*(?:src|href)=["']https?:/i);
 assert.match(review,/NOT TESTED/);
 assert.match(review,/NO-GO/);
});
test("RC16 navigation reaches one single review gate on every requested surface",()=>{
 for(const path of ["index.html","bot/index.html","consolidator/index.html","ai-contract.html","contract-intelligence.html"]){
  assert.match(read(path),/href="\/consolidator\/zoki-rc16-review\.html"/,path);
 }
 for(const path of ["/","/bot/","/consolidator/","/ai-contract.html","/contract-intelligence.html"]){
  assert.ok(review.includes('href="'+path+'"'),"missing return navigation "+path);
 }
});
test("RC16 copyrighted source, client files and official-law claim stay excluded",()=>{
 const files=fs.readdirSync("consolidator");
 assert.ok(files.includes("zoki-rc16-review.html"));
 assert.doesNotMatch(review,/current_consolidated|legal_approved.*true|production.*GO(?!-)/i);
 const doc=read("docs/ZOKI_RC16_REVIEW_ONLY_2026-11-14.md");
 assert.match(doc,/not independently validated/i);
 assert.match(doc,/do not merge/i);
});
