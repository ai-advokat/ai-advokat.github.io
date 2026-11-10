import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { summarizeCaseLawCorpus, corpusRadarPrompt } from "../src/case-law-corpus-radar.js";
import { APPEAL_SKOPJE_36_RECORDS } from "../src/appeal-skopje-36-discovery.js";

const worker=fs.readFileSync("src/index.js","utf8");
const page=fs.readFileSync("case-law-curation.html","utf8");
const internal=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const external=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");
const botHtml=fs.readFileSync("bot/index.html","utf8");
const indexHtml=fs.readFileSync("index.html","utf8");
const pagesSync=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");

test("corpus radar separates reviewed authority from discovery and reports hierarchy gaps",()=>{
  const rows=[
    {court_level:"supreme",jurisdiction:"MK",outcome_side:"supporting",legal_area:"граѓанско право",legal_issue_keys:"сопственост"},
    {court_level:"appellate",jurisdiction:"MK",outcome_side:"adverse",legal_area:"кривично право",legal_issue_keys:"доказ"},
    {court_level:"constitutional",jurisdiction:"MK",outcome_side:"neutral",legal_area:"уставно право",legal_issue_keys:"човекови права"},
    {court_level:"echr_chamber",jurisdiction:"ECHR",outcome_side:"distinguishing",legal_area:"human rights",legal_issue_keys:"Article 6 fair trial"}
  ];
  const discovery=[{i:"Перење пари",n:"КОКЖ-1/25"},{i:"Криумчарење мигранти",n:"КОКЖ-2/25"}];
  const out=summarizeCaseLawCorpus(rows,discovery);
  assert.equal(out.reviewedAuthorityCount,4);
  assert.equal(out.discoveryCount,2);
  assert.equal(out.totalVisibleCorpus,6);
  assert.equal(out.outcomeRoles.supporting,1);
  assert.equal(out.outcomeRoles.adverse,1);
  assert.equal(out.outcomeRoles.distinguishing,1);
  assert.equal(out.humanGateRequired,true);
  assert.ok(out.hierarchyGaps.some(x=>x.id==="supreme" && x.gap===249));
});

test("next-package prompt is diversity and provenance aware",()=>{
  const prompt=corpusRadarPrompt({
    hierarchyGaps:[{id:"supreme",gap:200},{id:"echr",gap:120}],
    diversity:{nextCollectionPriorities:[{bucket:"evidence_and_fair_trial",gap:100}]}
  });
  assert.match(prompt,/Hierarchy gaps:/);
  assert.match(prompt,/Issue gaps:/);
  assert.match(prompt,/official item binding/i);
  assert.match(prompt,/supporting\/adverse\/distinguishing/);
});

test("curation plan API reads governed D1 authority and returns radar + next prompt",()=>{
  assert.match(worker,/async function handleCaseLawCurationPlan\(request,env\)/);
  assert.match(worker,/official_binding_verified=1/);
  assert.match(worker,/summarizeCaseLawCorpus\(reviewedRows,supplied\)/);
  assert.match(worker,/nextPackagePrompt:corpusRadarPrompt\(radar\)/);
  assert.match(worker,/\/api\/case-law\/curation-plan/);
});

test("shared corpus radar product surface is visible from internal and external AI Advokat",()=>{
  assert.match(page,/Case-Law Corpus Radar/);
  assert.match(page,/\/api\/case-law\/curation-plan/);
  assert.match(page,/Отвори внатрешен AI Advokat/);
  assert.match(page,/Отвори надворешен AI Advokat/);
  assert.match(indexHtml,/Case-Law Radar/);
  assert.match(internal,/Case-Law Radar/);
  assert.match(external,/case-law-curation\.html/);
  assert.match(botHtml,/Case-Law Corpus Radar/);
});

test("GitHub Pages sync always deploys and verifies the Case-Law Radar page",()=>{
  const refs=pagesSync.match(/case-law-curation\.html/g)||[];
  assert.ok(refs.length>=4,"Pages sync must trigger, verify, copy, and parity-check case-law-curation.html");
  assert.match(pagesSync,/grep -q 'Case-Law Corpus Radar' case-law-curation\.html/);
  assert.match(pagesSync,/grep -q '\/api\/case-law\/curation-plan' case-law-curation\.html/);
  assert.match(indexHtml,/href="\/case-law-curation\.html"/);
});

