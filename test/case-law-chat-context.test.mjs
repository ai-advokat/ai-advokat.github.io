import test from "node:test";
import assert from "node:assert/strict";
import { createD1 } from "./d1-shim.mjs";
import { buildAgentPlan } from "../src/agent-orchestrator.js";
import { governedCaseLawContext } from "../src/index.js";

function seedCaseLaw(){
  const {d1,raw,stats}=createD1();

  raw.prepare(`INSERT INTO sources(title,url,source_type,issuing_body,jurisdiction,source_status)
    VALUES ('Official Supreme Court','https://www.vrhoven.sud.mk/test-case','court_database','Supreme Court','MK','official')`).run();
  raw.prepare(`INSERT INTO sources(title,url,source_type,issuing_body,jurisdiction,source_status)
    VALUES ('Paragraf secondary','https://paragraf.mk/private-case','secondary_legal_platform','Paragraf.mk','MK','verified')`).run();
  raw.prepare(`INSERT INTO sources(title,url,source_type,issuing_body,jurisdiction,source_status)
    VALUES ('HUDOC official','https://hudoc.echr.coe.int/eng?i=001-test','court_database','European Court of Human Rights','ECHR','official')`).run();

  const officialId=raw.prepare("SELECT id FROM sources WHERE url='https://www.vrhoven.sud.mk/test-case'").get().id;
  const paragrafId=raw.prepare("SELECT id FROM sources WHERE url='https://paragraf.mk/private-case'").get().id;
  const hudocId=raw.prepare("SELECT id FROM sources WHERE url='https://hudoc.echr.coe.int/eng?i=001-test'").get().id;

  const insertCase=raw.prepare(`INSERT INTO case_law
    (case_title,court,case_number,jurisdiction,legal_area,decision_date,outcome_summary,reasoning_summary,source_id,source_url,finality_status,human_review_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);

  insertCase.run(
    "Решение за притвор","Врховен суд","КЖ-101/2026","MK","кривична постапка притвор","2026-09-10",
    "Жалбата против притворот е разгледана со оценка на нужноста на мерката.",
    "Судот ја оценува конкретната опасност, причините за притвор и можноста за поблага мерка.",
    officialId,"https://www.vrhoven.sud.mk/test-case","final","reviewed"
  );
  const goodId=Number(raw.prepare("SELECT last_insert_rowid() id").get().id);

  insertCase.run(
    "Непроверено решение за притвор","Апелационен суд","КЖ-102/2026","MK","притвор","2026-09-11",
    "Непроверен исход.","Непроверено образложение за притвор.",officialId,"https://www.vrhoven.sud.mk/test-case","unknown","pending"
  );
  const pendingId=Number(raw.prepare("SELECT last_insert_rowid() id").get().id);

  insertCase.run(
    "Paragraf запис за притвор","Секундарна база","P-103/2026","MK","притвор","2026-09-12",
    "Секундарен исход.","Секундарно образложение за притвор.",paragrafId,"https://paragraf.mk/private-case","unknown","reviewed"
  );
  const secondaryId=Number(raw.prepare("SELECT last_insert_rowid() id").get().id);

  insertCase.run(
    "TEST v. NORTH MACEDONIA","European Court of Human Rights","12345/26","ECHR","effective investigation medical negligence","2026-09-08",
    "The Court examined the effectiveness of the domestic investigation.",
    "The reviewed summary concerns Article 2 procedural obligations and medical negligence.",
    hudocId,"https://hudoc.echr.coe.int/eng?i=001-test","final","reviewed"
  );
  const echrId=Number(raw.prepare("SELECT last_insert_rowid() id").get().id);

  const insertAuthority=raw.prepare(`INSERT INTO case_law_authority
    (case_law_id,court_level,decision_type,precedential_weight,outcome_side,convention_articles,domestic_articles,legal_issue_keys,human_review_status)
    VALUES (?,?,?,?,?,?,?,?,?)`);

  insertAuthority.run(goodId,"supreme","decision","strong_persuasive","neutral",null,"ЗКП","притвор жалба поблага мерка","reviewed");
  insertAuthority.run(pendingId,"appellate","decision","persuasive","neutral",null,"ЗКП","притвор жалба","pending");
  insertAuthority.run(secondaryId,"other","decision","unknown","neutral",null,"ЗКП","притвор жалба","reviewed");
  insertAuthority.run(echrId,"international","decision","strong_persuasive","neutral","Article 2",null,"effective investigation medical negligence ефективна истрага медицинска небрежност","reviewed");

  raw.prepare(`INSERT INTO case_law_holdings(case_law_id,holding_type,proposition,source_locator,human_review_status)
    VALUES (?,?,?,?,?)`).run(goodId,"principle","Притворот бара конкретно образложена нужност и разгледување на поблага мерка.","§ test","reviewed");

  return {d1,raw,stats,ids:{goodId,pendingId,secondaryId,echrId}};
}

test("CLC1 legal chat retrieves only official + case-reviewed + authority-reviewed case law",async()=>{
  const {d1}=seedCaseLaw();
  const plan=buildAgentPlan("Подготви анализа на жалба против притвор и поблага мерка.");
  const out=await governedCaseLawContext({DB:d1},"жалба против притвор поблага мерка",plan,{limit:4});
  assert.equal(out.state,"matched");
  assert.equal(out.cases.length,1);
  assert.equal(out.cases[0].case_number,"КЖ-101/2026");
  assert.equal(out.sources.length,1);
  assert.equal(out.sources[0].humanReviewStatus,"reviewed");
  assert.equal(out.sources[0].authorityReviewStatus,"reviewed");
  assert.match(out.context[0].text,/SOURCE_ROLE: OFFICIAL_REVIEWED_CASE_LAW/);
  assert.match(out.context[0].text,/CASE_LAW_IS_NOT_STATUTORY_TEXT: true/);
  assert.match(out.context[0].text,/REVIEWED_HOLDINGS:/);
  assert.match(out.context[0].text,/поблага мерка/);
});

test("CLC2 pending official cases and reviewed Paragraf-secondary cases are excluded from synthesis",async()=>{
  const {d1}=seedCaseLaw();
  const plan=buildAgentPlan("Подготви анализа на жалба против притвор и поблага мерка.");
  const out=await governedCaseLawContext({DB:d1},"жалба против притвор поблага мерка",plan,{limit:6});
  assert.deepEqual(out.cases.map(x=>x.case_number),["КЖ-101/2026"]);
  assert.ok(out.cases.every(x=>x.source_status==="official"));
});

test("CLC3 ECHR reviewed records preserve Convention authority scope",async()=>{
  const {d1}=seedCaseLaw();
  const plan=buildAgentPlan("Ефективна истрага по медицинска небрежност според член 2 ЕКЧП.");
  const out=await governedCaseLawContext({DB:d1},"ефективна истрага медицинска небрежност",plan,{limit:4});
  assert.equal(out.state,"matched");
  assert.equal(out.cases[0].jurisdiction,"ECHR");
  assert.match(out.context[0].text,/Convention case law/);
  assert.match(out.context[0].text,/CONVENTION_ARTICLES: Article 2/);
});

test("CLC4 non-legal chat bypasses case-law lookup",async()=>{
  const {d1,stats}=seedCaseLaw();
  const before=stats.statements;
  const plan=buildAgentPlan("Напиши ми краток поздрав.");
  const out=await governedCaseLawContext({DB:d1},"Напиши ми краток поздрав.",plan,{limit:4});
  assert.equal(out.state,"not_applicable");
  assert.deepEqual(out.context,[]);
  assert.equal(stats.statements,before);
});
