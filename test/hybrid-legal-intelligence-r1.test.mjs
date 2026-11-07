import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  HYBRID_LEGAL_INTELLIGENCE_VERSION,
  articleTimeMachine,
  buildDelegatedLegislationGraph,
  buildArticleCaseLawGraph,
  buildLegalEffectiveDateCalendar,
  visualConsolidationDiff,
  hybridLegalIntelligenceSummary
} from "../src/hybrid-legal-intelligence.js";

test("HLI1 exposes the five governed capabilities under one version",()=>{
  assert.equal(HYBRID_LEGAL_INTELLIGENCE_VERSION,"AI_ADVOCAT_HYBRID_LEGAL_INTELLIGENCE_R1");
  const s=hybridLegalIntelligenceSummary({
    articleRows:[],
    delegatedLegislation:[],
    caseLawRecords:[],
    calendarRecords:[],
    beforeArticles:[],
    afterArticles:[],
    query:{}
  });
  assert.equal(s.version,HYBRID_LEGAL_INTELLIGENCE_VERSION);
  assert.equal(s.authorityBoundary.primaryLawMustComeFromOfficialSource,true);
  assert.equal(s.authorityBoundary.secondarySignalsAreDiscoveryOnly,true);
  assert.equal(s.authorityBoundary.currentLawPromotionRequiresHumanGate,true);
});

test("HLI2 Article Time Machine resolves exactly one applicable historical article version",()=>{
  const rows=[
    {
      instrument_key:"mk:test",article_number_normalized:"12",article_text:"стар текст",
      instrument_version_id:1,version_label:"v1",version_valid_from:"2020-01-01",version_valid_to:"2022-01-01",
      source_url:"https://official.example/v1",source_sha256:"a".repeat(64),human_review_status:"reviewed"
    },
    {
      instrument_key:"mk:test",article_number_normalized:"12",article_text:"нов текст",
      instrument_version_id:2,version_label:"v2",version_valid_from:"2022-01-01",version_valid_to:null,
      source_url:"https://official.example/v2",source_sha256:"b".repeat(64),human_review_status:"approved"
    }
  ];
  const r=articleTimeMachine(rows,{instrumentKey:"mk:test",articleNumber:"Член 12",referenceDate:"2021-06-01"});
  assert.equal(r.ok,true);
  assert.equal(r.articleText,"стар текст");
  assert.equal(r.version.label,"v1");
  assert.equal(r.provenance.sourceUrl,"https://official.example/v1");
  assert.equal(r.humanGateRequired,true);
});

test("HLI3 Article Time Machine fails closed on ambiguity",()=>{
  const rows=[
    {instrument_key:"mk:test",article_number_normalized:"5",article_text:"A",version_valid_from:"2020-01-01"},
    {instrument_key:"mk:test",article_number_normalized:"5",article_text:"B",version_valid_from:"2020-01-01"}
  ];
  const r=articleTimeMachine(rows,{instrumentKey:"mk:test",articleNumber:"5",referenceDate:"2021-01-01"});
  assert.equal(r.ok,false);
  assert.equal(r.error,"article_version_ambiguous");
});

test("HLI4 Law-Bylaw graph admits only official, reviewed and article-bound links",()=>{
  const r=buildDelegatedLegislationGraph([
    {
      id:1,parent_instrument_key:"mk:z",basis_article:"42",bylaw_key:"mk:rule-1",
      bylaw_title:"Правилник",act_type:"правилник",source_url:"https://slvesnik.com.mk/x",
      authority_status:"primary_official",human_review_status:"reviewed"
    },
    {
      id:2,parent_instrument_key:"mk:z",basis_article:"43",bylaw_key:"mk:rule-2",
      bylaw_title:"Secondary copy",source_url:"https://secondary.example/x",
      authority_status:"secondary_reference",human_review_status:"reviewed"
    }
  ],{instrumentKey:"mk:z"});
  assert.equal(r.edges.length,1);
  assert.equal(r.edges[0].basisArticle,"42");
  assert.equal(r.rejected.length,1);
  assert.equal(r.safeguards.secondaryDiscoveryCannotCreateAuthority,true);
});

