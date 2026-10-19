import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const data=JSON.parse(fs.readFileSync("data/professional-library.json","utf8"));
const html=fs.readFileSync("professional-library/index.html","utf8");
describe("professional library governance",()=>{
 test("PL1 reviewed professional works are uniquely registered",()=>{
   assert.ok(data.records.length>=3);
   assert.equal(new Set(data.records.map(x=>x.id)).size,data.records.length);
   for(const id of ["criminal-procedure-manual-2026","echr-north-macedonia-manual-v4-2","zkp-commentary-v6-2026"]) assert.ok(data.records.some(x=>x.id===id),`Missing ${id}`);
 });
 test("PL2 files and RAG remain fail-closed unless separately released",()=>{
   assert.ok(data.records.every(x=>x.public_files===false));
   assert.ok(data.records.every(x=>String(x.ai_use).includes("rag")));
 });
 test("PL3 immutable source provenance exists",()=>{
   for(const r of data.records){
     assert.match(r.docx.sha256,/^[0-9a-f]{64}$/);
     assert.ok(r.docx.size_bytes>0);
     if(r.pdf?.size_bytes>0) assert.match(r.pdf.sha256,/^[0-9a-f]{64}$/);
     if(r.database){
       assert.match(r.database.sha256,/^[0-9a-f]{64}$/);
       assert.equal(r.database.records,570);
     }
   }
 });
 test("PL4 unresolved works retain a P1 boundary; released restricted works carry release metadata",()=>{
   for(const r of data.records){
     if(r.status==="published_restricted_commercial"){
       assert.equal(r.access,"restricted");
       assert.equal(r.commercial_access,true);
       assert.match(r.doi,/^10\.5281\/zenodo\.\d+$/);
       assert.equal(r.public_files,false);
       assert.ok(!r.findings.some(f=>f.severity==="P1"));
     }else{
       assert.ok(r.findings.some(f=>f.severity==="P1"));
     }
   }
 });
 test("PL5 public page states Human Gate and no AI ingest",()=>{
   assert.match(html,/Human Gate/);
   assert.match(html,/AI knowledge corpus/);
   assert.match(html,/download и AI ingest се заклучени/);
 });
 test("PL6 commercial manual points to a human-gated purchase page",()=>{
   const manual=data.records.find(x=>x.id==="criminal-procedure-manual-2026");
   assert.equal(manual.version,"3.4");
   assert.equal(manual.pdf.pages,1147);
   assert.equal(manual.purchase_page,"https://ai-advokat.github.io/books/priracnik-krivicni-predmeti/");
   assert.equal(manual.pricing.payment_mode,"manual_human_gate");
   assert.match(html,/Комерцијален пристап и нарачка/);
 });
});
