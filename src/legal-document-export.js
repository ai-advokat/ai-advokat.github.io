// AI Advokat Legal Document Export V1 (PR-B).
// Pure domain/adapter layer over the existing CasePilot export contract.
// It does not add an API route, persistence, provider call, filing action, signature,
// production activation, or PR-C professional DOCX styling.

import {
  normalizeCaseExportReport,
  renderCaseExportDocxBytes,
  caseExportBlocks
} from "./case-export.js";

export const LEGAL_DOCUMENT_AST_VERSION="1.0.0";
export const LEGAL_DOCUMENT_EXPORT_VERSION="1.0.0";
export const LEGAL_DOCUMENT_EXPORT_MODES=Object.freeze(["working","professional"]);

export const LEGAL_DOCUMENT_FACT_STATUSES=Object.freeze([
  "supported",
  "disputed",
  "unverified",
  "missing"
]);
export const LEGAL_DOCUMENT_LEGAL_BASIS_STATUSES=Object.freeze([
  "verified",
  "unverified",
  "review_required"
]);
export const LEGAL_DOCUMENT_CONTRADICTION_STATUSES=Object.freeze([
  "unresolved",
  "resolved"
]);
export const LEGAL_DOCUMENT_PETITUM_STATUSES=Object.freeze([
  "draft",
  "approved"
]);
export const LEGAL_DOCUMENT_ARGUMENT_STATUSES=Object.freeze([
  "working",
  "approved"
]);
export const LEGAL_DOCUMENT_EVIDENCE_VERIFICATION=Object.freeze([
  "verified",
  "unverified"
]);

const CONTROL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const ID=/^[A-Za-z0-9._:-]+$/;
const MAX_LIST=250;

function cleanText(value,{label="text",max=5000,required=false}={}){
  if(value===undefined||value===null||value===""){
    if(required) throw new Error("legal_document_"+label+"_required");
    return "";
  }
  if(typeof value!=="string") throw new Error("legal_document_"+label+"_invalid");
  const text=value.normalize("NFKC").trim();
  if(required&&!text) throw new Error("legal_document_"+label+"_required");
  if(text.length>max||CONTROL.test(text)) throw new Error("legal_document_"+label+"_invalid");
  return text;
}

function cleanId(value,label="id"){
  const out=cleanText(String(value??""),{label,max:120,required:true});
  if(!ID.test(out)) throw new Error("legal_document_"+label+"_invalid");
  return out;
}

function cleanBool(value,defaultValue=true){
  return value===undefined ? defaultValue : value===true;
}

function cleanList(value,label){
  if(value===undefined||value===null) return [];
  if(!Array.isArray(value)||value.length>MAX_LIST) throw new Error("legal_document_"+label+"_invalid");
  return value;
}

function cleanTimestamp(value,label){
  const text=cleanText(value,{label,max:48,required:true});
  const time=Date.parse(text);
  if(!Number.isFinite(time)) throw new Error("legal_document_"+label+"_invalid");
  return new Date(time).toISOString();
}

function cleanSha(value,label="source_sha256"){
  if(value===undefined||value===null||value==="") return "";
  const sha=cleanText(value,{label,max:64,required:true}).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(sha)) throw new Error("legal_document_"+label+"_invalid");
  return sha;
}

function uniqueIds(items,label){
  const seen=new Set();
  for(const item of items){
    if(seen.has(item.id)) throw new Error("legal_document_duplicate_"+label+"_id");
    seen.add(item.id);
  }
}

function normalizeHumanGate(value){
  const source=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const status=cleanText(source.status||"pending",{label:"human_gate_status",max:32,required:true}).toLowerCase();
  if(!["pending","approved","rejected"].includes(status)) throw new Error("legal_document_human_gate_status_invalid");
  const reviewer=cleanText(source.reviewer,{label:"human_gate_reviewer",max:180});
  const decidedAt=source.decidedAt?cleanTimestamp(source.decidedAt,"human_gate_decided_at"):"";
  const decisionRef=cleanText(source.decisionRef,{label:"human_gate_decision_ref",max:180});
  return Object.freeze({status,reviewer,decidedAt,decisionRef});
}

