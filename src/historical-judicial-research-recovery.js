// Narrow, non-generative provider-outage recovery for historical judicial-research papers.
// Sources come from the existing governed discovery registry; this is NOT a case-law
// authority release, a complete bibliography or a substitute for a scholarly manuscript.
import {
  judicialDiscoverySources,
  JUDICIAL_DISCOVERY_CORPUS_VERSION
} from "./judicial-discovery-source-registry.js";

export const HISTORICAL_JUDICIAL_RESEARCH_RECOVERY_VERSION = "HISTORICAL_JUDICIAL_RESEARCH_SOURCE_FIRST_R1";

const SOURCE_IDS = Object.freeze([
  "mk-historical-judicial-collections-1975-2017",
  "mk-supreme-master-archive",
  "mk-appellate-stip-bulletin-1997",
  "mk-appellate-skopje-bulletins",
  "mk-appellate-bitola-publications",
  "mk-constitutional-collections-2003-2017"
]);

function yearsFromRequest(query) {
  const years = [...String(query || "").matchAll(/\b((?:19|20)\d{2})\b/gu)]
    .map(row => Number(row[1])).filter(Number.isFinite);
  if (years.length < 2) return null;
  const from = Math.min(...years);
  const to = Math.max(...years);
  if (from < 1991 || to > new Date().getUTCFullYear() || to - from < 10) return null;
  return {from, to};
}

export function isHistoricalJudicialPaperRequest(query) {
  const q = String(query || "").normalize("NFKC").toLocaleLowerCase("mk");
  if (!yearsFromRequest(q)) return false;
  const paper = /(?:\bpaper\b|\bstudy\b|\bresearch\b|труд|научн|студиј|истражувањ|монограф)/iu.test(q);
  const judiciary = /(?:судск|судов|судството|пресуд|судска\s+практика|judicial|court\s+decisions|case\s+law)/iu.test(q);
  const mk = /(?:македон|макеодн|северна\s+македон|north\s+macedon|macedonian)/iu.test(q);
  const individualCase = /(?:^|[^\p{L}\p{N}])(?:кокж|рев|кж|грж|у\.?\s*бр)[-.\s]*\d{1,8}\/\d{2,4}(?:$|[^\p{L}\p{N}])/iu.test(q);
  return paper && judiciary && mk && !individualCase;
}

export function isTransientHistoricalResearchProviderFailure(failure) {
  if (!failure || failure.ok === true) return false;
  const error = String(failure.error || "");
  // The public FREE chat translates Workers AI error codes to a stable
  // frontend error. Only an attempted, retryable and categorised upstream
  // provider failure qualifies; never generic security/validation failures.
  if(["free_workers_ai_provider_error","free_workers_ai_empty_response"].includes(error)){
    const source=String(failure.upstreamErrorCategory||"");
    const categories=error==="free_workers_ai_empty_response"
      ? ["workers_ai_empty_response"]
      : ["workers_ai_timeout","workers_ai_provider_error"];
    return failure.retryable!==false
      && Number(failure.providerCalls||0)>0
      && categories.includes(source);
  }
  const allowed = new Set([
    "openai_network_error", "openai_timeout_error", "openai_incomplete_response",
    "openai_empty_response", "workers_ai_daily_capacity_exhausted",
    "workers_ai_timeout"
  ]);
  if (allowed.has(error)) return true;
  if (error === "openai_response_error") return [408, 429, 500, 502, 503, 504].includes(Number(failure.status || 0));
  return false;
}

