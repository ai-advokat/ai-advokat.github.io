// AI Advokat Legal Analyzer v1
// Deterministic, source-first document analysis primitives.
// This module never fabricates official identifiers and never presents heuristic
// completeness as statistical confidence.

export const LEGAL_ANALYZER_VERSION = "1.0.0";

export const LEGAL_ANALYZER_DIMENSIONS = Object.freeze([
  "structural_integrity",
  "legal_language",
  "citation_verification",
  "compliance_mapping",
  "clause_analysis",
  "risk_assessment",
  "temporal_analysis",
  "party_analysis",
  "financial_terms",
  "intellectual_property",
  "dispute_resolution",
  "document_metadata"
]);

export const REVIEW_TABLE_DEFAULT_COLUMNS = Object.freeze([
  "filename","documentType","authority","referenceNumber","decisionDate",
  "parties","legalArea","laws","articles","operativePart","deadlines",
  "amounts","remedy","issues","sourceVerification","humanGate"
]);

const CONTROL=/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const MAX_TEXT=250000;

function cleanText(value,max=MAX_TEXT){
  if(typeof value!=="string") throw new TypeError("legal_analyzer_text_required");
  const text=value.normalize("NFKC").replace(/\r\n?/g,"\n").trim();
  if(!text) throw new TypeError("legal_analyzer_text_required");
  if(text.length>max) throw new TypeError("legal_analyzer_text_too_large");
  if(CONTROL.test(text)) throw new TypeError("legal_analyzer_control_character");
  return text;
}

function unique(values,limit=50){
  return [...new Set(values.filter(Boolean).map(v=>String(v).trim()).filter(Boolean))].slice(0,limit);
}

function matchAll(text,re,group=1,limit=50){
  const out=[];
  const rx=new RegExp(re.source,re.flags.includes("g")?re.flags:re.flags+"g");
  for(const m of text.matchAll(rx)){
    const value=(m[group]??m[0]??"").trim();
    if(value) out.push(value);
    if(out.length>=limit) break;
  }
  return unique(out,limit);
}

export function extractOfficialIdentifiers(textInput){
  const text=cleanText(textInput);
  const ecli=matchAll(text,/\b(ECLI:[A-Z]{2}:[A-Z0-9._-]+:[0-9]{4}:[A-Z0-9._-]+)\b/giu);
  const referenceNumbers=matchAll(
    text,
    /\b((?:У\.?бр\.?|К\.?бр\.?|КПП?\.?бр\.?|П\.?бр\.?|Т\.?бр\.?|УСПИ?\.?бр\.?|Рев\.?бр\.?)\s*[A-ZА-Я0-9./-]{2,30})\b/giu
  );
  return Object.freeze({
    ecli,
    referenceNumbers,
    generatedIdentifier:null,
    rule:"Only identifiers literally present in the source are returned."
  });
}

export function extractLegalReferences(textInput){
  const text=cleanText(textInput);
  const articles=matchAll(
    text,
    /(?:член|чл\.)\s*(\d+[а-яa-z]?(?:\s*(?:став|ст\.)\s*\d+)?(?:\s*(?:точка|т\.)\s*\d+)?)/giu
  );
  const laws=matchAll(
    text,
    /((?:Закон|Кривичен законик|Устав)[^\n.;:]{2,120})/giu,
    1,
    30
  ).map(v=>v.replace(/\s+/g," ").trim());
  return Object.freeze({articles:unique(articles,30),laws:unique(laws,30)});
}

export function extractTemporalData(textInput){
  const text=cleanText(textInput);
  const dates=unique([
    ...matchAll(text,/\b(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})\b/gu),
    ...matchAll(text,/\b(\d{4}-\d{2}-\d{2})\b/gu)
  ],40);
  const deadlines=matchAll(
    text,
    /((?:во\s+рок\s+од|рок(?:от)?\s+(?:изнесува|е)|најдоцна\s+во)\s+[^\n.;]{1,80})/giu,
    1,
    30
  );
  return Object.freeze({dates,deadlines});
}

export function extractFinancialData(textInput){
  const text=cleanText(textInput);
  const amounts=matchAll(
    text,
    /\b(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\s*(?:денари|ден\.?|евра|EUR|€))\b/giu,
    1,
    30
  );
  return Object.freeze({amounts});
}

export function classifyLegalDocument(textInput){
  const text=cleanText(textInput).toLocaleLowerCase("mk");
  const rules=[
    ["criminal_judgment",["обвинет","кривично дело","казна","јавен обвинител"]],
    ["civil_judgment",["тужител","тужен","тужбено барање","надомест"]],
    ["administrative_judgment",["управен спор","управен суд","управен акт"]],
    ["employment_dispute",["работен однос","работодавач","работник","отказ"]],
    ["contract",["договор","договорни страни","обврска","раскинување"]],
    ["legal_submission",["поднесок","предлага","барател","полномошник"]],
    ["decision",["решение","се одбива","се уважува","се отфрла"]]
  ];
  const scored=rules.map(([type,terms])=>({
    type,
    score:terms.reduce((n,t)=>n+(text.includes(t)?1:0),0),
    matched:terms.filter(t=>text.includes(t))
  })).sort((a,b)=>b.score-a.score);
  const top=scored[0];
  return Object.freeze({
    type:top.score>0?top.type:"unknown",
    matched:Object.freeze(top.matched),
    method:"deterministic_keyword_classification",
    statisticalConfidence:null
  });
}