function normalizeSource(value,label,{required=true}={}){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    if(required) throw new Error("legal_document_"+label+"_source_required");
    return null;
  }
  const verificationStatus=cleanText(value.verificationStatus||"unverified",{
    label:label+"_source_verification_status",max:32,required:true
  }).toLowerCase();
  if(!["verified","unverified"].includes(verificationStatus)){
    throw new Error("legal_document_"+label+"_source_verification_status_invalid");
  }
  return Object.freeze({
    id:cleanId(value.id,label+"_source_id"),
    title:cleanText(value.title,{label:label+"_source_title",max:240,required:true}),
    locator:cleanText(value.locator,{label:label+"_source_locator",max:240}),
    version:cleanText(value.version,{label:label+"_source_version",max:120}),
    sha256:cleanSha(value.sha256,label+"_source_sha256"),
    verificationStatus
  });
}

function normalizeParty(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_party_invalid");
  return Object.freeze({
    id:cleanId(value.id,"party_id"),
    role:cleanText(value.role,{label:"party_role",max:80,required:true}),
    name:cleanText(value.name,{label:"party_name",max:240,required:true}),
    identifier:cleanText(value.identifier,{label:"party_identifier",max:180})
  });
}

function normalizeFact(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_fact_invalid");
  const status=cleanText(value.status||"unverified",{label:"fact_status",max:32,required:true}).toLowerCase();
  if(!LEGAL_DOCUMENT_FACT_STATUSES.includes(status)) throw new Error("legal_document_fact_status_invalid");
  return Object.freeze({
    id:cleanId(value.id,"fact_id"),
    text:cleanText(value.text,{label:"fact_text",max:5000,required:true}),
    status,
    requiredForProfessional:cleanBool(value.requiredForProfessional,true),
    evidenceIds:Object.freeze(cleanList(value.evidenceIds,"fact_evidence_ids").map(v=>cleanId(v,"evidence_id")))
  });
}

function normalizeEvidence(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_evidence_invalid");
  const verificationStatus=cleanText(value.verificationStatus||"unverified",{
    label:"evidence_verification_status",max:32,required:true
  }).toLowerCase();
  if(!LEGAL_DOCUMENT_EVIDENCE_VERIFICATION.includes(verificationStatus)){
    throw new Error("legal_document_evidence_verification_status_invalid");
  }
  const analysis=value.analysis&&typeof value.analysis==="object"&&!Array.isArray(value.analysis)?value.analysis:null;
  if(!analysis) throw new Error("legal_document_evidence_analysis_required");
  return Object.freeze({
    id:cleanId(value.id,"evidence_id"),
    title:cleanText(value.title,{label:"evidence_title",max:300,required:true}),
    description:cleanText(value.description,{label:"evidence_description",max:5000}),
    verificationStatus,
    requiredForProfessional:cleanBool(value.requiredForProfessional,true),
    source:normalizeSource(value.source,"evidence"),
    analysis:Object.freeze({
      proves:cleanText(analysis.proves,{label:"evidence_analysis_proves",max:5000,required:true}),
      doesNotProve:cleanText(analysis.doesNotProve,{label:"evidence_analysis_does_not_prove",max:5000,required:true}),
      verificationRequired:cleanText(analysis.verificationRequired,{
        label:"evidence_analysis_verification_required",max:5000,required:true
      })
    })
  });
}

function normalizeLegalBasis(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_legal_basis_invalid");
  const status=cleanText(value.status||"review_required",{label:"legal_basis_status",max:32,required:true}).toLowerCase();
  if(!LEGAL_DOCUMENT_LEGAL_BASIS_STATUSES.includes(status)){
    throw new Error("legal_document_legal_basis_status_invalid");
  }
  const citation=cleanText(value.citation,{label:"legal_basis_citation",max:500});
  const authority=normalizeSource(value.authority,"legal_basis_authority",{required:false});
  if(citation||authority){
    if(status!=="verified"||!authority||authority.verificationStatus!=="verified"){
      throw new Error("legal_document_unverified_authority_not_allowed");
    }
  }
  return Object.freeze({
    id:cleanId(value.id,"legal_basis_id"),
    proposition:cleanText(value.proposition,{label:"legal_basis_proposition",max:6000,required:true}),
    status,
    requiredForProfessional:cleanBool(value.requiredForProfessional,true),
    citation,
    authority
  });
}

