import { assessEchrComparisonGate } from "./case-law-evidence-gates.js";

export const ECHR_CROSSWALK_VERSION="PARAGRAF_F0_FAST_27_V1_1";
export const ECHR_CROSSWALK_SOURCE_SHA256="3169baf559f9f372b1f7de543c19ee63fddfd83d900138a18c5198f4d3ad5aba";

export const ECHR_CROSSWALK_RECORDS=Object.freeze([
  Object.freeze({
    id:"B16",
    domesticCase:"Квп2.бр.18/2021",
    domesticDate:"06.05.2021",
    sourcePages:"116–118",
    title:"Недоставен писмен предлог на Вишо јавно обвинителство во жалбена постапка",
    echrCase:"Taleski and Others v. North Macedonia",
    echrApplications:["34261/23","7877/24"],
    hudocId:"001-250744",
    hudocUrl:"https://hudoc.echr.coe.int/eng?i=001-250744",
    normativeFramework:"ЕКЧП чл. 6 §1; ЗКП чл. 465(1)(3), 459(2), 461, 464, 467 според публикацијата",
    comparativeDraft:"ЕСЧП во Taleski разгледува недоставени писмени ставови на повисок јавен обвинител во жалбена постапка и утврдува повреда на контрадикторноста за засегнатите жалители. Ова е силна тематска споредба со B16, но не ја заменува проверката на точното процесно дејствие и домашниот применлив ЗКП.",
    differences:"Taleski има специфична процесна состојба, вклучително и расправа и вонредни правни лекови. Не се означува како идентична пресуда; конечност на новата пресуда да се ревидира по HUDOC metadata пред публикација.",
    hold:"историски ЗКП, проверка на правосилност на ЕСЧП, извештај за независна споредбена оцена",
    comparisonStatus:"RESEARCHED_SOURCE_MATCH_NOT_LEGAL_APPROVAL",
    humanVerified:false,
    hudocMetadataVerified:false,
    historicalDomesticLawVerified:false,
    independentComparativeLegalReview:false
  }),
  Object.freeze({
    id:"B20",
    domesticCase:"Кзз.бр.10/2021",
    domesticDate:"06.10.2021",
    sourcePages:"128–131",
    title:"Процесни права и сопственост на трето лице при одземање возило",
    echrCase:"Andonoski v. the former Yugoslav Republic of Macedonia",
    echrApplications:["16225/08"],
    hudocId:"001-157279",
    hudocUrl:"https://hudoc.echr.coe.int/eng?i=001-157279",
    normativeFramework:"Протокол 1 чл. 1; КЗ чл.100-а(3); ЗКП историски чл.347(5), 351(5), 355(2), 22(6), 485(3–5)",
    comparativeDraft:"Andonoski се однесува на трајна конфискација на возило од сопственик кој не бил осуден. Судот ја оценува пропорционалноста и можноста на сопственикот ефективно да го оспори одземањето. B20 дополнително се фокусира на недоставување пресуда и лишување од право на жалба и на второ решение за враќање.",
    differences:"Andonoski не утврдува автоматски исход за сите случаи на одземање; Rashkovski се однесува на привремено обезбедување/замрзнување, не на трајно одземање на трето лице.",
    hold:"автентични редакции на стар ЗКП/КЗ, процесни акти од 2013/2021, статус на сопственик и доставување",
    comparisonStatus:"RESEARCHED_SOURCE_MATCH_NOT_LEGAL_APPROVAL",
    humanVerified:false,
    hudocMetadataVerified:false,
    historicalDomesticLawVerified:false,
    independentComparativeLegalReview:false
  }),
  Object.freeze({
    id:"B25",
    domesticCase:"Рев3.бр.146/2016",
    domesticDate:"01.11.2017",
    sourcePages:"242–244",
    title:"Недоставени одговори на жалба и можност за повторување по пресуда на ЕСЧП",
    echrCase:"Naumoski v. the former Yugoslav Republic of Macedonia",
    echrApplications:["25248/05"],
    hudocId:"001-114781",
    hudocUrl:"https://hudoc.echr.coe.int/eng?i=001-114781",
    normativeFramework:"ЕКЧП чл.6 §1; ЗПП чл.392(1)(2), 400, 343(2)(14), 385(1) според публикацијата",
    comparativeDraft:"Во Naumoski е утврдена повреда поради недоставени одговори на жалбите и поради траење на постапката; ревидираната пресуда ги задржува главните заклучоци. Во B25 Врховниот суд враќа на утврдување на условите за повторување, а не дозволува повторување автоматски.",
    differences:"Не е докажана целосната низа на домашни одлуки по враќањето и датумот на предлогот за повторување; не може да се пресмета рок без документација.",
    hold:"датум на поднесување, процесна низа, точен чл.400 во релевантна редакција, исход по враќање",
    comparisonStatus:"RESEARCHED_SOURCE_MATCH_NOT_LEGAL_APPROVAL",
    humanVerified:false,
    hudocMetadataVerified:false,
    historicalDomesticLawVerified:false,
    independentComparativeLegalReview:false
  })
]);

function norm(value=""){return String(value||"").normalize("NFKC").toLocaleLowerCase("mk").replace(/\s+/g," ").trim();}

export function searchEchrCrosswalk(query=""){
  const q=norm(query);
  if(!q) return ECHR_CROSSWALK_RECORDS;
  return ECHR_CROSSWALK_RECORDS.filter(r=>norm([
    r.id,r.domesticCase,r.domesticDate,r.title,r.echrCase,
    ...r.echrApplications,r.normativeFramework,r.comparativeDraft,r.differences,r.hold
  ].join(" ")).includes(q));
}

export const ECHR_CROSSWALK_AUTHORITY_BOUNDARY=Object.freeze({
  status:"research_candidate",
  humanGateStatus:"OPEN",
  publicationApproved:false,
  reviewedAuthorityPromoted:false,
  legalVerifiedCount:0,
  legalVerifiedTarget:30,
  productionGo:false,
  hudocMetadataVerificationRequired:true,
  historicalDomesticLawVerificationRequired:true,
  independentComparativeLegalReviewRequired:true,
  humanGateRequired:true
});


export function assessEchrCrosswalkRecord(record){
  return assessEchrComparisonGate(record);
}

export function searchEchrCrosswalkWithGate(query=""){
  return searchEchrCrosswalk(query).map(record=>Object.freeze({
    ...record,
    evidenceGate:assessEchrComparisonGate(record)
  }));
}
