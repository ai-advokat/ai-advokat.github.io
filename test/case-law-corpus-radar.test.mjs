import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { summarizeCaseLawCorpus, corpusRadarPrompt } from "../src/case-law-corpus-radar.js";

const worker=fs.readFileSync("src/index.js","utf8");
const page=fs.readFileSync("case-law-curation.html","utf8");
const internal=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const external=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");
const botHtml=fs.readFileSync("bot/index.html","utf8");
const indexHtml=fs.readFileSync("index.html","utf8");

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

test("runtime cache contracts are bumped for the full integration release",()=>{
  assert.match(indexHtml,/20261105-root-r19-case-law-radar-v1/);
  assert.match(botHtml,/20261105-vnext-r13-case-law-radar/);
});
