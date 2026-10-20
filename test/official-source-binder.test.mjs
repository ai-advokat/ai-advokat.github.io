import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  bindOfficialSource,
  combineGovernedSourceRegistries
} from "../src/official-source-binder.js";

const openRegistry=JSON.parse(fs.readFileSync("data/open-legal-sources-registry-2026.json","utf8"));
const caseRegistry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const internationalRegistry=JSON.parse(fs.readFileSync("data/international-legal-source-registry-2026.json","utf8"));
const sources=combineGovernedSourceRegistries(openRegistry,caseRegistry,internationalRegistry);
const hash="a".repeat(64);

test("official Gazette law origin is recognized but bulk reuse remains fail-closed",()=>{
  const b=bindOfficialSource({
    sourceUrl:"https://slvesnik.com.mk/test/document",
    sourceSha256:hash,
    route:"legal_instrument",
    registrySources:sources
  });
  assert.equal(b.registryMatched,true);
  assert.equal(b.sourceId,"mk-official-gazette");
  assert.equal(b.officialOriginCandidate,true);
  assert.equal(b.routeCompatible,true);
  assert.equal(b.metadataStagingEligible,true);
  assert.equal(b.bulkIngestEligible,false);
  assert.equal(b.rightsReviewRequired,true);
  assert.equal(b.officialBindingVerified,false);
  assert.equal(b.remoteContentHashVerified,false);
  assert.equal(b.humanGateRequired,true);
});

test("LDBIS is an official legal-instrument source candidate without blanket bulk permission",()=>{
  const b=bindOfficialSource({
    sourceUrl:"https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=4515",
    sourceSha256:hash,
    route:"legal_instrument",
    registrySources:sources
  });
  assert.equal(b.sourceId,"mk-ldbis");
  assert.equal(b.metadataStagingEligible,true);
  assert.equal(b.bulkIngestEligible,false);
  assert.equal(b.reuseStatus,"terms_review_required");
});

test("official supporting/history sources do not become primary MK-law staging",()=>{
  for(const url of [
    "https://ener.gov.mk/Default.aspx?item=test",
    "https://www.sobranie.mk/test"
  ]){
    const b=bindOfficialSource({sourceUrl:url,sourceSha256:hash,route:"legal_instrument",registrySources:sources});
    assert.equal(b.registryMatched,true);
    assert.equal(b.officialOriginCandidate,true);
    assert.equal(b.routeCompatible,true);
    assert.equal(b.primaryForRoute,false);
    assert.equal(b.metadataStagingEligible,false);
    assert.ok(b.reasons.includes("source_is_official_but_not_primary_for_this_ingest_lane"));
  }
});

test("judicial portal and Supreme Court are recognized for case-law staging only",()=>{
  for(const url of [
    "https://www.sud.mk/test/decision",
    "https://www.vrhoven.sud.mk/test/decision"
  ]){
    const b=bindOfficialSource({sourceUrl:url,sourceSha256:hash,route:"case_law",registrySources:sources});
    assert.equal(b.registryMatched,true);
    assert.equal(b.officialOriginCandidate,true);
    assert.equal(b.routeCompatible,true);
    assert.equal(b.metadataStagingEligible,true);
    assert.equal(b.officialBindingVerified,false);
  }
});

test("HUDOC is recognized as official case-law origin while rights remain separately governed",()=>{
  const b=bindOfficialSource({
    sourceUrl:"https://hudoc.echr.coe.int/eng?i=001-12345",
    sourceSha256:hash,
    route:"case_law",
    registrySources:sources
  });
  assert.equal(b.sourceId,"echr-hudoc");
  assert.equal(b.officialOriginCandidate,true);
  assert.equal(b.metadataStagingEligible,true);
  assert.equal(b.rightsReviewRequired,true);
  assert.equal(b.officialBindingVerified,false);
});

test("Paragraf never becomes official merely because its URL and hash are present",()=>{
  const b=bindOfficialSource({
    sourceUrl:"https://paragraf.mk/export/case-1",
    sourceSha256:hash,
    route:"case_law",
    registrySources:sources
  });
  assert.equal(b.registryMatched,true);
  assert.equal(b.officialOriginCandidate,false);
  assert.equal(b.metadataStagingEligible,false);
  assert.equal(b.officialBindingVerified,false);
  assert.ok(b.reasons.some(x=>/secondary|official/.test(x)));
});

test("fake lookalike and non-HTTPS origins fail closed",()=>{
  const fake=bindOfficialSource({
    sourceUrl:"https://evil-sud.mk/decision",
    sourceSha256:hash,
    route:"case_law",
    registrySources:sources
  });
  assert.equal(fake.registryMatched,false);
  assert.equal(fake.metadataStagingEligible,false);
  assert.throws(
    ()=>bindOfficialSource({
      sourceUrl:"http://www.sud.mk/decision",
      sourceSha256:hash,
      route:"case_law",
      registrySources:sources
    }),
    /https_required/
  );
});

test("invalid SHA-256 and wrong document/source lane are rejected",()=>{
  assert.throws(
    ()=>bindOfficialSource({
      sourceUrl:"https://www.sud.mk/decision",
      sourceSha256:"bad",
      route:"case_law",
      registrySources:sources
    }),
    /sha256_invalid/
  );
  const wrongLane=bindOfficialSource({
    sourceUrl:"https://www.sud.mk/decision",
    sourceSha256:hash,
    route:"legal_instrument",
    registrySources:sources
  });
  assert.equal(wrongLane.routeCompatible,false);
  assert.equal(wrongLane.metadataStagingEligible,false);
});


test("international official registries bind as governed reference sources without production promotion",()=>{
  const hash="d".repeat(64);
  for(const url of [
    "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB%2F23%2F31",
    "https://uhri.ohchr.org/api/uhri/export-results/export-full-en.json",
    "https://tbinternet.ohchr.org/_layouts/15/TreatyBodyExternal/countries.aspx?CountryCode=MKD"
  ]){
    const b=bindOfficialSource({
      sourceUrl:url,
      sourceSha256:hash,
      route:"international_reference",
      registrySources:sources
    });
    assert.equal(b.registryMatched,true,url);
    assert.equal(b.officialOriginCandidate,true,url);
    assert.equal(b.routeCompatible,true,url);
    assert.equal(b.officialBindingVerified,false,url);
    assert.equal(b.humanGateRequired,true,url);
  }
});

test("Bureau mirror stays non-primary until HUDOC binding even in international-reference lane",()=>{
  const b=bindOfficialSource({
    sourceUrl:"https://biroescp.gov.mk/пресуди-и-одлуки-на-рм/example.pdf",
    sourceSha256:"e".repeat(64),
    route:"international_reference",
    registrySources:sources
  });
  assert.equal(b.sourceId,"mk-echr-representation-bureau");
  assert.equal(b.primaryBindingRequired,true);
  assert.equal(b.primaryForRoute,false);
  assert.equal(b.metadataStagingEligible,false);
  assert.ok(b.reasons.includes("primary_origin_binding_still_required"));
});
