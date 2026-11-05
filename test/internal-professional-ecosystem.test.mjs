import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  PUBLIC_EVIDENCE_LAYER_VERSION,
  PUBLIC_EVIDENCE_STATUSES,
  publicEvidenceSourceDirectory,
  publicEvidenceSourcesForTask,
  publicEvidenceWorkflow,
  classifyPublicEvidenceUrl,
  buildPublicEvidenceCard
} from "../src/public-evidence-registry.js";
import {
  INTERNAL_PROFESSIONAL_ECOSYSTEM_VERSION,
  internalProfessionalEcosystemCatalog,
  calculateLegalOperation
} from "../src/internal-professional-ecosystem.js";

const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const chat=fs.readFileSync(new URL("../assets/ai-advokat-chat.js",import.meta.url),"utf8");

test("public evidence layer registers independent upstream sources with explicit claim boundaries",()=>{
  const sources=publicEvidenceSourceDirectory();
  assert.equal(PUBLIC_EVIDENCE_LAYER_VERSION,"AI_ADVOCAT_PUBLIC_EVIDENCE_V1");
  assert.ok(sources.length>=14);
  for(const id of ["mk-crrsm","mk-dksk","mk-esjn","mk-dzr","mk-open-finance","mk-ener","mk-katastar","mk-marnet-whois","mk-data-gov"]){
    const source=sources.find(x=>x.id===id);
    assert.ok(source,id+" missing");
    assert.equal(source.url.startsWith("https://"),true);
    assert.ok(source.claimBoundary.length>20);
  }
  assert.equal(sources.some(x=>/osint.mk/i.test(x.url)),false,"OSINT catalog must not become an authority source");
  assert.equal(sources.some(x=>/rafajlovski/i.test(x.url)),false,"competitor content must not become a governed source");
});

test("procurement evidence workflow separates lead, payment, audit and Human Gate",()=>{
  const wf=publicEvidenceWorkflow("procurement");
  const ids=wf.sources.map(x=>x.id);
  assert.ok(ids.includes("mk-esjn"));
  assert.ok(ids.includes("mk-open-finance"));
  assert.ok(ids.includes("mk-dzr"));
  assert.ok(ids.includes("mk-crrsm"));
  assert.ok(wf.steps.includes("PAYMENT_TRACE"));
  assert.equal(wf.steps.at(-1),"HUMAN_GATE");
  assert.equal(wf.humanGateRequired,true);
});

test("public evidence URL classification is source-bound and unknown URLs stay discovery-only",()=>{
  assert.equal(classifyPublicEvidenceUrl("https://open.finance.gov.mk/mk/home")?.id,"mk-open-finance");
  assert.equal(classifyPublicEvidenceUrl("https://whois.marnet.mk/?domain=test.mk")?.id,"mk-marnet-whois");
  assert.equal(classifyPublicEvidenceUrl("https://example.invalid/x"),null);

  const card=buildPublicEvidenceCard({
    title:"Непозната трага",
    url:"https://example.invalid/x",
    task:"entity",
    status:"HUMAN_GATE_VERIFIED",
    humanReviewed:false
  });
  assert.equal(card.status,"SOURCE_BACKED");
  assert.equal(card.sourceId,null);
  assert.equal(card.legalConclusion,false);
  assert.equal(card.humanGateRequired,true);
  assert.match(card.claimBoundary,/Нерегистриран извор/);
});

test("public evidence statuses include explicit non-conclusion states",()=>{
  for(const state of ["LEAD","SOURCE_BACKED","CORROBORATED","DISPUTED","STALE","UNVERIFIED","HUMAN_GATE_VERIFIED"]){
    assert.ok(PUBLIC_EVIDENCE_STATUSES.includes(state));
  }
});

test("professional ecosystem is internal-only and exposes all five functional pillars",()=>{
  const catalog=internalProfessionalEcosystemCatalog();
  assert.equal(catalog.version,INTERNAL_PROFESSIONAL_ECOSYSTEM_VERSION);
  assert.equal(catalog.boundaries.internalAiAdvokatOnly,true);
  assert.equal(catalog.boundaries.externalProfessionalBotChanged,false);
  assert.equal(catalog.boundaries.humanGateRequired,true);
  assert.ok(catalog.livingLaw.length>=4);
  assert.ok(catalog.operationsRegistry.length>=4);
  assert.ok(catalog.calculators.length>=3);
  assert.ok(catalog.smartDocuments.length>=6);
  assert.ok(catalog.legalWatch.length>=6);
});

test("simple interest calculator performs arithmetic but never determines the legal rate",()=>{
  const out=calculateLegalOperation("simple_interest",{
    principal:100000,
    annualRatePct:10,
    fromDate:"2026-01-01",
    toDate:"2026-01-31",
    dayBasis:365,
    rateSource:"Official source checked by user",
    rateVerified:true
  });
  assert.equal(out.days,30);
  assert.equal(out.interest,821.92);
  assert.equal(out.total,100821.92);
  assert.equal(out.legalRateDetermined,false);
  assert.equal(out.evidenceState,"CALCULATED_FROM_USER_MARKED_VERIFIED_RATE");
  assert.equal(out.humanGateRequired,true);
});

test("interest calculator stays informational when source/rate verification is absent",()=>{
  const out=calculateLegalOperation("simple_interest",{
    principal:150000,
    annualRatePct:8,
    fromDate:"2026-01-01",
    toDate:"2026-02-01"
  });
  assert.equal(out.evidenceState,"INFORMATIONAL_ARITHMETIC_ONLY");
  assert.equal(out.rateSource,null);
  assert.match(out.warning,/не утврдува која законска/);
});

test("calendar calculator does not claim procedural deadline validity",()=>{
  const out=calculateLegalOperation("calendar_deadline",{baseDate:"2026-11-05",days:10});
  assert.equal(out.calendarDate,"2026-11-15");
  assert.equal(out.legalDeadlineDetermined,false);
  assert.match(out.warning,/неработни денови/);
});

test("internal workbench wires both new packages without changing external /api/bot route",()=>{
  assert.equal(html.includes('data-ai-workbench="public-evidence"'),true);
  assert.equal(html.includes('data-ai-workbench="professional-ecosystem"'),true);
  assert.equal(chat.includes("function ensurePublicEvidenceDialog"),true);
  assert.equal(chat.includes("function ensureProfessionalEcosystemDialog"),true);
  assert.equal(chat.includes("/api/public-evidence/card"),true);
  assert.equal(chat.includes("/api/internal-toolkit/calculate"),true);
  assert.equal(chat.includes('crypto.subtle.digest("SHA-256"'),true);
  assert.equal(worker.includes('url.pathname === "/api/internal-toolkit"'),true);
  assert.equal(worker.includes('url.pathname === "/api/public-evidence/card"'),true);
  assert.equal(worker.includes('url.pathname === "/api/bot") return handleGPTChat(request, env, {openAIOnly:true})'),true);
});
