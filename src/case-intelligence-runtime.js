// AI Advokat private case document intelligence contract v1.
// Private derived artifacts only. Never public corpus material.

export const CASE_INTELLIGENCE_PROVIDER_MAX_BYTES=15*1024*1024;

export const CASE_DOCUMENT_EXTRACTION_SCHEMA=Object.freeze({
  type:"object",
  additionalProperties:false,
  properties:{
    document_type:{type:"string"},
    summary:{type:"string"},
    entities:{
      type:"array",maxItems:80,
      items:{
        type:"object",additionalProperties:false,
        properties:{
          name:{type:"string"},
          role:{type:"string"},
          page:{type:["integer","null"]},
          locator:{type:["string","null"]}
        },
        required:["name","role","page","locator"]
      }
    },
    dates:{
      type:"array",maxItems:80,
      items:{
        type:"object",additionalProperties:false,
        properties:{
          date:{type:["string","null"]},
          text:{type:"string"},
          page:{type:["integer","null"]},
          locator:{type:["string","null"]}
        },
        required:["date","text","page","locator"]
      }
    },
    property_refs:{
      type:"array",maxItems:80,
      items:{
        type:"object",additionalProperties:false,
        properties:{
          cadastral_municipality:{type:["string","null"]},
          parcel:{type:["string","null"]},
          property_sheet:{type:["string","null"]},
          share:{type:["string","null"]},
          text:{type:"string"},
          page:{type:["integer","null"]},
          locator:{type:["string","null"]}
        },
        required:["cadastral_municipality","parcel","property_sheet","share","text","page","locator"]
      }
    },
    contracts:{
      type:"array",maxItems:50,
      items:{
        type:"object",additionalProperties:false,
        properties:{
          contract_type:{type:"string"},
          parties:{type:"array",maxItems:20,items:{type:"string"}},
          date:{type:["string","null"]},
          subject:{type:"string"},
          page:{type:["integer","null"]},
          locator:{type:["string","null"]}
        },
        required:["contract_type","parties","date","subject","page","locator"]
      }
    },
    facts:{
      type:"array",maxItems:120,
      items:{
        type:"object",additionalProperties:false,
        properties:{
          id:{type:"string"},
          text:{type:"string"},
          fact_type:{type:"string"},
          material:{type:"boolean"},
          status:{type:"string",enum:["source_confirmed","source_indication","disputed","professional_review_required"]},
          page:{type:["integer","null"]},
          locator:{type:["string","null"]}
        },
        required:["id","text","fact_type","material","status","page","locator"]
      }
    },
    legal_issue_hints:{type:"array",maxItems:30,items:{type:"string"}},
    missing_context:{type:"array",maxItems:30,items:{type:"string"}},
    extraction_warnings:{type:"array",maxItems:30,items:{type:"string"}}
  },
  required:[
    "document_type","summary","entities","dates","property_refs","contracts",
    "facts","legal_issue_hints","missing_context","extraction_warnings"
  ]
});

function clean(value,max=4000){
  if(value===null||value===undefined) return null;
  const v=String(value).normalize("NFKC").trim();
  return v ? v.slice(0,max) : null;
}

function validLocator(item){
  const page=item?.page;
  const locator=clean(item?.locator,240);
  return (Number.isInteger(page)&&page>0) || !!locator;
}

export function validateCaseDocumentExtraction(value){
  const errors=[];
  if(!value||typeof value!=="object"||Array.isArray(value)) return {ok:false,errors:["extraction_object_required"]};
  if(!clean(value.document_type,120)) errors.push("document_type_required");
  if(!clean(value.summary,5000)) errors.push("summary_required");
  for(const key of ["entities","dates","property_refs","contracts","facts","legal_issue_hints","missing_context","extraction_warnings"]){
    if(!Array.isArray(value[key])) errors.push(key+"_array_required");
  }
  for(const fact of Array.isArray(value.facts)?value.facts:[]){
    if(!clean(fact?.id,120)) errors.push("fact_id_required");
    if(!clean(fact?.text,2400)) errors.push("fact_text_required");
    if(!["source_confirmed","source_indication","disputed","professional_review_required"].includes(fact?.status)) errors.push("fact_status_invalid");
    if(!validLocator(fact)) errors.push("fact_locator_required");
  }
  return {ok:errors.length===0,errors};
}

export function caseDocumentExtractionPrompt({documentId,fileName,mimeType}={}){
  return [
    "You are AI Advokat Document Intelligence. Extract only what is supported by the attached private document.",
    "Do not use model memory to add missing facts. Do not infer ownership, validity, legal effect, kinship, authenticity or enforceability unless the document expressly establishes it.",
    "Preserve names, dates, cadastral identifiers, property-sheet numbers, parcel numbers, shares, contract parties and document references exactly where legible.",
    "Every material fact must include a page number when the source format has stable pages. If a stable page is not available, provide a precise locator and use professional_review_required when appropriate.",
    "If text is ambiguous, illegible or internally inconsistent, use source_indication/disputed/professional_review_required and add an extraction warning.",
    "legal_issue_hints are routing hints only, never conclusions of law.",
    "DOCUMENT_ID: "+String(documentId||""),
    "FILE_NAME: "+String(fileName||""),
    "MIME_TYPE: "+String(mimeType||"")
  ].join("\n");
}

export function compactExtractionContext(documentId,extraction){
  const facts=(Array.isArray(extraction?.facts)?extraction.facts:[])
    .filter(f=>f&&typeof f.text==="string")
    .slice(0,120)
    .map(f=>`[${documentId}:${f.id}] ${f.status} · ${f.page?"p."+f.page:(f.locator||"locator unavailable")} · ${f.text}`);
  const issues=(Array.isArray(extraction?.legal_issue_hints)?extraction.legal_issue_hints:[]).slice(0,30);
  const gaps=(Array.isArray(extraction?.missing_context)?extraction.missing_context:[]).slice(0,30);
  return [
    `DOCUMENT ${documentId}`,
    `TYPE: ${clean(extraction?.document_type,160)||"unknown"}`,
    `SUMMARY: ${clean(extraction?.summary,3000)||""}`,
    "FACTS:",
    facts.join("\n")||"NONE",
    "LEGAL ISSUE HINTS:",
    issues.join(" | ")||"NONE",
    "MISSING CONTEXT:",
    gaps.join(" | ")||"NONE"
  ].join("\n");
}
