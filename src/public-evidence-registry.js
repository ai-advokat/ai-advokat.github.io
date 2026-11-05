// AI Advokat · Public Evidence & Legal OSINT governed source registry.
// Public-source discovery is not a legal conclusion. A source match establishes
// provenance context only; claim meaning, identity resolution and legal effect
// remain separate Human Gates.

export const PUBLIC_EVIDENCE_LAYER_VERSION="AI_ADVOCAT_PUBLIC_EVIDENCE_V1";
export const PUBLIC_EVIDENCE_STATUSES=Object.freeze([
  "LEAD",
  "SOURCE_BACKED",
  "CORROBORATED",
  "OFFICIAL_VERIFIED",
  "DISPUTED",
  "STALE",
  "UNVERIFIED",
  "HUMAN_GATE_VERIFIED"
]);

const SOURCES=Object.freeze([
  {
    id:"mk-crrsm",
    title:"Централен регистар на Република Северна Македонија",
    url:"https://www.crm.com.mk/",
    jurisdiction:"MK",
    category:"entity",
    authorityClass:"official_registry",
    sourceRole:"entity_identity_and_registry_documents",
    access:"official_web_service_or_public_portal",
    automation:"manual_or_user_authorised_retrieval",
    rights:"terms_review_required",
    legalAuthority:false,
    claimBoundary:"Регистарскиот запис може да потврди идентитет/статус на субјектот; не докажува незаконитост, фактичка контрола или правна одговорност."
  },
  {
    id:"mk-dksk",
    title:"Државна комисија за спречување на корупцијата",
    url:"https://dksk.mk/",
    jurisdiction:"MK",
    category:"entity",
    authorityClass:"official_public_body",
    sourceRole:"public_official_and_asset_interest_discovery",
    access:"public_portal",
    automation:"manual_or_user_authorised_retrieval",
    rights:"terms_review_required",
    legalAuthority:false,
    claimBoundary:"Јавен запис или PEP-индикатор не е доказ за корупција, санкција или кривична одговорност."
  },
  {
    id:"mk-esjn",
    title:"ЕСЈН — Електронски систем за јавни набавки",
    url:"https://e-nabavki.gov.mk/",
    jurisdiction:"MK",
    category:"procurement",
    authorityClass:"official_procurement_system",
    sourceRole:"tender_notice_award_contract_discovery",
    access:"public_portal",
    automation:"manual_or_explicit_api_only",
    rights:"terms_review_required",
    legalAuthority:false,
    claimBoundary:"Објавен договор или одлука не докажува целосна реализација, плаќање, квалитет на извршување или незаконитост."
  },
  {
    id:"mk-bjn",
    title:"Биро за јавни набавки",
    url:"https://www.bjn.gov.mk/",
    jurisdiction:"MK",
    category:"procurement",
    authorityClass:"official_public_body",
    sourceRole:"procurement_rules_guidance_and_system_context",
    access:"public_portal",
    automation:"manual_or_explicit_api_only",
    rights:"terms_review_required",
    legalAuthority:false,
    claimBoundary:"Упатство или објаснување е supporting material; важечкиот пропис и конкретната постапка се проверуваат одделно."
  },
  {
    id:"mk-dzr",
    title:"Државен завод за ревизија",
    url:"https://dzr.mk/",
    jurisdiction:"MK",
    category:"public_money",
    authorityClass:"official_audit_institution",
    sourceRole:"audit_report_and_public_funds_finding",
    access:"public_portal",
    automation:"manual_or_user_authorised_retrieval",
    rights:"terms_review_required",
    legalAuthority:false,
    claimBoundary:"Ревизорски наод или препорака не е кривична пресуда и не утврдува сам по себе правна вина."
  },
  {
    id:"mk-open-finance",
    title:"Отворени финансии — Министерство за финансии",
    url:"https://open.finance.gov.mk/",
    jurisdiction:"MK",
    category:"public_money",
    authorityClass:"official_treasury_transparency",
    sourceRole:"budget_transaction_discovery",
    access:"public_portal",
    automation:"public_dataset_or_manual_retrieval",
    rights:"public_data_subject_to_dataset_terms",
    legalAuthority:false,
    claimBoundary:"Трансакцијата покажува евидентирано плаќање; не ја докажува сама по себе договорната основа, законитоста или целосното извршување."
  },
  {
    id:"mk-ener",
    title:"ЕНЕР — Единствен национален електронски регистар на прописи",
    url:"https://ener.gov.mk/",
    jurisdiction:"MK",
    category:"regulatory_change",
    authorityClass:"official_supporting",
    sourceRole:"proposal_consultation_regulatory_history",
    access:"public_portal",
    automation:"manual_or_user_authorised_retrieval",
    rights:"terms_review_required",
    legalAuthority:false,
    claimBoundary:"Предлог-пропис, нацрт или консултација не е важечко право; финалниот акт се врзува со Собрание/Службен весник/current-law Human Gate."
  },
  {
    id:"mk-assembly",
    title:"Собрание на Република Северна Македонија",
    url:"https://www.sobranie.mk/",
    jurisdiction:"MK",
    category:"regulatory_change",
    authorityClass:"official_legislative_history",
    sourceRole:"legislative_procedure_and_adopted_text_history",
    access:"public_portal",
    automation:"manual_or_user_authorised_retrieval",
    rights:"terms_review_required",
    legalAuthority:false,
    claimBoundary:"Собраниска постапка и усвоен текст се legislative-history evidence; објавата, стапувањето во сила и примената се проверуваат посебно."
  },
  {
    id:"mk-official-gazette",
    title:"Службен весник на Република Северна Македонија",
    url:"https://slvesnik.com.mk/",
    jurisdiction:"MK",
    category:"regulatory_change",
    authorityClass:"primary_official",
    sourceRole:"publication_provenance_primary",
    access:"public_partial",
    automation:"metadata_or_user_authorised_retrieval",
    rights:"terms_review_required",
    legalAuthority:true,
    claimBoundary:"Објавениот акт е примарен извор за публикација; current-law статусот сепак бара version/effective-date проверка."
  },
  {
    id:"mk-katastar",
    title:"Агенција за катастар на недвижности",
    url:"https://www.katastar.gov.mk/",
    jurisdiction:"MK",
    category:"property",
    authorityClass:"official_property_authority",
    sourceRole:"parcel_map_transaction_and_property_document_discovery",
    access:"official_portal",
    automation:"manual_or_user_authorised_retrieval",
    rights:"terms_review_required",
    legalAuthority:false,
    claimBoundary:"Карта, парцела или GIS-трага не е доказ за сопственост; правото се потврдува со соодветен официјален документ."
  },
  {
    id:"mk-marnet-whois",
    title:"MARnet WHOIS — .mk и .мкд",
    url:"https://whois.marnet.mk/",
    jurisdiction:"MK",
    category:"digital_entity",
    authorityClass:"official_domain_registry_service",
    sourceRole:"domain_registration_and_nameserver_discovery",
    access:"public_query",
    automation:"manual_or_public_query",
    rights:"query_terms_apply",
    legalAuthority:false,
    claimBoundary:"WHOIS податок не докажува кој ја уредува веб-содржината, кој извршил конкретно дејствие или дека shared hosting значи поврзаност."
  },
  {
    id:"mk-data-gov",
    title:"data.gov.mk — Портал за отворени податоци",
    url:"https://data.gov.mk/",
    jurisdiction:"MK",
    category:"open_data",
    authorityClass:"official_open_data_portal",
    sourceRole:"public_dataset_discovery",
    access:"public_open_data_portal",
    automation:"dataset_specific",
    rights:"dataset_license_or_terms_required",
    legalAuthority:false,
    claimBoundary:"Официјалното потекло на датасет не значи дека секој запис е актуелен; проверете метаподатоци, датум, верзија и лиценца."
  },
  {
    id:"web-archive",
    title:"Internet Archive · Wayback Machine",
    url:"https://web.archive.org/",
    jurisdiction:"GLOBAL",
    category:"web_history",
    authorityClass:"archival_secondary",
    sourceRole:"historical_web_snapshot_discovery",
    access:"public_archive",
    automation:"manual_or_archive_api_subject_to_terms",
    rights:"archive_terms_apply",
    legalAuthority:false,
    claimBoundary:"Архивска снимка може да покаже што било видливо на страница во даден момент; не ја докажува вистинитоста на објавената содржина."
  },
  {
    id:"mk-time-archive",
    title:"TIME.mk — медиумска архива",
    url:"https://time.mk/",
    jurisdiction:"MK",
    category:"web_history",
    authorityClass:"secondary_media_archive",
    sourceRole:"media_trace_discovery",
    access:"public_portal",
    automation:"manual_research_only",
    rights:"publisher_and_portal_terms_apply",
    legalAuthority:false,
    claimBoundary:"Медиумска трага е discovery/supporting source; фактичката теза бара примарен или независно corroborated извор."
  }
]);

