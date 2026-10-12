import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  OPEN_LEGAL_SOURCE_POLICY_VERSION,
  OPEN_LEGAL_SOURCE_REGISTRY_ID,
  OPEN_LEGAL_SOURCES,
  classifyOpenLegalSource,
  isRegisteredOfficialLegalSource,
  sourceAllowedForAgent,
  sourceResearchRole,
  rightsGateForSource,
  annotateExternalSources,
  policySourcesForAgent,
  sourcePolicyPrompt,
  publicOpenLegalSourceDirectory,
  openLegalSourcePolicySummary
} from "../src/open-legal-sources-policy.js";

const registry=JSON.parse(fs.readFileSync("data/open-legal-sources-registry-2026.json","utf8"));

test("runtime source policy stays aligned with the governed registry",()=>{
  assert.equal(OPEN_LEGAL_SOURCE_POLICY_VERSION,"1.0.0");
  assert.equal(OPEN_LEGAL_SOURCE_REGISTRY_ID,registry.registry_id);
  assert.equal(OPEN_LEGAL_SOURCES.length,registry.sources.length);
  const runtimeById=new Map(OPEN_LEGAL_SOURCES.map(x=>[x.id,x]));
  for(const source of registry.sources){
    const rt=runtimeById.get(source.id);
    assert.ok(rt,source.id);
    assert.equal(rt.canonicalUrl,source.canonical_url);
    assert.equal(rt.jurisdiction,source.jurisdiction);
    assert.equal(rt.authorityStatus,source.authority_status);
    assert.equal(rt.reuseStatus,source.reuse_status);
    assert.equal(rt.ingestStatus,source.ingest_status);
    assert.equal(rt.automatedBulkIngest,source.automated_bulk_ingest===true);
  }
});

test("URL classification recognises registered hosts and subdomains",()=>{
  assert.equal(classifyOpenLegalSource("https://www.sud.mk/example")?.id,"mk-judicial-portal");
  assert.equal(classifyOpenLegalSource("https://eur-lex.europa.eu/legal-content/EN/TXT/")?.id,"eu-eurlex");
  assert.equal(classifyOpenLegalSource("https://fp.pravno-informacioni-sistem.rs/example")?.id,"rs-pravno-informacioni-sistem");
  assert.equal(classifyOpenLegalSource("https://example.com/not-registered"),null);
});

test("official classification is separate from open scholarly metadata",()=>{
  assert.equal(isRegisteredOfficialLegalSource("https://ldbis.pravda.gov.mk/"),true);
  assert.equal(isRegisteredOfficialLegalSource("https://hudoc.echr.coe.int/"),true);
  assert.equal(isRegisteredOfficialLegalSource("https://www.crossref.org/"),false);
  assert.equal(isRegisteredOfficialLegalSource("https://zenodo.org/"),false);
});

test("specialist source boundaries keep jurisdictions separate",()=>{
  const mk=classifyOpenLegalSource("https://ldbis.pravda.gov.mk/");
  const rs=classifyOpenLegalSource("https://pravno-informacioni-sistem.rs/");
  const si=classifyOpenLegalSource("https://pisrs.si/");
  const eu=classifyOpenLegalSource("https://eur-lex.europa.eu/");
  assert.equal(sourceAllowedForAgent(mk,"macedonian_law"),true);
  assert.equal(sourceAllowedForAgent(rs,"macedonian_law"),false);
  assert.equal(sourceAllowedForAgent(rs,"regional_comparative"),true);
  assert.equal(sourceAllowedForAgent(si,"regional_comparative"),true);
  assert.equal(sourceAllowedForAgent(eu,"eu_law"),true);
  assert.equal(sourceAllowedForAgent(eu,"echr_law"),false);
});

test("rights gate separates citation, metadata, full text and corpus promotion",()=>{
  const eurlex=classifyOpenLegalSource("https://eur-lex.europa.eu/");
  const crossref=classifyOpenLegalSource("https://www.crossref.org/");
  const zenodo=classifyOpenLegalSource("https://zenodo.org/");
  const ldbis=classifyOpenLegalSource("https://ldbis.pravda.gov.mk/");

  assert.equal(rightsGateForSource(eurlex,{operation:"research_citation"}).allowed,true);
  assert.equal(rightsGateForSource(eurlex,{operation:"fulltext_ingest"}).allowed,true);
  assert.equal(rightsGateForSource(crossref,{operation:"metadata_ingest"}).allowed,true);
  assert.equal(rightsGateForSource(crossref,{operation:"fulltext_ingest"}).allowed,false);
  assert.equal(rightsGateForSource(zenodo,{operation:"fulltext_ingest"}).allowed,false);
  assert.equal(rightsGateForSource(zenodo,{operation:"fulltext_ingest",recordLicense:"CC-BY-4.0"}).allowed,true);
  assert.equal(rightsGateForSource(ldbis,{operation:"fulltext_ingest"}).allowed,false);
  assert.equal(rightsGateForSource(ldbis,{operation:"corpus_promotion"}).allowed,false);
});

test("external citations receive source-policy annotations",()=>{
  const out=annotateExternalSources([
    {url:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",title:"EU law"},
    {url:"https://example.com/commentary",title:"Commentary"}
  ],{agentId:"eu_law"});
  assert.equal(out.length,2);
  assert.equal(out[0].registered,true);
  assert.equal(out[0].openLegalSourceId,"eu-eurlex");
  assert.equal(out[0].agentBoundaryAllowed,true);
  assert.equal(out[1].registered,false);
  assert.equal(out[1].authorityStatus,"unregistered_external");
});

test("metadata and repository roles stay scoped",()=>{
  assert.equal(sourceResearchRole("https://api.crossref.org/works","chief_legal_orchestrator"),"REGISTERED_METADATA_ONLY");
  assert.equal(sourceResearchRole("https://zenodo.org/records/123","chief_legal_orchestrator"),"REGISTERED_RECORD_LEVEL_LICENSE");
  assert.equal(sourceResearchRole("https://pravno-informacioni-sistem.rs/","macedonian_law"),"REGISTERED_OUTSIDE_AGENT_BOUNDARY");
});

test("specialist prompts carry the Open Legal Sources doctrine",()=>{
  const mk=sourcePolicyPrompt("macedonian_law");
  assert.match(mk,/PUBLIC != REUSABLE/);
  assert.match(mk,/LDBIS/);
  const regional=sourcePolicyPrompt("regional_comparative");
  assert.match(regional,/PISRS|Правно-информациони систем/i);
});

test("public directory and summary expose bounded policy state",()=>{
  const directory=publicOpenLegalSourceDirectory();
  assert.equal(directory.length,15);
  assert.ok(directory.every(x=>x.id&&x.url&&x.reuseStatus&&x.ingestStatus));
  const summary=openLegalSourcePolicySummary();
  assert.equal(summary.sourceCount,15);
  assert.equal(summary.doctrine,"PUBLIC != REUSABLE");
});

test("HR BA ME stay pending instead of being invented as active sources",()=>{
  for(const jurisdiction of ["HR","BA","ME"]){
    assert.equal(OPEN_LEGAL_SOURCES.some(x=>x.jurisdiction===jurisdiction),false);
  }
  const regional=policySourcesForAgent("regional_comparative");
  assert.deepEqual([...new Set(regional.map(x=>x.jurisdiction))].sort(),["RS","SI"]);
});
