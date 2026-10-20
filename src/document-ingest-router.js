import {classifyInternationalDocument} from "./international-legal-classifier.js";

// AI Advokat governed document ingest router.
// Deterministic routing only: it never changes legal authority, never fabricates
// identifiers and never bypasses the Human Gate.

export const DOCUMENT_INGEST_ROUTER_VERSION = "1.1.0";
export const DOCUMENT_INGEST_ROUTER_SCHEMA = "AI_ADVOCAT_DOCUMENT_ROUTE_V1";

const CONTROL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const MAX_TEXT=2_000_000;
const MAX_BATCH=500;

function clean(value){
  if(typeof value!=="string") throw new TypeError("document_router_text_required");
  const text=value.normalize("NFKC").replace(/\r\n?/g,"\n").trim();
  if(!text) throw new TypeError("document_router_text_required");
  if(text.length>MAX_TEXT) throw new TypeError("document_router_text_too_large");
  if(CONTROL.test(text)) throw new TypeError("document_router_control_character");
  return text;
}

function countMatches(text,re,limit=1000){
  const flags=re.flags.includes("g")?re.flags:re.flags+"g";
  const rx=new RegExp(re.source,flags);
  let n=0;
  for(const _m of text.matchAll(rx)){
    n++;
    if(n>=limit) break;
  }
  return n;
}

function has(text,re){return re.test(text);}

function lawSignals(text){
  const articleHeaderCount=countMatches(
    text,
    /^\s*ЧЛЕН\s+[0-9]+(?:\s*[-–—]?\s*[А-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ])?\s*\.?\s*$/gimu,
    1000
  );
  const lawTitle=has(text,/^\s*(?:ЗАКОН|УСТАВ|УРЕДБА|ПРАВИЛНИК|ПРАВИЛА|УПАТСТВО|ТАРИФА)(?![\p{L}\p{N}])[^\n]{0,180}$/imu);
  const amendingLaw=has(text,/ЗАКОН\s+ЗА\s+(?:ИЗМЕНУВАЊЕ|ДОПОЛНУВАЊЕ|ИЗМЕНУВАЊЕ\s+И\s+ДОПОЛНУВАЊЕ)\s+НА\s+ЗАКОНОТ/iu);
  const gazette=has(text,/Службен\s+весник\s+на\s+Република(?:\s+Северна)?\s+Македонија/iu);
  const chapterCount=countMatches(text,/^\s*(?:ГЛАВА|ДЕЛ|ОДДЕЛ)\s+(?:[IVXLC]+|[0-9]+)(?![\p{L}\p{N}])/gimu,100);
  const promulgation=has(text,/СЕ\s+ПРОГЛАСУВА\s+ЗАКОНОТ/iu);

  let score=0;
  if(articleHeaderCount>=5) score+=7;
  else if(articleHeaderCount>=2) score+=5;
  else if(articleHeaderCount===1) score+=1;
  if(lawTitle) score+=5;
  if(amendingLaw) score+=5;
  if(gazette) score+=2;
  if(chapterCount>=1) score+=2;
  if(promulgation) score+=2;

  return Object.freeze({
    score,
    articleHeaderCount,
    lawTitle,
    amendingLaw,
    gazette,
    chapterCount,
    promulgation
  });
}

