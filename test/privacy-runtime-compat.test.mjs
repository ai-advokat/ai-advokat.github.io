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
