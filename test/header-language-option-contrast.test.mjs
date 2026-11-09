import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const home=fs.readFileSync("index.html","utf8");

test("header language dropdown options have explicit readable contrast",()=>{
  assert.match(home,/\.utility select option\s*\{[\s\S]*?background:#ffffff;[\s\S]*?color:#071524;/);
  assert.match(home,/\.utility select option:checked\s*\{[\s\S]*?background:#dfe8f1;[\s\S]*?color:#071524;/);
});