function normalizeArgument(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_argument_invalid");
  const status=cleanText(value.status||"working",{label:"argument_status",max:32,required:true}).toLowerCase();
  if(!LEGAL_DOCUMENT_ARGUMENT_STATUSES.includes(status)) throw new Error("legal_document_argument_status_invalid");
  return Object.freeze({
    id:cleanId(value.id,"argument_id"),
    heading:cleanText(value.heading,{label:"argument_heading",max:300}),
    text:cleanText(value.text,{label:"argument_text",max:10000,required:true}),
    status,
    requiredForProfessional:cleanBool(value.requiredForProfessional,true),
    factIds:Object.freeze(cleanList(value.factIds,"argument_fact_ids").map(v=>cleanId(v,"fact_id"))),
    evidenceIds:Object.freeze(cleanList(value.evidenceIds,"argument_evidence_ids").map(v=>cleanId(v,"evidence_id"))),
    legalBasisIds:Object.freeze(cleanList(value.legalBasisIds,"argument_legal_basis_ids").map(v=>cleanId(v,"legal_basis_id")))
  });
}

function normalizeContradictionRef(value,label){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_"+label+"_invalid");
  const type=cleanText(value.type,{label:label+"_type",max:20,required:true}).toLowerCase();
  if(!["fact","evidence"].includes(type)) throw new Error("legal_document_"+label+"_type_invalid");
  return Object.freeze({type,id:cleanId(value.id,label+"_id")});
}

function normalizeContradiction(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_contradiction_invalid");
  const status=cleanText(value.status||"unresolved",{label:"contradiction_status",max:32,required:true}).toLowerCase();
  if(!LEGAL_DOCUMENT_CONTRADICTION_STATUSES.includes(status)){
    throw new Error("legal_document_contradiction_status_invalid");
  }
  let resolution=null;
  if(status==="resolved"){
    const r=value.resolution&&typeof value.resolution==="object"&&!Array.isArray(value.resolution)?value.resolution:null;
    if(!r) throw new Error("legal_document_contradiction_resolution_required");
    resolution=Object.freeze({
      text:cleanText(r.text,{label:"contradiction_resolution_text",max:5000,required:true}),
      reviewer:cleanText(r.reviewer,{label:"contradiction_resolution_reviewer",max:180,required:true}),
      decidedAt:cleanTimestamp(r.decidedAt,"contradiction_resolution_decided_at")
    });
  }
  return Object.freeze({
    id:cleanId(value.id,"contradiction_id"),
    summary:cleanText(value.summary,{label:"contradiction_summary",max:5000,required:true}),
    left:normalizeContradictionRef(value.left,"contradiction_left"),
    right:normalizeContradictionRef(value.right,"contradiction_right"),
    status,
    resolution
  });
}

function normalizePetitum(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_petitum_invalid");
  const status=cleanText(value.status||"draft",{label:"petitum_status",max:32,required:true}).toLowerCase();
  if(!LEGAL_DOCUMENT_PETITUM_STATUSES.includes(status)) throw new Error("legal_document_petitum_status_invalid");
  return Object.freeze({
    id:cleanId(value.id,"petitum_id"),
    text:cleanText(value.text,{label:"petitum_text",max:8000,required:true}),
    status,
    requiredForProfessional:cleanBool(value.requiredForProfessional,true)
  });
}

function normalizeAttachment(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_attachment_invalid");
  return Object.freeze({
    id:cleanId(value.id,"attachment_id"),
    title:cleanText(value.title,{label:"attachment_title",max:300,required:true}),
    evidenceId:cleanId(value.evidenceId,"attachment_evidence_id")
  });
}

function normalizeBlocker(value){
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("legal_document_blocker_invalid");
  const status=cleanText(value.status||"open",{label:"blocker_status",max:32,required:true}).toLowerCase();
  if(!["open","resolved"].includes(status)) throw new Error("legal_document_blocker_status_invalid");
  return Object.freeze({
    id:cleanId(value.id,"blocker_id"),
    kind:cleanText(value.kind,{label:"blocker_kind",max:80,required:true}),
    summary:cleanText(value.summary,{label:"blocker_summary",max:5000,required:true}),
    mandatory:cleanBool(value.mandatory,true),
    status,
    resolution:status==="resolved"
      ? cleanText(value.resolution,{label:"blocker_resolution",max:5000,required:true})
      : ""
  });
}