test("Case-Law Radar has an always-visible Macedonian guide and routes Pages to the Worker API",()=>{
  assert.match(page,/CASE_LAW_RADAR_GUIDE_R1/);
  assert.match(page,/Case-Law Radar во 6 чекори/);
  assert.match(page,/Практична скрипта:/);
  assert.match(page,/Reviewed authority/);
  assert.match(page,/Discovery record/);
  assert.match(page,/Supporting \/ Adverse/);
  assert.match(page,/Distinguishing/);
  assert.match(page,/ai-advokat-github-io\.aiadvokat16\.workers\.dev/);
  assert.match(page,/location\.hostname==="ai-advokat\.github\.io"/);
  assert.match(page,/API_URL=API_ORIGIN\+"\/api\/case-law\/curation-plan"/);
  assert.match(page,/Live API моментално не се вчитува/);
  assert.match(page,/id="retry"/);
});

test("Case-Law Radar inline operational JavaScript parses cleanly",()=>{
  const match=page.match(/<script>([\s\S]*?)<\/script>/i);
  assert.ok(match?.[1],"Radar inline script missing");
  assert.doesNotThrow(()=>new Function(match[1]));
});

test("curation API exposes bounded discovery records for the operational Radar",()=>{
  assert.match(worker,/discoveryRecords:supplied\.map\(row=>\(\{/);
  assert.match(worker,/status:"discovery_only"/);
  assert.match(worker,/officialBindingVerified:false/);
  assert.match(worker,/humanReviewStatus:"pending"/);
});

test("Case-Law Radar operational workflow selects records and hands a bounded package to internal AI Advokat",()=>{
  assert.match(page,/CASE_LAW_RADAR_WORKFLOW_R1/);
  assert.match(page,/id="discoveryRows"/);
  assert.match(page,/id="discoverySearch"/);
  assert.match(page,/id="startPackage"/);
  assert.match(page,/id="copyPackage"/);
  assert.match(page,/Максимум 10 по пакет/);
  assert.match(page,/DISCOVERY ONLY/);
  assert.match(page,/aiAdvokatRadarHandoffV1/);
  assert.match(page,/AI_ADVOCAT_RADAR_HANDOFF_V1/);
  assert.match(page,/autoSend:true/);
  assert.match(page,/location\.href="\/#ai-advokat-chat"/);
  assert.match(page,/ИЗБРАН DISCOVERY-ONLY ПАКЕТ/);
  assert.match(page,/official item binding/);
});

test("Case-Law Radar R2 keeps the workbench functional offline and uses a narrowly governed privacy bypass",()=>{
  assert.match(page,/function activateStaticDiscoveryFallback\(\)/);
  assert.match(page,/Offline mode · static records/);
  assert.match(page,/source:"case-law-radar"/);
  assert.match(page,/authorityBoundary:"discovery_only"/);
  assert.match(internal,/localConfidentialCasePrompt\(q\) && !governedRadarHandoff/);
  assert.match(internal,/payload\.source!=="case-law-radar"/);
  assert.match(internal,/payload\.authorityBoundary!=="discovery_only"/);
  assert.match(internal,/selectedIds\.length>10/);
  assert.match(internal,/send\(prompt,\{governedRadarHandoff:true\}\)/);
});

test("Case-Law Radar Human Gate checklist is interactive but cannot promote database authority",()=>{
  for(const gate of ["official","identity","holding","finality","applicability","outcome"]){
    assert.match(page,new RegExp('data-gate="'+gate+'"'));
  }
  assert.match(page,/database promotion сè уште НЕ е извршен/);
  assert.match(page,/Ниту едно штиклирање не менува database status/);
});

test("Radar static fallback exactly mirrors the governed 36-record discovery source",()=>{
  assert.match(page,/STATIC_DISCOVERY_VERSION="AI_ADVOCAT_APPEAL_SKOPJE_36_V1"/);
  const match=page.match(/STATIC_DISCOVERY_RECORDS=Object\.freeze\((\[[^\n]+\])\);/);
  assert.ok(match?.[1],"static discovery fallback missing");
  const fallback=JSON.parse(match[1]);
  assert.equal(fallback.length,36);
  assert.deepEqual(
    fallback.map(row=>row.caseNumber),
    APPEAL_SKOPJE_36_RECORDS.map(row=>row.n)
  );
  assert.ok(fallback.every(row=>row.status==="discovery_only" && row.officialBindingVerified===false));
  assert.match(page,/apiRecords\.length\?apiRecords:STATIC_DISCOVERY_RECORDS/);
  assert.match(page,/Живи метрики \+ static records/);
});

test("runtime cache contracts are bumped for the full integration release",()=>{
  assert.match(indexHtml,/20261109-root-r15-voice-r4-runtime/);
  assert.match(botHtml,/20261107-hybrid-r2-lawyer-view/);
});