export function historicalJudicialResearchRecovery(query, failure) {
  if (!isHistoricalJudicialPaperRequest(query) || !isTransientHistoricalResearchProviderFailure(failure)) return null;
  const years = yearsFromRequest(query);
  const available = judicialDiscoverySources();
  const rows = SOURCE_IDS.map(id => available.find(row => row.id === id)).filter(Boolean);
  if (rows.length !== SOURCE_IDS.length) return null; // Never fabricate missing registry entries.
  const sources = rows.map(row => ({
    title: row.title,
    court: row.court,
    period: row.period,
    url: row.sourceUrl,
    authorityClass: row.authorityClass,
    discoveryOnly: true,
    legalAuthority: false,
    humanReviewRequired: true,
    sourceRegistryVersion: JUDICIAL_DISCOVERY_CORPUS_VERSION
  }));
  const researchPeriodGroups = [[years.from, Math.min(2000, years.to)], [Math.max(2001, years.from), Math.min(2010, years.to)], [Math.max(2011, years.from), Math.min(2020, years.to)], [Math.max(2021, years.from), years.to]]
    .filter(([from, to]) => from <= to).map(([from, to]) => from + "–" + to).join("; ");
  const title = "Судските пресуди во македонското судство (" + years.from + "–" + years.to + ")";
  const answer = [
    "РАБОТНА ИСТРАЖУВАЧКА РАМКА · ИЗВОРЕН КОРПУС · БЕЗ ГЕНЕРАТИВЕН МОДЕЛ",
    "",
    "ТЕМА: " + title,
    "Статус: почетен научно-истражувачки нацрт, НЕ готов или рецензиран труд. AI-провајдерот не го заврши барањето; достапен е само проверливиот регистар на публикации, не анализа на сите пресуди.",
    "",
    "ПРЕДЛОГ-АПСТРАКТ (методолошки, без тврдења за непроверени пресуди)",
    "Трудот има за цел систематски да ги истражи судските пресуди и развојот на судската практика во Република Северна Македонија во периодот " + years.from + "–" + years.to + " година. Предложениот пристап ги разликува поимите пресуда, решение, одлука и правен став, ги документира судот и правната област и ја следи историската верзија на применливата правна норма. Заклучоци за тенденции се дозволени дури по преглед на соодветен примерок и проверка на оригиналните одлуки.",
    "",
    "ИСТРАЖУВАЧКИ ПРАШАЊА",
    "1. Кои видови судски акти и објавени збирки се достапни за избраниот период?",
    "2. Како се разликува судската практика според вид на суд, правна област и година?",
    "3. Како се менувал применливиот нормативен контекст и на кои историски редакции се потпираат конкретните одлуки?",
    "4. Кои наоди се поддржани со потврден оригинален судски акт, а кои се само изворни метаподатоци?",
    "",
    "ПРЕДЛОГ-СТРУКТУРА НА ТРУДОТ",
    "I. Вовед, цел и ограничувања.",
    "II. Судски систем и видови судски акти — разграничување по институција и постапка.",
    "III. Истражувачки корпус и метод: извори, селекција, дупликати и временско покривање.",
    "IV. Периодизација за анализата: " + researchPeriodGroups + " (работни истражувачки групи, не тврдење за правни пресвртници).",
    "V. Тематска анализа по граѓанска, кривична, управна и уставна материја — само по item-level проверка.",
    "VI. Дискусија за конзистентност, промени и граници на генерализацијата.",
    "VII. Заклучок, ограничувања, извори и прилог со проверени пресуди.",
    "",
    "ПОСТОЈНИ ИЗВОРНИ ЗБИРКИ ЗА ПОНАТАМОШНО ПРЕБАРУВАЊЕ (DISCOVERY ONLY)",
    ...rows.map((row, i) => (i + 1) + ". " + row.title + " · период " + row.period + " · " + row.sourceUrl),
    "",
    "ЗАДОЛЖИТЕЛНА МАТРИЦА ЗА СЕКОЈА ПРЕСУДА",
    "Суд | број на предмет | вид акт | датум | официјален документ/локатор | правна област | тогашна редакција на закон | правен став | исход | конечност/правосилност | статус на верификација.",
    "",
    "ГРАНИЦА НА ДОКАЗИТЕ",
    "Наведените линкови упатуваат кон институционални извори/регистри, НЕ кон проверени поединечни пресуди. Нема потврда за целосна покриеност на секоја година од " + years.from + " до " + years.to + ". Не се изведуваат непроверени исходи, бројки или судски правни ставови.",
    "",
    "СЛЕДЕН РАБОТЕН ЧЕКОР",
    "Избери правна област и репрезентативен примерок, потврди ги оригиналните одлуки и нивните датуми, направи библиографија и дури тогаш напиши емпириски засновани наоди. Служи се со /judicial-practice.html и /case-law-curation.html; Human Gate пред професионално користење.",
    "",
    "ПРОВЕНИЕНЦИЈА: " + JUDICIAL_DISCOVERY_CORPUS_VERSION + " · " + HISTORICAL_JUDICIAL_RESEARCH_RECOVERY_VERSION + "."
  ].join("\n");
  return {answer, sources, years, sourceRegistryVersion: JUDICIAL_DISCOVERY_CORPUS_VERSION};
}