function refExists(ref,facts,evidence){
  return ref.type==="fact" ? facts.has(ref.id) : evidence.has(ref.id);
}

export function normalizeLegalDocumentAst(input){
  if(!input||typeof input!=="object"||Array.isArray(input)) throw new Error("legal_document_ast_required");
  if(input.version&&input.version!==LEGAL_DOCUMENT_AST_VERSION) throw new Error("legal_document_ast_version_invalid");

  const parties=cleanList(input.parties,"parties").map(normalizeParty);
  const facts=cleanList(input.facts,"facts").map(normalizeFact);
  const evidence=cleanList(input.evidence,"evidence").map(normalizeEvidence);
  const legalBases=cleanList(input.legalBases,"legal_bases").map(normalizeLegalBasis);
  const argumentsList=cleanList(input.arguments,"arguments").map(normalizeArgument);
  const contradictions=cleanList(input.contradictions,"contradictions").map(normalizeContradiction);
  const petitum=cleanList(input.petitum,"petitum").map(normalizePetitum);
  const attachments=cleanList(input.attachments,"attachments").map(normalizeAttachment);
  const blockers=cleanList(input.blockers,"blockers").map(normalizeBlocker);

  uniqueIds(parties,"party");
  uniqueIds(facts,"fact");
  uniqueIds(evidence,"evidence");
  uniqueIds(legalBases,"legal_basis");
  uniqueIds(argumentsList,"argument");
  uniqueIds(contradictions,"contradiction");
  uniqueIds(petitum,"petitum");
  uniqueIds(attachments,"attachment");
  uniqueIds(blockers,"blocker");

  const factById=new Map(facts.map(x=>[x.id,x]));
  const evidenceById=new Map(evidence.map(x=>[x.id,x]));
  const legalById=new Map(legalBases.map(x=>[x.id,x]));

  for(const fact of facts){
    for(const evidenceId of fact.evidenceIds){
      if(!evidenceById.has(evidenceId)) throw new Error("legal_document_fact_evidence_not_found");
    }
  }
  for(const arg of argumentsList){
    for(const factId of arg.factIds) if(!factById.has(factId)) throw new Error("legal_document_argument_fact_not_found");
    for(const evidenceId of arg.evidenceIds) if(!evidenceById.has(evidenceId)) throw new Error("legal_document_argument_evidence_not_found");
    for(const legalBasisId of arg.legalBasisIds) if(!legalById.has(legalBasisId)) throw new Error("legal_document_argument_legal_basis_not_found");
  }
  for(const contradiction of contradictions){
    if(!refExists(contradiction.left,factById,evidenceById)||!refExists(contradiction.right,factById,evidenceById)){
      throw new Error("legal_document_contradiction_ref_not_found");
    }
  }
  for(const attachment of attachments){
    if(!evidenceById.has(attachment.evidenceId)) throw new Error("legal_document_attachment_evidence_not_found");
  }

  return Object.freeze({
    version:LEGAL_DOCUMENT_AST_VERSION,
    exportVersion:LEGAL_DOCUMENT_EXPORT_VERSION,
    caseId:cleanId(input.caseId,"case_id"),
    documentId:cleanId(input.documentId||"LEGAL-DOC-1","document_id"),
    caseVersion:cleanText(input.caseVersion||"0.1",{label:"case_version",max:80,required:true}),
    generatedAt:input.generatedAt?cleanTimestamp(input.generatedAt,"generated_at"):new Date().toISOString(),
    documentType:cleanText(input.documentType||"legal_pleading",{label:"document_type",max:120,required:true}),
    title:cleanText(input.title,{label:"title",max:300,required:true}),
    court:cleanText(input.court,{label:"court",max:300}),
    summary:cleanText(input.summary,{label:"summary",max:12000}),
    parties:Object.freeze(parties),
    facts:Object.freeze(facts),
    evidence:Object.freeze(evidence),
    legalBases:Object.freeze(legalBases),
    arguments:Object.freeze(argumentsList),
    contradictions:Object.freeze(contradictions),
    petitum:Object.freeze(petitum),
    attachments:Object.freeze(attachments),
    blockers:Object.freeze(blockers),
    humanGate:normalizeHumanGate(input.humanGate)
  });
}

function gateComplete(gate){
  return gate.status==="approved"&&Boolean(gate.reviewer)&&Boolean(gate.decidedAt)&&Boolean(gate.decisionRef);
}

