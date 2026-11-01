import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  detectConfidentialCasePrompt as detectFromBridge,
  redactConfidentialCasePrompt as redactFromBridge
} from "../src/chat-privacy.js";
import {
  detectConfidentialCasePrompt as detectCanonical,
  redactConfidentialCasePrompt as redactCanonical
} from "../assets/chat-privacy-browser.js";

test("privacy runtime bridge exposes the canonical browser-safe implementation",()=>{
  const samples=[
    "Општо прашање за отказ на договор за вработување.",
    "ЕМБГ 0101999450012 и адреса ул. Тест бр. 12",
    "Тужба, предмет: П1-123/26, телефон 071 123 456"
  ];
  for(const sample of samples){
    assert.deepEqual(detectFromBridge(sample),detectCanonical(sample));
    assert.deepEqual(redactFromBridge(sample),redactCanonical(sample));
  }
});

test("legacy browser path is deliberately published while the rest of src stays private",()=>{
  const ignore=fs.readFileSync(".assetsignore","utf8");
  assert.match(ignore,/^src\/\*\*$/m);
  assert.match(ignore,/^!src\/chat-privacy\.js$/m);
});

test("critical runtime cache policy is fail-fresh",()=>{
  const headers=fs.readFileSync("_headers","utf8");
  assert.match(headers,/\/assets\/standalone-bot\*\.js[\s\S]*Cache-Control: no-store, max-age=0/);
  assert.match(headers,/\/src\/chat-privacy\.js[\s\S]*Cache-Control: no-store, max-age=0/);
});


test("Zoki baseline legal question is never classified as confidential",()=>{
  const q="Објасни ми на едноставен и професионален начин која е разликата меѓу отказ на договор за вработување и спогодбено престанување на работниот однос во Северна Македонија. Не измислувај членови. Ако користиш законска одредба, наведи го точниот извор и важечката верзија.";
  const verdict=detectCanonical(q);
  assert.equal(verdict.confidential,false);
  const redacted=redactCanonical(q);
  assert.equal(redacted.safeToSend,true);
  assert.equal(redacted.text,q);
});

test("browser privacy modules avoid parser features that break older embedded WebViews",()=>{
  for(const path of ["assets/chat-privacy-browser.js","src/chat-privacy.js"]){
    const source=fs.readFileSync(path,"utf8");
    assert.doesNotMatch(source,/\(\?<([=!])/,"regex lookbehind must not be used");
    assert.doesNotMatch(source,/\\p\{/,"Unicode property escapes must not be used");
  }
});
