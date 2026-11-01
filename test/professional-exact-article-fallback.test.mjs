import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadWorker} from "./load-worker.mjs";

const {workerModule}=await loadWorker();
const {professionalCanonicalArticleFallback}=workerModule;
const workerSource=fs.readFileSync("src/index.js","utf8");

const EXACT_Q="Што уредува член 12 од ЗРО и кои услови ги предвидува? Не измислувај членови или содржина. Наведи го точниот извор и важечката верзија.";

function bundle(overrides={}){
  const article={
    articleNumber:"12",
    articleNumberNormalized:"12",
    heading:null,
    text:"(1) Работодавачот и работникот се должни да ги почитуваат законите и другите применливи извори.\n(2) Со договор не може да се утврдат помали права од законските.\n(3) Може да се утврдат поповолни права за работникот.",
    status:"historical",
    publicStatus:"historical",
    humanReviewStatus:"pending",
    sourceIssueNumber:"through-111/2023",
    sourceIssueDate:"2023-05-30",
    sourceUrl:"https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf"
  };
  return {
    state:"matched",
    instrument:{canonicalKey:"mk:zro",title:"Закон за работните односи",jurisdiction:"MK"},
    version:{
      label:"official-consolidated-snapshot-through-111/2023",
      class:"dated_snapshot",
      isCurrent:false,
      humanReviewStatus:"pending"
    },
    versionBasis:"single_version",
    articles:[article],
    primaryArticles:[article],
    legalSources:[{
      title:"Закон за работните односи · член 12",
      articleNumber:"12",
      url:article.sourceUrl,
      status:"historical",
      humanReviewStatus:"pending",
      version:"official-consolidated-snapshot-through-111/2023"
    }],
    ...overrides
  };
}

test("exact ZRO Article 12 survives provider failure as canonical source-only research",()=>{
  const out=professionalCanonicalArticleFallback({
    q:EXACT_Q,
    articleBundle:bundle(),
    missionProfile:"L1_VERIFIED_RESEARCH"
  });
  assert.ok(out);
  assert.equal(out.article.articleNumber,"12");
  assert.equal(out.currentVerified,false);
  assert.match(out.answer,/Член 12 од Закон за работните односи/);
  assert.match(out.answer,/official-consolidated-snapshot-through-111\/2023/);
  assert.match(out.answer,/through-111\/2023/);
  assert.match(out.answer,/не ја означувам како „важечки текст“/);
  assert.match(out.answer,/provider-от не беше достапен/);
  assert.doesNotMatch(out.answer,/член 13/i);
});

test("canonical article fallback is bounded to exact low-depth article research",()=>{
  assert.equal(professionalCanonicalArticleFallback({q:EXACT_Q,articleBundle:bundle(),missionProfile:"L2_STRATEGY_PROCEDURE"}),null);
  assert.equal(professionalCanonicalArticleFallback({q:EXACT_Q,articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH",explicitWebRequested:true}),null);
  assert.equal(professionalCanonicalArticleFallback({q:EXACT_Q,articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH",attachmentCount:1}),null);
  assert.equal(professionalCanonicalArticleFallback({q:"Што уредува ЗРО?",articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH"}),null);
  assert.equal(professionalCanonicalArticleFallback({q:"Што уредува член 13 од ЗРО?",articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH"}),null);
  assert.equal(professionalCanonicalArticleFallback({q:"Спореди член 12 и член 13 од ЗРО.",articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH"}),null);
  assert.equal(professionalCanonicalArticleFallback({q:"Спореди ги членовите 12 и 13 од ЗРО.",articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH"}),null);
  assert.equal(professionalCanonicalArticleFallback({q:"Спореди член 12 и 13 од ЗРО.",articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH"}),null);
  assert.equal(professionalCanonicalArticleFallback({q:"Спореди членови 12-13 од ЗРО.",articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH"}),null);
  assert.equal(professionalCanonicalArticleFallback({q:"Compare articles 12 through 13 of the employment law.",articleBundle:bundle(),missionProfile:"L1_VERIFIED_RESEARCH"}),null);
});

test("raw source text is preferred over reviewed derivation and legal-status overlays are preserved",()=>{
  const b=bundle();
  b.articles[0]={
    ...b.articles[0],
    text:"RAW SOURCE ARTICLE TEXT",
    reviewedText:"DERIVED REVIEWED TEXT",
    reviewedRepresentation:{
      id:"derived-12",
      currentLawAuthority:false,
      humanGateApproved:false
    },
    legalStatusOverlays:[{
      type:"pending_constitutional_review",
      caseNumber:"U.br.1/2026",
      statusAsOf:"2026-10-11",
      legalEffect:"none_identified",
      warningMk:"Постои проверено посебно предупредување за правниот статус."
    }]
  };
  b.primaryArticles=b.articles;
  const out=professionalCanonicalArticleFallback({q:EXACT_Q,articleBundle:b,missionProfile:"L1_VERIFIED_RESEARCH"});
  assert.ok(out);
  assert.match(out.answer,/RAW SOURCE ARTICLE TEXT/);
  assert.doesNotMatch(out.answer,/DERIVED REVIEWED TEXT/);
  assert.match(out.answer,/Посебни legal-status предупредувања/);
  assert.match(out.answer,/U\.br\.1\/2026/);
  assert.match(out.answer,/статус проверен до: 2026-10-11/);
});

test("only Human-Gate approved current article/version may be labelled current verified",()=>{
  const b=bundle();
  b.version={...b.version,isCurrent:true,humanReviewStatus:"approved"};
  b.articles[0]={...b.articles[0],status:"current_consolidated",publicStatus:"current_verified",humanReviewStatus:"approved"};
  b.primaryArticles=b.articles;
  const out=professionalCanonicalArticleFallback({q:EXACT_Q,articleBundle:b,missionProfile:"L1_VERIFIED_RESEARCH"});
  assert.equal(out.currentVerified,true);
  assert.match(out.answer,/Human-Gate потврдена како тековна/);
  assert.doesNotMatch(out.answer,/не ја означувам како „важечки текст“/);
});

test("professional provider failure path returns canonical corpus response before generic 503",()=>{
  const handle=workerSource.slice(workerSource.indexOf("async function handleGPTChat"),workerSource.indexOf("async function handleAssistant"));
  const canonical=handle.indexOf("provider_failure_canonical_article_fallback");
  const generic=handle.indexOf('message:"AI runtime не успеа безбедно');
  assert.ok(canonical>0 && generic>canonical);
  assert.match(handle,/provider:"canonical_corpus_no_model"/);
  assert.match(handle,/postflightBypassReason:"deterministic_canonical_source_fallback_no_model"/);
  assert.match(handle,/legalSources:exactLegalSources\.length\?exactLegalSources/);
  assert.match(handle,/await releaseMonthlyQuota\(env,\{subject,period\}\)/);
});
