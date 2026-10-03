import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const data=JSON.parse(fs.readFileSync("data/professional-library.json","utf8"));
const html=fs.readFileSync("professional-library/index.html","utf8");
describe("professional library governance",()=>{
 test("PL1 exactly two reviewed professional works are registered",()=>{assert.equal(data.records.length,2);assert.equal(new Set(data.records.map(x=>x.id)).size,2);});
 test("PL2 files are fail-closed for public download and RAG",()=>{assert.ok(data.records.every(x=>x.public_files===false));assert.ok(data.records.every(x=>x.ai_use.startsWith("blocked_for_rag")));});
 test("PL3 every format has immutable SHA-256 provenance",()=>{for(const r of data.records){assert.match(r.pdf.sha256,/^[0-9a-f]{64}$/);assert.match(r.docx.sha256,/^[0-9a-f]{64}$/);assert.ok(r.pdf.size_bytes>0&&r.docx.size_bytes>0);}});
 test("PL4 each work retains at least one blocking P1 finding",()=>{for(const r of data.records)assert.ok(r.findings.some(f=>f.severity==="P1"));});
 test("PL5 public page states Human Gate and no AI ingest",()=>{assert.match(html,/Human Gate/);assert.match(html,/AI knowledge corpus/);assert.match(html,/download и AI ingest се заклучени/);});
});