function caseLawSignals(text){
  const court=has(text,/(?:Врховен|Уставен|Управен|Виш\s+управен|Апелационен|Основен(?:\s+кривичен)?)\s+суд/iu);
  const caseReference=has(text,/(?<![\p{L}\p{N}])(?:У\.?бр\.?|К\.?бр\.?|КПП?\.?бр\.?|П\.?бр\.?|ПЛ\.?бр\.?|Т\.?бр\.?|ТКР\.?бр\.?|Рев\.?бр\.?|УСПИ?\.?бр\.?|УЖ\.?бр\.?|УЖР\.?бр\.?)\s*[\p{L}\p{N}./-]{1,48}(?![\p{L}\p{N}])/iu);
  const decisionHeader=has(text,/^\s*(?:ПРЕСУДА|РЕШЕНИЕ|ОДЛУКА|ОПРЕДЕЛЕНИЕ|НАРЕДБА)\s*$/imu);
  const operative=has(text,/(?:СЕ\s+(?:УВАЖУВА|ОДБИВА|ОТФРЛА|ПОНИШТУВА|ПОТВРДУВА|ПРЕИНАЧУВА)|\bПРЕСУДИ\b|\bРЕШИ\b|\bОДЛУЧИ\b)/iu);
  const reasoning=has(text,/^\s*(?:ОБРАЗЛОЖЕНИЕ|О\s*Б\s*Р\s*А\s*З\s*Л\s*О\s*Ж\s*Е\s*Н\s*И\s*Е)\s*$/imu);
  const parties=has(text,/(?:тужител|тужен|обвинет|обвинета|жалител|барател|оштетен|јавен\s+обвинител)/iu);
  const finality=has(text,/правосилн(?:а|о|и|оста)|неправосилн(?:а|о|и)/iu);
  const echrIdentity=has(text,/ECLI:CE:ECHR:|(?:Application|апликаци(?:ја|јата))\s+(?:no\.?\s*)?\d{1,6}\/\d{2}/iu);

  let score=0;
  if(court) score+=5;
  if(caseReference) score+=4;
  if(decisionHeader) score+=3;
  if(operative) score+=2;
  if(reasoning) score+=1;
  if(parties) score+=1;
  if(finality) score+=1;
  if(echrIdentity) score+=5;

  return Object.freeze({
    score,
    court,
    caseReference,
    decisionHeader,
    operative,
    reasoning,
    parties,
    finality,
    echrIdentity
  });
}

function otherLegalSignals(text){
  const contract=has(text,/(?:договорни\s+страни|склучуваат\s+договор|предмет\s+на\s+договорот|раскинување\s+на\s+договор)/iu);
  const submission=has(text,/(?:ПОДНЕСОК|ЖАЛБА|ТУЖБА|ПРИГОВОР|БАРАЊЕ)(?![\p{L}\p{N}])/iu);
  const powerOfAttorney=has(text,/(?:ПОЛНОМОШНО|полномошник|ополномоштува)/iu);
  const administrativeAct=has(text,/(?:министерство|општина|комисија|орган\s+на\s+управа)[\s\S]{0,240}(?:РЕШЕНИЕ|ОДЛУКА)/iu);
  const score=[contract,submission,powerOfAttorney,administrativeAct].filter(Boolean).length;
  return Object.freeze({score,contract,submission,powerOfAttorney,administrativeAct});
}

function pipelineFor(route,documentSubtype="unknown"){
  if(route==="legal_instrument"){
    return Object.freeze({
      id:"mk_legal_text_pipeline",
      parser:"scripts/parse-mk-legal-text.mjs",
      importer:"scripts/legal-ndjson-to-sql.mjs",
      requiredMetadata:Object.freeze(["instrument_key","instrument_title","version_id","source_url","source_sha256"]),
      note:"Article parsing and consolidation remain governed by version/provenance metadata and current-law Human Gate controls."
    });
  }
  if(route==="case_law"){
    return Object.freeze({
      id:"case_law_metadata_pipeline",
      processor:"src/case-law-metadata-processor.js",
      importer:"scripts/case-law-ndjson-to-sql.mjs",
      requiredMetadata:Object.freeze(["source_url","source_sha256"]),
      note:"Metadata extraction never generates ECLI and remains pending official-source binding and Human Gate."
    });
  }
  if(["official_case_law_bulletin","case_law_discovery_register"].includes(documentSubtype)){
    return Object.freeze({
      id:"case_law_publication_review",
      processor:"src/case-law-publication-processor.js",
      requiredMetadata:Object.freeze(["source_url","source_sha256"]),
      note:"Bulletin and discovery-register records remain discovery/review material; excerpts never self-promote to complete originating judgments."
    });
  }
  if(documentSubtype==="human_rights_monitoring_report"){
    return Object.freeze({
      id:"secondary_human_rights_review",
      analyzer:"src/legal-analyzer.js",
      requiredMetadata:Object.freeze(["source_url","source_sha256"]),
      privacyMinimisationRequired:true,
      personSearchIndexAllowed:false,
      note:"Secondary monitoring material remains non-binding and elevated-privacy review only."
    });
  }
  if(documentSubtype.startsWith("icsid_") || documentSubtype.startsWith("ohchr_")){
    return Object.freeze({
      id:"international_legal_reference_review",
      classifier:"src/international-legal-classifier.js",
      sourceRegistry:"data/international-legal-source-registry-2026.json",
      requiredMetadata:Object.freeze(["source_url","source_sha256"]),
      note:"International procedural rules and UN mechanism outputs retain source-specific legal effect and remain behind Human Gate."
    });
  }
  return Object.freeze({
    id:"legal_analyzer_review",
    analyzer:"src/legal-analyzer.js",
    requiredMetadata:Object.freeze([]),
    note:"No corpus ingestion is selected automatically."
  });
}