test("HLI5 Article-Case-Law graph requires official binding and dual review",()=>{
  const rows=[
    {
      id:10,instrument_key:"mk:zkp",domestic_articles:"167, 168",
      case_title:"A",court:"Апелационен суд",case_number:"КОКЖ-1/26",decision_date:"2026-01-01",
      source_status:"official",official_binding_verified:1,human_review_status:"reviewed",
      authority_review_status:"approved",source_url:"https://court.example/10",reviewed_holdings:"holding"
    },
    {
      id:11,instrument_key:"mk:zkp",domestic_articles:"167",
      case_title:"B",court:"Суд",case_number:"X",decision_date:"2025-01-01",
      source_status:"verified",official_binding_verified:0,human_review_status:"reviewed",
      authority_review_status:"approved",source_url:"https://secondary.example/11"
    }
  ];
  const r=buildArticleCaseLawGraph(rows,{instrumentKey:"mk:zkp",articleNumber:"167"});
  assert.equal(r.links.length,1);
  assert.equal(r.links[0].caseLawId,10);
  assert.equal(r.links[0].articleNumber,"167");
  assert.equal(r.rejected.length,1);
  assert.equal(r.safeguards.dualHumanReviewRequired,true);
});

test("HLI6 Legal calendar separates publication, entry into force, application and legal effect",()=>{
  const r=buildLegalEffectiveDateCalendar([
    {
      id:"a",instrument_key:"mk:z",instrument_title:"Закон X",source_url:"https://slvesnik.com.mk/x",
      publication_date:"2026-02-01",entry_into_force_date:"2026-02-09",application_from:"2026-03-01",
      human_review_status:"reviewed"
    },
    {
      id:"cc",instrument_key:"mk:z",instrument_title:"Уставносудски ефект",source_url:"https://ustavensud.mk/x",
      legal_effect_from:"2026-04-01",human_review_status:"reviewed"
    }
  ],{from:"2026-02-01",to:"2026-04-30",includePublication:true});
  assert.equal(r.ok,true);
  assert.equal(r.events.length,4);
  assert.equal(r.counts.entryIntoForce,1);
  assert.equal(r.counts.applicationStart,1);
  assert.equal(r.counts.legalEffect,1);
});

test("HLI7 Visual Consolidation Diff classifies added, removed, modified and unchanged articles",()=>{
  const before=[
    {article_number_normalized:"1",article_text:"A"},
    {article_number_normalized:"2",article_text:"B"},
    {article_number_normalized:"3",article_text:"C"}
  ];
  const after=[
    {article_number_normalized:"1",article_text:"A"},
    {article_number_normalized:"2",article_text:"B2"},
    {article_number_normalized:"4",article_text:"D"}
  ];
  const r=visualConsolidationDiff(before,after,{instrumentKey:"mk:test",beforeLabel:"v1",afterLabel:"v2"});
  assert.equal(r.counts.unchanged,1);
  assert.equal(r.counts.modified,1);
  assert.equal(r.counts.removed,1);
  assert.equal(r.counts.added,1);
  assert.equal(r.releaseBoundary,"WORKING_DIFF_NOT_CURRENT_LAW_AUTHORITY");
  assert.equal(r.humanGateRequired,true);
});

test("HLI8 Worker exposes five read-only hybrid API routes",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  for(const route of [
    "/api/hybrid/capabilities",
    "/api/hybrid/article-at-date",
    "/api/hybrid/bylaws",
    "/api/hybrid/case-law",
    "/api/hybrid/calendar",
    "/api/hybrid/diff"
  ]) assert.equal(worker.includes(route),true,route);
  assert.match(worker,/secondarySignalsDiscoveryOnly:true/);
  assert.match(worker,/autonomousCurrentLawPromotion:false/);
});

test("HLI9 migration provides persistent graph without autonomous current-law promotion",()=>{
  const sql=fs.readFileSync("migrations/0052_hybrid_legal_intelligence_r1.sql","utf8");
  assert.match(sql,/legal_delegated_legislation_links/);
  assert.match(sql,/legal_article_case_law_links/);
  assert.match(sql,/legal_effective_date_events/);
  assert.match(sql,/legal_consolidation_diff_runs/);
  assert.match(sql,/legal_consolidation_diff_articles/);
  assert.doesNotMatch(sql,/UPDATE\s+instrument_versions\s+SET\s+is_current\s*=\s*1/i);
  assert.match(sql,/human_review_status/);
});

test("HLI10 Consolidator R2 remains authority-first while Hybrid R1 is layered above it",()=>{
  const page=fs.readFileSync("consolidator/index.html","utf8");
  const cfg=JSON.parse(fs.readFileSync("data/mk-current-law-watch-config.json","utf8"));
  assert.match(page,/Current-Law Watch R2/);
  assert.equal(cfg.governance.secondary_sources_are_corroboration_only,true);
  assert.equal(cfg.governance.secondary_signal_requires_official_binding,true);
  assert.equal(cfg.governance.automatic_current_law_promotion,false);
});
