import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_PROVENANCE_GATE_VERSION,
  CANONICAL_METADATA_STANDARD_VERSION,
  assessCanonicalProvenance,
  enforceCanonicalContextProvenance
} from "../src/canonical-provenance-gate.js";

const article=overrides=>({
  kind:"legal_article",
  sourceIdentity:"Закон за работните односи",
  authorityClass:"primary_official",
  locator:"Член 13",
  releaseRole:"legal_authority",
  legalAuthority:true,
  humanReviewStatus:"approved",
  versionHumanReviewStatus:"approved",
  instrumentKey:"mk:zro",
  articleNumber:"13",
  versionLabel:"current-applicable",
  sourceIssueNumber:"62/2005",
  sourceIssueDate:"2005-07-28",
  sourceUrl:"https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=123",
  sourceSha256:"a".repeat(64),
  currentLawClaim:true,
  ...overrides
});

test("canonical provenance gate version is stable",()=>{
  assert.equal(CANONICAL_PROVENANCE_GATE_VERSION,"AI_ADVOCAT_CANONICAL_PROVENANCE_GATE_V2");
  assert.equal(CANONICAL_METADATA_STANDARD_VERSION,"AI_ADVOCAT_CANONICAL_LEGAL_METADATA_V2");
});

test("fully identified approved legal article is releasable",()=>{
  const a=assessCanonicalProvenance(article());
  assert.equal(a.ok,true,JSON.stringify(a));
});

test("legal article without Gazette/date/fingerprint provenance is blocked",()=>{
  const a=assessCanonicalProvenance(article({sourceIssueNumber:"",sourceIssueDate:"",sourceSha256:""}));
  assert.equal(a.ok,false);
  assert.ok(a.missing.includes("sourceIssueNumber"));
  assert.ok(a.missing.includes("sourceIssueDate"));
  assert.ok(a.missing.includes("sourceSha256"));
});

test("current-law claim requires approved Human Gate and approved version gate",()=>{
  const a=assessCanonicalProvenance(article({humanReviewStatus:"reviewed",versionHumanReviewStatus:"reviewed"}));
  assert.equal(a.ok,false);
  assert.ok(a.problems.includes("current_law_requires_approved_human_gate"));
  assert.ok(a.problems.includes("current_law_requires_approved_version_gate"));
});

test("reviewed official case law requires both record and authority review metadata",()=>{
  const base={
    kind:"case_law",
    sourceIdentity:"Врховен суд",
    authorityClass:"court_official",
    locator:"Рев.бр.1/2026 · 2026-04-01",
    releaseRole:"legal_authority",
    legalAuthority:true,
    humanReviewStatus:"reviewed",
    authorityReviewStatus:"reviewed",
    caseIdentity:"Рев.бр.1/2026",
    court:"Врховен суд",
    jurisdiction:"MK",
    decisionDate:"2026-04-01",
    sourceUrl:"https://www.vrhoven.sud.mk/example",
    currentLawClaim:false
  };
  assert.equal(assessCanonicalProvenance(base).ok,true);
  const bad=assessCanonicalProvenance({...base,authorityReviewStatus:"pending"});
  assert.equal(bad.ok,false);
  assert.ok(bad.problems.includes("case_law_authority_requires_reviewed_human_gate"));
});

test("guide may enter only as fingerprinted secondary non-authority",()=>{
  const guide={
    kind:"guide",
    sourceIdentity:"AI Advokat governed guide registry",
    authorityClass:"secondary_reference",
    locator:"/guides/record.html?g=38",
    releaseRole:"secondary_only",
    legalAuthority:false,
    humanReviewStatus:"pending",
    recordId:"38",
    title:"Практичен водич",
    verificationState:"legal_review_pending",
    activationState:"review_required",
    fingerprint:"b".repeat(64),
    currentLawClaim:false
  };
  assert.equal(assessCanonicalProvenance(guide).ok,true);
  const bad=assessCanonicalProvenance({...guide,legalAuthority:true});
  assert.equal(bad.ok,false);
  assert.ok(bad.problems.includes("guide_must_remain_secondary_non_authority"));
});

test("ECHR domestic index remains discovery-only and never becomes legal authority",()=>{
  const rec={
    kind:"echr_discovery",
    sourceIdentity:"Биро за застапување пред ЕСЧП",
    authorityClass:"official_supporting",
    locator:"2026 · пресуда",
    releaseRole:"discovery_only",
    legalAuthority:false,
    humanReviewStatus:"not_legal_authority",
    recordIdentity:"Test v. North Macedonia",
    listingPeriod:"2026",
    capturedOn:"2026-10-11",
    sourceUrl:"https://biroescp.gov.mk/example",
    currentLawClaim:false
  };
  assert.equal(assessCanonicalProvenance(rec).ok,true);
  assert.equal(assessCanonicalProvenance({...rec,legalAuthority:true,releaseRole:"legal_authority"}).ok,false);
});

