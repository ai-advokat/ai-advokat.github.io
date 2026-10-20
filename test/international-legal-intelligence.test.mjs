import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  canonicalStateIdentity,
  classifyIcsidCaseNumber,
  classifyIcsidPublishedDocument,
  icsidLegalEffect,
  classifyOhchrMechanism,
  classifyInternationalDocument
} from "../src/international-legal-classifier.js";
import {parseIcsidRecentHtml} from "../scripts/icsid-recent-event-intake.mjs";
import {extractNorthMacedoniaUhriRecords} from "../scripts/uhri-north-macedonia-intake.mjs";

const registry=JSON.parse(fs.readFileSync("data/international-legal-source-registry-2026.json","utf8"));
const fixtures=JSON.parse(fs.readFileSync("data/regression/international-legal-regression-fixtures-2026.json","utf8"));

test("international source registry keeps ECHR, ICSID and OHCHR roles distinct",()=>{
  const byId=new Map(registry.sources.map(x=>[x.id,x]));
  for(const id of [
    "echr-hudoc","mk-echr-representation-bureau","icsid-cases",
    "icsid-convention-rules-2022","icsid-additional-facility-rules-2022",
    "icsid-mediation-rules-2022","icsid-fact-finding-rules-2022",
    "ohchr-uhri","ohchr-treaty-body-database"
  ]) assert.ok(byId.has(id),id);
  assert.equal(byId.get("mk-echr-representation-bureau").originating_binding_source,"echr-hudoc");
  assert.equal(byId.get("icsid-additional-facility-rules-2022").article_54_enforcement,false);
  assert.equal(byId.get("icsid-mediation-rules-2022").default_confidentiality,true);
  assert.equal(byId.get("icsid-fact-finding-rules-2022").default_report_binding,false);
  assert.equal(byId.get("ohchr-uhri").update_cadence,"daily");
  assert.ok(registry.doctrine.includes("recommendation_is_not_judgment"));
});

test("North Macedonia historical labels normalize without destroying source label",()=>{
  for(const label of [
    "Republic of North Macedonia",
    "Macedonia, former Yugoslav Republic of",
    "the former Yugoslav Republic of Macedonia",
    "Република Македонија"
  ]){
    const r=canonicalStateIdentity(label);
    assert.equal(r.stateId,"MK");
    assert.equal(r.sourceLabel,label);
  }
});

test("ICSID case number classifier separates Convention and Additional Facility",()=>{
  const c=classifyIcsidCaseNumber("ARB/23/31");
  assert.equal(c.regime,"icsid_convention");
  assert.equal(c.proceedingType,"arbitration");
  assert.equal(c.article54ConventionEnforcement,true);

  const af=classifyIcsidCaseNumber("ARB(AF)/22/4");
  assert.equal(af.regime,"additional_facility");
  assert.equal(af.article54ConventionEnforcement,false);

  const unknown=classifyIcsidCaseNumber("MYSTERY/26/1");
  assert.equal(unknown.regime,"unknown");
  assert.equal(unknown.humanReviewRequired,true);
});

test("ICSID published-document classifier splits compound award and dissent",()=>{
  const p=classifyIcsidPublishedDocument("Award and Dissenting Opinion by arbitrator Pierre Mayer");
  assert.deepEqual(p.documentTypes,["award","dissenting_opinion"]);
  assert.equal(p.compoundDocument,true);
  assert.equal(p.requiresDocumentSplit,true);
  const submission=classifyIcsidPublishedDocument("Article 1128 Submission of the United States of America");
  assert.ok(submission.documentTypes.includes("non_disputing_party_submission"));
});

test("ICSID legal-effect rules never give Article 54 effect to Additional Facility",()=>{
  const convention=icsidLegalEffect({regime:"icsid_convention",documentType:"award"});
  assert.equal(convention.article54ConventionEnforcement,true);
  const af=icsidLegalEffect({regime:"additional_facility",documentType:"award"});
  assert.equal(af.article54ConventionEnforcement,false);
  const dissent=icsidLegalEffect({regime:"icsid_convention",documentType:"dissenting_opinion"});
  assert.equal(dissent.effect,"separate_opinion_non_binding");
});