const TASKS=Object.freeze({
  entity:["mk-crrsm","mk-dksk"],
  procurement:["mk-esjn","mk-bjn","mk-open-finance","mk-dzr","mk-crrsm"],
  public_money:["mk-open-finance","mk-dzr","mk-esjn","mk-crrsm"],
  regulatory_change:["mk-ener","mk-assembly","mk-official-gazette"],
  property:["mk-katastar","mk-crrsm"],
  digital_entity:["mk-marnet-whois","web-archive","mk-crrsm"],
  open_data:["mk-data-gov"],
  web_history:["web-archive","mk-time-archive"]
});

function copySource(source){return source?{...source}:null;}
function normaliseHost(value){
  try{return new URL(String(value||"")).hostname.toLowerCase().replace(/^www\./,"");}
  catch{return "";}
}
const SOURCE_BY_ID=new Map(SOURCES.map(source=>[source.id,source]));

export function publicEvidenceSourceDirectory(){
  return SOURCES.map(copySource);
}

export function publicEvidenceSourceById(id){
  return copySource(SOURCE_BY_ID.get(String(id||"").trim())||null);
}

export function classifyPublicEvidenceUrl(value){
  const host=normaliseHost(value);
  if(!host) return null;
  for(const source of SOURCES){
    const sourceHost=normaliseHost(source.url);
    if(host===sourceHost || host.endsWith("."+sourceHost)) return copySource(source);
  }
  return null;
}