test("runtime enforcement physically removes provenance-defective source context",()=>{
  const good={source:"good",locator:"Член 13",version:"v",provenance:article(),text:"text"};
  const bad={source:"bad",locator:"Член 14",version:"v",provenance:article({articleNumber:"14",sourceSha256:""}),text:"text"};
  const gate=enforceCanonicalContextProvenance([good,bad]);
  assert.equal(gate.context.length,1);
  assert.equal(gate.context[0].source,"good");
  assert.equal(gate.blocked.length,1);
  assert.equal(gate.state,"partial_release");
});


test("Official Gazette issue requires exact issue identity and fingerprint",()=>{
  const issue={
    kind:"gazette_issue",
    sourceIdentity:"Службен весник на Република Северна Македонија",
    authorityClass:"primary_official",
    locator:"2026 · 151",
    releaseRole:"source_registry",
    legalAuthority:false,
    humanReviewStatus:"reviewed",
    publicationName:"Службен весник на Република Северна Македонија",
    issueNumber:"151/2026",
    issueDate:"2026-07-08",
    sourceUrl:"https://slvesnik.com.mk/example.pdf",
    sourceSha256:"c".repeat(64),
    currentLawClaim:false
  };
  assert.equal(assessCanonicalProvenance(issue).ok,true);
  const bad=assessCanonicalProvenance({...issue,sourceSha256:""});
  assert.equal(bad.ok,false);
  assert.ok(bad.missing.includes("sourceSha256"));
});

test("rulebook/bylaw cannot become current-law authority without act metadata and effective/application date",()=>{
  const rulebook={
    kind:"rulebook",
    sourceIdentity:"Службен весник / надлежен орган",
    authorityClass:"primary_official",
    locator:"Правилник · Сл. весник 10/2026",
    releaseRole:"legal_authority",
    legalAuthority:true,
    humanReviewStatus:"approved",
    title:"Правилник за тест",
    actType:"rulebook",
    issuer:"Надлежен орган",
    issueNumber:"10/2026",
    issueDate:"2026-01-20",
    sourceUrl:"https://slvesnik.com.mk/rulebook.pdf",
    sourceSha256:"d".repeat(64),
    currentLawClaim:true,
    effectiveDate:"2026-01-28"
  };
  assert.equal(assessCanonicalProvenance(rulebook).ok,true);
  const missingDate=assessCanonicalProvenance({...rulebook,effectiveDate:""});
  assert.equal(missingDate.ok,false);
  assert.ok(missingDate.problems.includes("current_law_act_requires_effective_or_application_date"));
});

test("authorial publication is metadata-rich secondary material, never legal authority",()=>{
  const publication={
    kind:"authorial_publication",
    sourceIdentity:"Zenodo",
    authorityClass:"open_repository",
    locator:"10.5281/zenodo.23023442",
    releaseRole:"secondary_only",
    legalAuthority:false,
    humanReviewStatus:"approved",
    title:"Вештачката интелигенција во адвокатурата и судството",
    author:"Зоран Стојанкиќ",
    publicationState:"published",
    publicationDate:"2026-09-30",
    sourceUrl:"https://doi.org/10.5281/zenodo.23023442",
    persistentIdentifier:"10.5281/zenodo.23023442",
    currentLawClaim:false
  };
  assert.equal(assessCanonicalProvenance(publication).ok,true);
  const bad=assessCanonicalProvenance({...publication,legalAuthority:true,releaseRole:"legal_authority"});
  assert.equal(bad.ok,false);
  assert.ok(bad.problems.includes("authorial_publication_must_remain_secondary_non_authority"));
});


test("repository canonical metadata manifest matches runtime V2 contract",()=>{
  const manifest=JSON.parse(fs.readFileSync("data/canonical-legal-metadata-standard-v2.json","utf8"));
  assert.equal(manifest.standard_id,CANONICAL_METADATA_STANDARD_VERSION);
  for(const kind of ["legal_instrument","gazette_issue","legal_act","bylaw","rulebook","regulation","legal_article","case_law","guide","authorial_publication"]){
    assert.ok(manifest.applies_to.includes(kind),kind);
    assert.ok(Array.isArray(manifest.canonical_rules[kind]),kind);
    assert.ok(manifest.canonical_rules[kind].length>0,kind);
  }
});