export function extractPartiesAndAuthority(textInput){
  const text=cleanText(textInput);
  const authority=matchAll(
    text,
    /\b((?:Основен|Апелационен|Врховен|Управен|Виш управен|Уставен)\s+(?:кривичен\s+)?суд[^\n,.;]{0,60})/giu,
    1,
    5
  );
  const parties=unique([
    ...matchAll(text,/(?:тужител|обвинет|барател|оштетен)\s*[:\-]?\s*([^\n,;]{2,90})/giu),
    ...matchAll(text,/(?:тужен|обвинета|противник)\s*[:\-]?\s*([^\n,;]{2,90})/giu)
  ],20);
  return Object.freeze({authority,parties});
}

export function deterministicCompleteness(result){
  const checks=[
    ["document_type",result.documentType!=="unknown"],
    ["reference_number",result.identifiers.referenceNumbers.length>0 || result.identifiers.ecli.length>0],
    ["authority",result.authority.length>0],
    ["legal_reference",result.legalReferences.articles.length>0 || result.legalReferences.laws.length>0],
    ["date",result.temporal.dates.length>0]
  ];
  const passed=checks.filter(([,ok])=>ok).length;
  return Object.freeze({
    score:Math.round((passed/checks.length)*100),
    passed,
    total:checks.length,
    checks:Object.freeze(checks.map(([id,ok])=>Object.freeze({id,passed:Boolean(ok)}))),
    label:"deterministic_completeness",
    statisticalConfidence:null
  });
}

export function buildReviewRow({filename="document",text,sourceVerification="not_verified",humanGate="required"}={}){
  const clean=cleanText(text);
  const identifiers=extractOfficialIdentifiers(clean);
  const legalReferences=extractLegalReferences(clean);
  const temporal=extractTemporalData(clean);
  const financial=extractFinancialData(clean);
  const classification=classifyLegalDocument(clean);
  const {authority,parties}=extractPartiesAndAuthority(clean);

  const row={
    filename:String(filename||"document").slice(0,200),
    documentType:classification.type,
    authority,
    referenceNumber:identifiers.referenceNumbers[0]||identifiers.ecli[0]||null,
    decisionDate:temporal.dates[0]||null,
    parties,
    legalArea:null,
    laws:legalReferences.laws,
    articles:legalReferences.articles,
    operativePart:null,
    deadlines:temporal.deadlines,
    amounts:financial.amounts,
    remedy:null,
    issues:[],
    sourceVerification,
    humanGate,
    identifiers,
    legalReferences,
    temporal,
    financial,
    classification
  };
  row.completeness=deterministicCompleteness(row);
  return Object.freeze(row);
}

export function analyzeLegalDocument({filename="document",text,sourceVerification="not_verified"}={}){
  const clean=cleanText(text);
  const row=buildReviewRow({filename,text:clean,sourceVerification,humanGate:"required"});
  const paragraphs=clean.split(/\n{2,}/).map(v=>v.trim()).filter(Boolean);
  const sentences=clean.split(/[.!?]+\s+/).map(v=>v.trim()).filter(Boolean);

  return Object.freeze({
    version:LEGAL_ANALYZER_VERSION,
    document:Object.freeze({
      filename:row.filename,
      charCount:clean.length,
      wordCount:clean.split(/\s+/).filter(Boolean).length,
      paragraphCount:paragraphs.length,
      sentenceCount:sentences.length
    }),
    reviewRow:row,
    dimensions:LEGAL_ANALYZER_DIMENSIONS,
    provenance:Object.freeze({
      sourceVerification,
      extractedFromProvidedText:true,
      generatedOfficialIdentifier:false
    }),
    humanGate:Object.freeze({
      required:true,
      professionalUse:"locked_until_human_review"
    })
  });
}

export function buildReviewTable(documents=[]){
  if(!Array.isArray(documents)) throw new TypeError("legal_analyzer_documents_array_required");
  if(documents.length>100) throw new TypeError("legal_analyzer_batch_limit_exceeded");
  const rows=documents.map((d,i)=>buildReviewRow({
    filename:d?.filename||`document-${i+1}`,
    text:d?.text,
    sourceVerification:d?.sourceVerification||"not_verified",
    humanGate:"required"
  }));
  return Object.freeze({
    version:LEGAL_ANALYZER_VERSION,
    columns:REVIEW_TABLE_DEFAULT_COLUMNS,
    rows:Object.freeze(rows),
    humanGateRequired:true
  });
}