test("ICSID recent HTML parser preserves event date independently from case-number year",()=>{
  const html=`
    <div>October 19, 2026</div>
    <a href="/cases/case-database/case-detail?CaseNo=ARB/22/28">Suffolk (Mauritius) Limited v. Portuguese Republic (ICSID Case No. ARB/22/28)</a>
  `;
  const rows=parseIcsidRecentHtml(html,{eventType:"registered",sourceUrl:"https://icsid.worldbank.org/cases/recent"});
  assert.equal(rows.length,1);
  assert.equal(rows[0].source_event_date,"2026-10-19");
  assert.equal(rows[0].case_number,"ARB/22/28");
  assert.equal(rows[0].chronology_flag,"case_number_year_differs_from_event_year_review");
  assert.equal(rows[0].production_eligible,false);
});

test("UHRI extraction stages North Macedonia recommendations without turning them into judgments",()=>{
  const sample=[
    {country:"North Macedonia",mechanism:"Committee against Torture",documentSymbol:"CAT/C/MKD/CO/4",recommendation:"Strengthen safeguards."},
    {country:"Austria",mechanism:"UPR",recommendation:"Other record."}
  ];
  const rows=extractNorthMacedoniaUhriRecords(sample);
  assert.equal(rows.length,1);
  assert.equal(rows[0].state_id,"MK");
  assert.equal(rows[0].mechanism,"treaty_body_cat");
  assert.equal(rows[0].legal_effect,"recommendation_or_observation_not_domestic_judgment");
  assert.equal(rows[0].production_eligible,false);
  assert.equal(classifyOhchrMechanism("Universal Periodic Review"),"upr");
});

test("supplied document families receive safe subtypes rather than false authority",()=>{
  const bulletin=classifyInternationalDocument("БИЛТЕН на судската практика на Врховен суд 2016-2017");
  assert.equal(bulletin.documentSubtype,"official_case_law_bulletin");
  assert.equal(bulletin.route,"review_only");

  const register=classifyInternationalDocument("Регистар на одлуки ГЖ и ТСЖ според тужбеното барање");
  assert.equal(register.documentSubtype,"case_law_discovery_register");

  const ngo=classifyInternationalDocument("Месечен извештај за човековите права во Република Македонија");
  assert.equal(ngo.documentSubtype,"human_rights_monitoring_report");
  assert.equal(ngo.authorityClass,"secondary_non_binding");
  assert.equal(ngo.privacyRisk,"elevated");
});

test("ECHR gold fixtures preserve decision-versus-judgment and merits boundaries",()=>{
  const taleski=fixtures.echr_cases.find(x=>x.id==="taleski-and-others");
  assert.equal(taleski.document_type,"decision");
  assert.equal(taleski.outcome,"inadmissible");
  assert.equal(taleski.merits_on_pardons,"not_determined");

  const dh=fixtures.echr_cases.find(x=>x.id==="dh-and-others-v-north-macedonia");
  assert.ok(dh.expected_findings.some(x=>x.article==="3"&&x.result==="violation"));
  assert.ok(dh.expected_findings.some(x=>x.article==="3"&&x.result==="no_violation"));

  const v=fixtures.echr_cases.find(x=>x.id==="vasilkoski-and-others");
  assert.equal(v.duplicate_fixture_required,true);
});

test("supplied MK laws remain version/provenance tests, not automatic current law",()=>{
  for(const law of fixtures.mk_legal_instruments){
    assert.equal(law.expected_route,"legal_instrument");
    assert.equal(law.current_law_status_from_file_alone,"not_verified");
  }
  const kz=fixtures.mk_legal_instruments.find(x=>x.id==="criminal-code-unofficial-consolidated");
  assert.equal(kz.source_status,"unofficial_consolidated_text");
  assert.ok(kz.regression_features.includes("lettered_articles"));
});