// One response contract for /api/chat and /api/bot; Academy embeds /bot/.
// The caller must have released the reserved app quota before emitting this.
export function historicalJudicialResearchRecoveryPayload(recovery,{
  failure=null,
  from="openai",
  providerCalls=0,
  missionProfile="",
  governanceRunId=null,
  membership=null,
  quota=0,
  used=0,
  trainingOpen=false
}={}){
  if(!recovery || !Array.isArray(recovery.sources) || !recovery.sources.length) return null;
  const usedAfterRefund=Math.max(0,Number(used||0)-1);
  const userMembership=membership
    ? {planCode:membership.planCode,monthlyQuota:quota,used:usedAfterRefund,remaining:Math.max(0,quota-usedAfterRefund)}
    : {planCode:trainingOpen?"training":"free",trainingOpen};
  return {
    ok:true,
    answer:recovery.answer,
    provider:"canonical_corpus_no_model",
    providerFallback:{
      from,
      reason:String(failure?.error||"provider_failure").slice(0,80),
      httpStatus:Number(failure?.status||0)||null,
      attempts:Array.isArray(failure?.providerAttempts)?failure.providerAttempts.length:1
    },
    model:null,
    mode:"passive_corpus",
    displayMode:"historical_judicial_research_outline",
    sourceMode:"historical_judicial_research_outline_registry_no_model",
    researchOutputStatus:"OUTLINE_ONLY_NOT_COMPLETED_PAPER",
    sourceRegistryVersion:recovery.sourceRegistryVersion,
    recoveryVersion:HISTORICAL_JUDICIAL_RESEARCH_RECOVERY_VERSION,
    legalSources:[],
    caseLawSources:recovery.sources,
    publicationSources:[],
    guideSources:[],
    sources:[],
    webSearchUsed:false,
    performance:{
      providerCalls:Number(providerCalls||0),
      languageRepairProviderCalls:0,
      deterministicRecoveryProviderCalls:0,
      fastPromptUsed:false
    },
    membership:userMembership,
    legalGovernance:{
      engine:"AI_ADVOKAT_LIOE_v1",
      missionProfile,
      sourceVerificationState:"DISCOVERY_SOURCE_REGISTRY_ONLY",
      temporalVerificationState:"ITEM_LEVEL_PENDING",
      jurisdictionVerificationState:"MK_SCOPE",
      verificationState:"RESEARCH_ONLY_NO_HOLDINGS",
      releaseState:"RESEARCH_OUTLINE_ONLY",
      executionAuthorization:"NO_EXTERNAL_ACTION",
      humanReviewRequired:true,
      postflightRequired:false,
      postflightBypassReason:"NO_LEGAL_FINDINGS_RELEASED"
    },
    humanGate:"Source registry discovery is not item-level authority. Verify every original court decision, legal holding, historical statute and bibliography before publication or professional use."
  };
}
