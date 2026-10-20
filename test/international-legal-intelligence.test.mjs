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
import {classifyDocumentForIngest} from "../src/document-ingest-router.js";
import {extractEchrStructuredMetadata} from "../src/echr-findings.js";

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


test("main document router exposes governed international subtypes",()=>{
  const bulletin=classifyDocumentForIngest("БИЛТЕН на судската практика на Врховен суд 2016-2017");
  assert.equal(bulletin.route,"review_only");
  assert.equal(bulletin.documentSubtype,"official_case_law_bulletin");
  assert.equal(bulletin.autoRouteAllowed,false);

  const ngo=classifyDocumentForIngest("Месечен извештај за човековите права во Република Македонија");
  assert.equal(ngo.route,"review_only");
  assert.equal(ngo.documentSubtype,"human_rights_monitoring_report");
  assert.equal(ngo.privacyRisk,"elevated");
});


test("D.H. operative part preserves mixed violation and non-violation findings by article",()=>{
  const text=`
JUDGMENT
Application no. 44033/17
FOR THESE REASONS, THE COURT, UNANIMOUSLY,
Declares the complaints concerning Article 3 and Article 8 of the Convention admissible and the remainder of the application inadmissible;
Holds that there has been a violation of Article 3 of the Convention concerning the lack of access to food, water and a toilet;
Holds that there has been no violation of Article 3 of the Convention concerning adequate medical treatment in respect of the second, third and fourth applicants;
Holds that there has been a violation of Article 8 of the Convention as a result of the publication of the applicants' photographs by the Ministry;
Holds that there has been no violation of Article 8 of the Convention on account of the publication of the applicants' photographs in certain media outlets;
Holds that there is no need to examine the complaint under Article 6 of the Convention;
`;
  const r=extractEchrStructuredMetadata(text);
  assert.equal(r.documentType,"judgment");
  assert.ok(r.applicationNumbers.includes("44033/17"));
  assert.ok(r.findings.some(x=>x.article==="3"&&x.result==="violation"));
  assert.ok(r.findings.some(x=>x.article==="3"&&x.result==="no_violation"));
  assert.ok(r.findings.some(x=>x.article==="8"&&x.result==="violation"));
  assert.ok(r.findings.some(x=>x.article==="8"&&x.result==="no_violation"));
  assert.ok(r.findings.some(x=>x.article==="6"&&x.result==="no_separate_examination"));
  assert.equal(r.meritsDetermined,true);
});

test("Mitrov Macedonian operative text extracts Article 6 violation without inventing a second merits finding",()=>{
  const text=`
МИТРОВ ПРОТИВ РЕПУБЛИКА МАКЕДОНИЈА ПРЕСУДА
жалба бр. 45959/09
ОД ТИЕ ПРИЧИНИ, СУДОТ, ЕДНОГЛАСНО
1. Ја прогласува жалбата за допуштена;
2. Смета дека има повреда на членот 6 од Конвенцијата во поглед на жалбените наводи за непристрасноста на основниот суд;
3. Смета дека нема потреба да ја преиспита жалбата во однос на останатите жалбени наводи согласно членот 6 став 1 од Конвенцијата;
`;
  const r=extractEchrStructuredMetadata(text);
  assert.equal(r.documentType,"judgment");
  assert.ok(r.applicationNumbers.includes("45959/09"));
  assert.ok(r.findings.some(x=>x.article==="6"&&x.result==="violation"));
  assert.ok(r.findings.some(x=>x.article==="6 став 1"&&x.result==="no_separate_examination"));
});

test("Taleski is an inadmissibility decision and never a merits ruling on pardons",()=>{
  const text=`
ТАЛЕСКИ против СЕВЕРНА МАКЕДОНИЈА И ДРУГИ АПЛИКАЦИИ (ОДЛУКА)
апликација бр. 77796/17
Судот смета дека конкретните жалбени наводи на апликантите по основ на членот 6 се преуранети и мора да бидат отфрлени согласно членот 35 ст. 1 и 4 од Конвенцијата поради неисцрпување на домашните правни лекови.
Од овие причини, Судот едногласно,
Одлучи да ги спои апликациите;
Ги прогласи апликациите за недопуштени.
`;
  const r=extractEchrStructuredMetadata(text);
  assert.equal(r.documentType,"decision");
  assert.ok(r.applicationNumbers.includes("77796/17"));
  assert.equal(r.inadmissibilityPresent,true);
  assert.equal(r.meritsDetermined,false);
});


test("ECHR judicial-independence fixtures preserve delivery and finality as separate lifecycle states",()=>{
  for(const id of ["ilievska-zdraveva-v-north-macedonia","ribarev-v-north-macedonia"]){
    const item=fixtures.echr_cases.find(x=>x.id===id);
    assert.ok(item,id);
    assert.equal(item.judgment_date,"2025-11-13");
    assert.equal(item.final_date,"2026-02-13");
    assert.deepEqual(item.lifecycle,["delivered","pending_finality","final"]);
    assert.ok(item.expected_findings.some(x=>x.article==="6 § 1"&&x.result==="violation"));
  }
});

test("ICSID rulebook subtype classification uses the front matter, not incidental later section names",()=>{
  const convention=classifyInternationalDocument("ICSID CONVENTION, REGULATIONS AND RULES\nCONVENTION ON THE SETTLEMENT OF INVESTMENT DISPUTES BETWEEN STATES AND NATIONALS OF OTHER STATES\n... later: MEDIATION RULES");
  assert.equal(convention.documentSubtype,"icsid_convention_or_rules");

  const additional=classifyInternationalDocument("ICSID ADDITIONAL FACILITY RULES AND REGULATIONS\n... page header ICSID FACT-FINDING RULES");
  assert.equal(additional.documentSubtype,"icsid_additional_facility_rules");
});
