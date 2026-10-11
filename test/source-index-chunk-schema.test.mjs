import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schema=JSON.parse(fs.readFileSync("corpus/mk/source-index-chunk.schema.json","utf8"));

test("SRCIDX1 reusable source-index schema requires authority safety fields",()=>{
  const required=new Set(schema.required);
  for(const key of [
    "is_full_text",
    "current_law_authority",
    "case_law_authority",
    "official_gazette_binding_required",
    "needs_full_text_fetch"
  ]) assert.ok(required.has(key),key);
  assert.ok(Array.isArray(schema.allOf));
  assert.ok(schema.allOf.length>=2);
});

test("SRCIDX2 official source index chunks cannot validate as current law full text by default",()=>{
  const rule=schema.allOf.find(x=>x?.if?.properties?.chunk_type?.const==="official_source_index");
  assert.ok(rule);
  assert.equal(rule.then.properties.is_full_text.const,false);
  assert.equal(rule.then.properties.current_law_authority.const,false);
});