function blocker(code,objectId,summary){
  return Object.freeze({code,objectId,summary});
}

export function legalDocumentReadiness(astInput,{serverHumanGate=null}={}){
  const ast=astInput?.version===LEGAL_DOCUMENT_AST_VERSION?astInput:normalizeLegalDocumentAst(astInput);
  const gate=normalizeHumanGate(serverHumanGate||ast.humanGate);
  const blockers=[];

  const resolvedFactRefs=new Set();
  for(const contradiction of ast.contradictions){
    if(contradiction.status==="unresolved"){
      blockers.push(blocker("unresolved_contradiction",contradiction.id,contradiction.summary));
    }else{
      if(contradiction.left.type==="fact") resolvedFactRefs.add(contradiction.left.id);
      if(contradiction.right.type==="fact") resolvedFactRefs.add(contradiction.right.id);
    }
  }

  for(const fact of ast.facts){
    if(!fact.requiredForProfessional) continue;
    if(fact.status==="unverified"||fact.status==="missing"){
      blockers.push(blocker("material_fact_not_ready",fact.id,fact.text));
    }
    if(fact.status==="disputed"&&!resolvedFactRefs.has(fact.id)){
      blockers.push(blocker("material_fact_dispute_unresolved",fact.id,fact.text));
    }
  }

  for(const evidence of ast.evidence){
    if(evidence.requiredForProfessional&&evidence.verificationStatus!=="verified"){
      blockers.push(blocker("evidence_not_verified",evidence.id,evidence.title));
    }
  }
  for(const basis of ast.legalBases){
    if(basis.requiredForProfessional&&basis.status!=="verified"){
      blockers.push(blocker("legal_basis_not_verified",basis.id,basis.proposition));
    }
  }
  for(const arg of ast.arguments){
    if(arg.requiredForProfessional&&arg.status!=="approved"){
      blockers.push(blocker("argument_not_approved",arg.id,arg.heading||arg.text.slice(0,160)));
    }
  }
  for(const item of ast.petitum){
    if(item.requiredForProfessional&&item.status!=="approved"){
      blockers.push(blocker("petitum_not_approved",item.id,item.text.slice(0,200)));
    }
  }
  for(const item of ast.blockers){
    if(item.mandatory&&item.status!=="resolved"){
      blockers.push(blocker("mandatory_blocker_open",item.id,item.summary));
    }
  }
  if(!gateComplete(gate)){
    blockers.push(blocker("human_gate_not_approved","human-gate","Recorded Human Gate approval is required."));
  }

  return Object.freeze({
    exportVersion:LEGAL_DOCUMENT_EXPORT_VERSION,
    professionalReady:blockers.length===0,
    blockers:Object.freeze(blockers),
    humanGate:gate
  });
}

function exportSource(source){
  return {
    id:source.id,
    title:source.title,
    locator:source.locator,
    version:source.version,
    sha256:source.sha256
  };
}

function sourceRef(source){
  return {id:source.id,title:source.title,locator:source.locator};
}

function sourceManifest(ast){
  const byId=new Map();
  const add=source=>{
    if(!source) return;
    const current=byId.get(source.id);
    const normalized=exportSource(source);
    if(current&&JSON.stringify(current)!==JSON.stringify(normalized)){
      throw new Error("legal_document_source_id_collision");
    }
    byId.set(source.id,normalized);
  };
  for(const evidence of ast.evidence) add(evidence.source);
  for(const basis of ast.legalBases) if(basis.authority) add(basis.authority);
  return [...byId.values()];
}

function factProvenance(ast,evidenceById){
  const out=[];
  for(const fact of ast.facts){
    for(const evidenceId of fact.evidenceIds){
      const evidence=evidenceById.get(evidenceId);
      out.push({
        claimId:fact.id,
        sourceId:evidence.source.id,
        locator:evidence.source.locator,
        note:"fact_status:"+fact.status+"; evidence:"+evidence.id
      });
    }
  }
  return out;
}

function item({heading="",text,status="",sources=[]}){
  return {heading,text,status,sources:sources.filter(Boolean)};
}

