import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>fs.readFileSync(p,"utf8");
const dir="data/official-law-texts/";
const manifest=JSON.parse(read(dir+"manifest.json"));

test("official source library links to all three Zoki Gazette statutory inputs",()=>{
 assert.equal(manifest.status,"SOURCE_TEXT_LIBRARY_ONLY_NOT_LEGAL_CONSOLIDATION");
 assert.equal(manifest.sources.length,3);
 assert.deepEqual(manifest.sources.map(x=>x.issue),["101/2019","194/2024","151/2026"]);
 for(const source of manifest.sources){
   assert.match(source.original_sha256,/^[a-f0-9]{64}$/);
   assert.match(source.ldbis,/^https:\/\/ldbis\.pravda\.gov\.mk\//);
   assert.ok(Array.isArray(source.chunks)&&source.chunks.length>0);
   assert.ok(source.notice.includes("PDF")||source.notice.includes("ЗПП"));
 }
 assert.equal(manifest.sources[2].ldbis_application_date,"2027-01-18");
 assert.match(manifest.zpp_current_warning,/NOT/);
});

test("all original Gazette PDF pages have complete machine-text provenance with no silent truncation",()=>{
 const originals=[{pages:[92,105],sha:"028f63f0a07393c464941a0069cb9e0d51e02ade8caf856ed7bc280d47f21568"},
 {pages:[3,3],sha:"38d7391de8ab33d6f3a1936b52cdf2eea13d8080063463282df0b87f3e4951aa"},
 {pages:[1,123],sha:"8312c7b3a1c7d9f59d73d48ffddd820b1aa0774a7f5e4afb7515819d6be49553"}];
 for(let i=0;i<manifest.sources.length;i++){
  const src=manifest.sources[i],want=originals[i],all=[];
  for(const fname of src.chunks){
   assert.match(fname,/^[a-z0-9][a-z0-9._-]*\.json$/);
   const chunk=JSON.parse(read(dir+fname));
   assert.equal(chunk.schema_version,"1.0");
   assert.equal(chunk.law_id,src.id);
   assert.equal(chunk.publication,src.issue);
   assert.equal(chunk.pdf_source_sha256,want.sha);
   assert.match(chunk.text_status,/ORIGINAL PDF remains authoritative/);
   for(const pg of chunk.pages){assert.ok(pg.text.length>300);all.push(pg)}
  }
  assert.equal(all.length,want.pages[1]-want.pages[0]+1,src.id+" missing pages");
  assert.deepEqual(all.map(x=>x.pdf_page),Array.from({length:all.length},(_,n)=>want.pages[0]+n));
  assert.deepEqual(src.source_pdf_page_range,want.pages);
  assert.equal(src.original_sha256,want.sha);
 }
});

test("151/2026 ZPP original source provides all 519 article headings and page-index linkage",()=>{
 const source=manifest.sources[2];const index=JSON.parse(read(dir+source.article_index));
 assert.equal(index.article_count,519);
 assert.equal(index.articles.length,519);
 assert.deepEqual(index.articles.map(x=>x.article),Array.from({length:519},(_,n)=>n+1));
 assert.equal(index.articles.find(x=>x.article===184).pdf_page,47);
 assert.equal(index.articles.find(x=>x.article===519).pdf_page,123);
 const articles=[];
 for(const file of source.chunks){
  const data=JSON.parse(read(dir+file));
  for(const page of data.pages){
    const re=/^\s*Член\s+(\d+)(?:\s|$)/gm;
    for(const match of page.text.matchAll(re))articles.push({article:+match[1],pdf_page:page.pdf_page,chunk:file});
  }
 }
 assert.deepEqual(articles,index.articles);
});

test("AI Contract, Quick Review, Consolidator, homepage and external bot expose the searchable statute library",()=>{
 for(const path of ["ai-contract.html","contract-intelligence.html","consolidator/index.html","index.html","bot/index.html"]){
  assert.ok(read(path).includes('href="/official-law-library.html"'),path);
 }
 const html=read("official-law-library.html");
 assert.match(html,/Content-Security-Policy/);
 assert.match(html,/connect-src 'self'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/id="query"/);
 assert.match(html,/id="pageText"/);
 assert.match(html,/type="module" src="\/assets\/official-law-library\.mjs"/);
 assert.doesNotMatch(html,/<form\b/i);
 const js=read("assets/official-law-library.mjs");
 execFileSync(process.execPath,["--check","assets/official-law-library.mjs"]);
 assert.match(js,/pagesAreComplete/);
 assert.match(js,/chunk\.pdf_source_sha256!==source\.original_sha256/);
 assert.match(js,/textContent=pg\.text/);
 assert.match(js,/index\.articles\.length!==source\.expected_article_count/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|\/api\//);
});

test("source UI clearly distinguishes official PDFs from machine extraction and valid/current law",()=>{
 const html=read("official-law-library.html");
 assert.match(html,/машински/i);
 assert.match(html,/ПРАВНО РАЗГРАНИЧУВАЊЕ/);
 assert.match(html,/не е потврден пречистен текст/i);
 const js=read("assets/official-law-library.mjs");
 assert.match(js,/ORIGINAL PDF/);
 assert.match(js,/machine transcription/i);
 assert.match(manifest.sources[2].status,/future_application/);
});
