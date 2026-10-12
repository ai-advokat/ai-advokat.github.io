import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const guides=JSON.parse(read("data/guides.json"));
const worker=read("src/index.js");
const sitemap=read("sitemap.xml");
const publicFull=guides.records.filter(x=>typeof x.public_fulltext==="string");

test("GG1 exactly four source-located guides are opened as public full text",()=>{
  assert.equal(publicFull.length,4);
  const ids=publicFull.map(x=>x.id).sort();
  assert.deepEqual(ids,[
    "guide-02-victim-edited-2026-10-01",
    "guide-05-workplace",
    "guide-choose-lawyer",
    "guide-free-legal-aid"
  ]);
});

test("GG2 full-text release is fail-closed by guide activation state",()=>{
  for(const g of publicFull){
    assert.ok(["active_verified","active_with_warning"].includes(g.activation_state),g.id);
    assert.notEqual(g.source_role,"version_history",g.id);
    assert.equal(g.catalog_public,true,g.id);
    assert.equal(g.public_record_enabled,true,g.id);
    assert.equal(g.public_fulltext_state,"source_text_public_with_governance_overlay",g.id);
    assert.equal(g.public_fulltext_source_binding.byte_hash_reverified_in_release,false,g.id);
    assert.equal(g.public_pdf,null,g.id+" PDF must remain separate");
  }
  for(const g of guides.records.filter(x=>x.activation_state==="review_required")){
    assert.equal(g.public_fulltext,undefined,g.id+" review_required must not expose full text");
  }
});

test("GG3 every activated full-text path exists and carries source provenance",()=>{
  for(const g of publicFull){
    const path=g.public_fulltext.replace(/^\//,"")+"index.html";
    assert.ok(fs.existsSync(path),path);
    const html=read(path);
    assert.ok(html.includes(g.source_file),g.id+" source file");
    assert.ok(html.includes(g.sha256),g.id+" registry SHA");
    assert.match(html,/Не е официјален правен извор/);
    assert.match(html,/оригиналниот source текст не се коригира тивко|Не се прават тивки правни корекции/);
    assert.ok(sitemap.includes("https://ai-advokat.github.io"+g.public_fulltext),g.id+" sitemap");
  }
});

test("GG4 warning guides preserve explicit legal warnings instead of silent correction",()=>{
  const workplace=read("guides/fulltext/05-rabotno-voznemiruvanje/index.html");
  assert.match(workplace,/Отворено правно прашање/);
  assert.match(workplace,/151\/2026/);
  const lawyer=read("guides/fulltext/izbor-na-advokat/index.html");
  assert.match(lawyer,/Тарифа и трошоци/);
  const victim=read("guides/fulltext/02-zrtva/index.html");
  assert.match(victim,/Актуелност на кривичната постапка/);
  const bpp=read("guides/fulltext/besplatna-pravna-pomos/index.html");
  assert.match(bpp,/Правна проверка/);
});

test("GG5 Gazette API is read-only metadata and current status is Human-Gate bounded",()=>{
  const start=worker.indexOf("async function handleGazetteRegister(");
  const end=worker.indexOf("function handleWebSources(",start);
  assert.ok(start>=0&&end>start);
  const block=worker.slice(start,end);
  assert.match(block,/request\.method!==\"GET\" && request\.method!==\"HEAD\"/);
  assert.match(block,/currentVerified:Number\(row\.is_current\)===1 && row\.human_review_status===\"approved\"/);
  assert.match(block,/subscriberContentCopied:false/);
  assert.ok(!/event_text/.test(block),"Gazette public endpoint must not expose amendment full text");
  assert.ok(!/(INSERT|UPDATE|DELETE)\s+/i.test(block),"Gazette endpoint must not write D1");
  assert.match(worker,/\/api\/gazette-register/);
});

test("GG6 Gazette page is a provenance product, not a Gazette replica",()=>{
  const html=read("sluzben-vesnik/index.html");
  assert.match(html,/Ова не е копија на „Службен весник“/);
  assert.match(html,/Не се заобиколува претплата/);
  assert.match(html,/\/api\/gazette-register/);
  assert.match(html,/ТЕКОВНО · HUMAN GATE/);
  assert.ok(sitemap.includes("https://ai-advokat.github.io/sluzben-vesnik/"));
});

test("GG7 Administrative V2 remains catalogued but is not falsely released from a non-final binary snapshot",()=>{
  const admin=guides.records.find(x=>x.id==="guide-administrative-v2");
  assert.ok(admin);
  assert.equal(admin.activation_state,"active_verified");
  assert.equal(admin.public_fulltext,undefined);
  assert.equal(admin.public_master_artifact.artifact_version,"V2.0 FINAL MASTER");
});