function courtSections(ast){
  const evidenceById=new Map(ast.evidence.map(x=>[x.id,x]));
  const legalById=new Map(ast.legalBases.map(x=>[x.id,x]));
  const sections=[];

  if(ast.parties.length||ast.court){
    sections.push({
      id:"court-and-parties",
      title:"Суд и странки",
      items:[
        ...(ast.court?[item({heading:"Суд",text:ast.court,status:"WORKING"})]:[]),
        ...ast.parties.map(p=>item({
          heading:p.role,
          text:[p.name,p.identifier].filter(Boolean).join(" · "),
          status:"WORKING"
        }))
      ]
    });
  }

  sections.push({
    id:"facts",
    title:"Фактичка основа",
    items:ast.facts.map(f=>item({
      heading:f.id,
      text:f.text,
      status:f.status.toUpperCase(),
      sources:f.evidenceIds.map(id=>sourceRef(evidenceById.get(id).source))
    }))
  });

  sections.push({
    id:"evidence-proposals",
    title:"Доказни предлози",
    items:ast.evidence.map(e=>item({
      heading:e.title,
      text:["Доказна цел: "+e.analysis.proves,e.description].filter(Boolean).join("\n"),
      status:e.verificationStatus.toUpperCase(),
      sources:[sourceRef(e.source)]
    }))
  });

  sections.push({
    id:"legal-arguments",
    title:"Правна аргументација",
    items:ast.arguments.map(a=>{
      const sources=[];
      for(const id of a.evidenceIds) sources.push(sourceRef(evidenceById.get(id).source));
      for(const id of a.legalBasisIds){
        const basis=legalById.get(id);
        if(basis.authority) sources.push(sourceRef(basis.authority));
      }
      return item({heading:a.heading||a.id,text:a.text,status:a.status.toUpperCase(),sources});
    })
  });

  const verifiedBases=ast.legalBases.filter(x=>x.status==="verified");
  sections.push({
    id:"legal-bases",
    title:"Правна основа",
    items:verifiedBases.length
      ? verifiedBases.map(b=>item({
          heading:b.citation||b.id,
          text:b.proposition,
          status:"VERIFIED",
          sources:b.authority?[sourceRef(b.authority)]:[]
        }))
      : [item({
          heading:"Правна основа",
          text:"Нема потврдена правна основа за вклучување во судскиот документ. Непотврдените правни прашања се задржани во Review Annex.",
          status:"REVIEW_REQUIRED"
        })]
  });

  sections.push({
    id:"petitum",
    title:"Тужбено барање",
    items:ast.petitum.map(p=>item({
      heading:p.id,
      text:p.text,
      status:p.status.toUpperCase()
    }))
  });

  sections.push({
    id:"attachments",
    title:"Прилози",
    items:ast.attachments.map(a=>item({
      heading:a.id,
      text:a.title,
      status:"ATTACHMENT",
      sources:[sourceRef(evidenceById.get(a.evidenceId).source)]
    }))
  });

  return sections;
}

function reviewSections(ast,readiness){
  return [
    {
      id:"evidence-analysis",
      title:"Доказна анализа",
      items:ast.evidence.map(e=>item({
        heading:e.id+" · "+e.title,
        text:[
          "Што поткрепува: "+e.analysis.proves,
          "Што не докажува: "+e.analysis.doesNotProve,
          "Што мора да се провери: "+e.analysis.verificationRequired
        ].join("\n"),
        status:e.verificationStatus.toUpperCase(),
        sources:[sourceRef(e.source)]
      }))
    },
    {
      id:"contradictions",
      title:"Противречности",
      items:ast.contradictions.map(c=>item({
        heading:c.id,
        text:[
          c.summary,
          "Лева референца: "+c.left.type+":"+c.left.id,
          "Десна референца: "+c.right.type+":"+c.right.id,
          c.resolution?"Разрешување: "+c.resolution.text:"Разрешување: НЕРАЗРЕШЕНО"
        ].join("\n"),
        status:c.status.toUpperCase()
      }))
    },
    {
      id:"legal-basis-review",
      title:"Правни основи за проверка",
      items:ast.legalBases.map(b=>item({
        heading:b.id,
        text:[
          b.proposition,
          b.citation?"Потврдена цитирана основа: "+b.citation:null,
          b.status!=="verified"?"Нема дозвола за авторитативно цитирање пред проверка на официјален извор.":null
        ].filter(Boolean).join("\n"),
        status:b.status.toUpperCase(),
        sources:b.authority?[sourceRef(b.authority)]:[]
      }))
    },
    {
      id:"petitum-review",
      title:"Петитум — редакциска контрола",
      items:ast.petitum.map(p=>item({
        heading:p.id,
        text:p.text,
        status:p.status.toUpperCase()
      }))
    },
    {
      id:"professional-blockers",
      title:"PROFESSIONAL blockers",
      items:readiness.blockers.length
        ? readiness.blockers.map(b=>item({
            heading:b.code+" · "+b.objectId,
            text:b.summary,
            status:"BLOCK"
          }))
        : [item({heading:"Readiness",text:"Нема отворени задолжителни blockers.",status:"READY"})]
    }
  ];
}