export function classifyDocumentForIngest(textInput){
  const text=clean(textInput);
  const law=lawSignals(text);
  const caseLaw=caseLawSignals(text);
  const other=otherLegalSignals(text);
  const international=classifyInternationalDocument(text);

  let route="manual_review";
  let reason="insufficient_or_conflicting_structural_signals";
  let autoRouteAllowed=false;

  const structuralConflict=law.score>=7 && caseLaw.score>=7 &&
    caseLaw.decisionHeader && law.articleHeaderCount>=2;

  if(structuralConflict){
    route="manual_review";
    reason="strong_law_and_case_law_structures_conflict";
  }else if(international.documentSubtype!=="unknown"){
    route=international.route;
    reason="international_document_subtype_"+international.documentSubtype;
    autoRouteAllowed=international.route==="case_law";
  }else if(law.score>=7 && law.score>=caseLaw.score+3){
    route="legal_instrument";
    reason="standalone_article_structure_and_normative_signals";
    autoRouteAllowed=true;
  }else if(caseLaw.score>=7 && caseLaw.score>=law.score+3){
    route="case_law";
    reason="court_identity_case_reference_and_decision_signals";
    autoRouteAllowed=true;
  }else if(other.score>=1){
    route="review_only";
    reason="legal_document_not_safe_for_corpus_auto_route";
  }

  return Object.freeze({
    schemaVersion:DOCUMENT_INGEST_ROUTER_SCHEMA,
    routerVersion:DOCUMENT_INGEST_ROUTER_VERSION,
    route,
    autoRouteAllowed,
    reason,
    deterministicRoutingScore:Object.freeze({
      legalInstrument:law.score,
      caseLaw:caseLaw.score,
      otherLegal:other.score,
      statisticalConfidence:null
    }),
    documentSubtype:international.documentSubtype,
    authorityClass:international.authorityClass,
    privacyRisk:international.privacyRisk,
    signals:Object.freeze({legalInstrument:law,caseLaw,otherLegal:other,international}),
    downstream:pipelineFor(route,international.documentSubtype),
    humanGateRequired:true,
    generatedOfficialIdentifier:false
  });
}

export function buildDocumentRouteBatch(documents=[]){
  if(!Array.isArray(documents)) throw new TypeError("document_router_documents_array_required");
  if(documents.length>MAX_BATCH) throw new TypeError("document_router_batch_limit_exceeded");
  const records=documents.map((d,i)=>Object.freeze({
    filename:String(d?.filename||`document-${i+1}.txt`).slice(0,240),
    sourceSha256:d?.sourceSha256||null,
    ...classifyDocumentForIngest(d?.text)
  }));
  const counts=records.reduce((acc,r)=>{
    acc[r.route]=(acc[r.route]||0)+1;
    return acc;
  },{});
  return Object.freeze({
    schemaVersion:DOCUMENT_INGEST_ROUTER_SCHEMA,
    routerVersion:DOCUMENT_INGEST_ROUTER_VERSION,
    recordCount:records.length,
    counts:Object.freeze(counts),
    records:Object.freeze(records),
    humanGateRequired:true
  });
}