export function publicEvidenceSourcesForTask(task){
  const ids=TASKS[String(task||"").trim()]||[];
  return ids.map(id=>publicEvidenceSourceById(id)).filter(Boolean);
}

export function publicEvidenceWorkflow(task){
  const key=String(task||"").trim();
  const steps={
    entity:["LEAD","ENTITY_RESOLUTION","OFFICIAL_SOURCE","INDEPENDENT_CORROBORATION","LEGAL_RELEVANCE","HUMAN_GATE"],
    procurement:["LEAD","CONTRACTING_AUTHORITY","TENDER_OR_NOTICE","BIDDER_OR_WINNER","CONTRACT","PAYMENT_TRACE","AUDIT_OR_REVIEW","HUMAN_GATE"],
    public_money:["LEAD","BUDGET_USER","PAYMENT_TRACE","COUNTERPARTY_RESOLUTION","CONTRACT_OR_BASIS","AUDIT_CONTEXT","HUMAN_GATE"],
    regulatory_change:["LEAD","ENER_PROPOSAL","ASSEMBLY_HISTORY","OFFICIAL_GAZETTE","EFFECTIVE_DATE","CURRENT_LAW_GATE","HUMAN_GATE"],
    property:["LEAD","PARCEL_DISCOVERY","OFFICIAL_PROPERTY_DOCUMENT","IDENTITY_RESOLUTION","LEGAL_EFFECT","HUMAN_GATE"],
    digital_entity:["LEAD","DOMAIN_WHOIS","DNS_OR_ARCHIVE_TRACE","ENTITY_RESOLUTION","CORROBORATION","LEGAL_RELEVANCE","HUMAN_GATE"],
    open_data:["LEAD","DATASET_METADATA","LICENSE_OR_TERMS","DATE_AND_VERSION","RECORD_CHECK","CORROBORATION","HUMAN_GATE"],
    web_history:["LEAD","ORIGINAL_URL","ARCHIVE_TIMESTAMP","CONTENT_SNAPSHOT","INDEPENDENT_CORROBORATION","LEGAL_RELEVANCE","HUMAN_GATE"]
  };
  return {
    task:key,
    steps:steps[key]||["LEAD","SOURCE","CORROBORATION","LEGAL_RELEVANCE","HUMAN_GATE"],
    sources:publicEvidenceSourcesForTask(key),
    doctrine:"Трага не е заклучок. Едно совпаѓање е почеток, не доказ за правна теза.",
    humanGateRequired:true
  };
}

export function buildPublicEvidenceCard(input={}){
  const url=String(input.url||"").trim();
  const source=classifyPublicEvidenceUrl(url);
  const suppliedStatus=String(input.status||"LEAD").trim().toUpperCase();
  const status=PUBLIC_EVIDENCE_STATUSES.includes(suppliedStatus)?suppliedStatus:"UNVERIFIED";
  const reviewed=input.humanReviewed===true;
  const safeStatus=status==="HUMAN_GATE_VERIFIED"&&!reviewed?"SOURCE_BACKED":status;
  return Object.freeze({
    schema:"AI_ADVOCAT_PUBLIC_EVIDENCE_CARD_V1",
    title:String(input.title||"Јавна доказна трага").trim().slice(0,240),
    task:String(input.task||"general").trim().slice(0,80),
    url,
    observedAt:String(input.observedAt||new Date().toISOString()),
    sourceId:source?.id||null,
    sourceTitle:source?.title||null,
    sourceRole:source?.sourceRole||"unregistered_discovery_only",
    authorityClass:source?.authorityClass||"unregistered_external",
    status:safeStatus,
    contentSha256:/^[a-f0-9]{64}$/i.test(String(input.contentSha256||"").trim())?String(input.contentSha256).trim().toLowerCase():null,
    note:String(input.note||"").trim().slice(0,2000),
    claimBoundary:source?.claimBoundary||"Нерегистриран извор: користете само како discovery lead додека не се врзе со проверлив примарен/официјален извор.",
    legalConclusion:false,
    humanGateRequired:true
  });
}

export function publicEvidencePolicySummary(){
  return Object.freeze({
    version:PUBLIC_EVIDENCE_LAYER_VERSION,
    sourceCount:SOURCES.length,
    statuses:[...PUBLIC_EVIDENCE_STATUSES],
    tasks:Object.keys(TASKS),
    publicDataIsNotMandate:true,
    publicAccessIsNotReusePermission:true,
    automatedAdverseInference:false,
    automatedIdentityConclusion:false,
    humanGateRequired:true
  });
}