function buildReports(ast,mode,gate,readiness){
  const evidenceById=new Map(ast.evidence.map(x=>[x.id,x]));
  const manifest=sourceManifest(ast);
  const provenance=factProvenance(ast,evidenceById);

  const courtReport=normalizeCaseExportReport({
    caseId:ast.caseId,
    title:ast.title,
    caseVersion:ast.caseVersion+"-court",
    generatedAt:ast.generatedAt,
    summary:ast.summary,
    sections:courtSections(ast),
    sourceManifest:manifest,
    provenance,
    humanGate:gate
  },{mode,serverHumanGate:gate});

  const reviewAnnexReport=normalizeCaseExportReport({
    caseId:ast.caseId,
    title:ast.title+" — INTERNAL REVIEW ANNEX",
    caseVersion:ast.caseVersion+"-review",
    generatedAt:ast.generatedAt,
    summary:"INTERNAL REVIEW ANNEX — NOT FOR FILING. Овој документ ги содржи доказните ограничувања, противречностите, непроверените правни основи и PROFESSIONAL blockers.",
    sections:reviewSections(ast,readiness),
    sourceManifest:manifest,
    provenance,
    humanGate:gate
  },{mode:"working",serverHumanGate:gate});

  return {courtReport,reviewAnnexReport};
}

export function legalDocumentExportBundle(astInput,{mode="working",serverHumanGate=null}={}){
  if(!LEGAL_DOCUMENT_EXPORT_MODES.includes(mode)) throw new Error("legal_document_export_mode_invalid");
  const ast=astInput?.version===LEGAL_DOCUMENT_AST_VERSION?astInput:normalizeLegalDocumentAst(astInput);
  const readiness=legalDocumentReadiness(ast,{serverHumanGate});
  if(mode==="professional"&&!readiness.professionalReady){
    throw new Error("legal_document_professional_blocked");
  }
  const reports=buildReports(ast,mode,readiness.humanGate,readiness);
  return Object.freeze({
    exportVersion:LEGAL_DOCUMENT_EXPORT_VERSION,
    mode,
    ast,
    readiness,
    courtReport:reports.courtReport,
    reviewAnnexReport:reports.reviewAnnexReport
  });
}

export function renderLegalDocumentDocxBundle(astInput,options={}){
  const bundle=legalDocumentExportBundle(astInput,options);
  return Object.freeze({
    ...bundle,
    courtDocument:renderCaseExportDocxBytes(bundle.courtReport),
    reviewAnnex:renderCaseExportDocxBytes(bundle.reviewAnnexReport)
  });
}

export function legalDocumentVisualControl(astInput,options={}){
  const bundle=legalDocumentExportBundle(astInput,options);
  const court=caseExportBlocks(bundle.courtReport);
  const review=caseExportBlocks(bundle.reviewAnnexReport);
  const courtText=court.map(x=>x.text).join("\n");
  const reviewText=review.map(x=>x.text).join("\n");
  return Object.freeze({
    warningFirst:court[1]?.kind==="warning",
    courtHasFacts:courtText.includes("Фактичка основа"),
    courtHasPetitum:courtText.includes("Тужбено барање"),
    courtHasAttachments:courtText.includes("Прилози"),
    courtContainsInternalReviewAnnex:courtText.includes("INTERNAL REVIEW ANNEX"),
    reviewContainsInternalReviewAnnex:reviewText.includes("INTERNAL REVIEW ANNEX"),
    reviewHasContradictions:reviewText.includes("Противречности"),
    reviewHasBlockers:reviewText.includes("PROFESSIONAL blockers")
  });
}
