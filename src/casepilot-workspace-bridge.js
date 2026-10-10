// AI Advokat CasePilot <-> Secure Case Workspace bridge v1.
// This bridge exposes only metadata and document-slot provenance needed to create
// a CasePilot matter shell. It never exposes file bytes or extracted private text.

import {
  CASEPILOT_MATTER_VERSION,
  createMatter,
  documentRecord,
  addMatterObject
} from "./casepilot-matter.js";

export const CASEPILOT_WORKSPACE_BRIDGE_VERSION="1.0.0";

function safeText(value,max=240){
  if(value===undefined||value===null) return null;
  const text=String(value).normalize("NFKC").trim();
  return text ? text.slice(0,max) : null;
}

function validSha(value){
  return typeof value==="string" && /^[a-f0-9]{64}$/i.test(value);
}

export function slotEligibleForCasePilot(slot){
  if(!slot||typeof slot!=="object") return false;
  if(typeof slot.id!=="string"||!slot.id.trim()) return false;
  if(!validSha(slot.sha256)) return false;
  if(!Number.isInteger(Number(slot.page_count))||Number(slot.page_count)<1) return false;
  return true;
}

export function mapWorkspaceToCasePilotShell(workspace,slots=[]){
  if(!workspace||typeof workspace!=="object") throw new TypeError("casepilot_workspace_required");
  if(!workspace.id) throw new TypeError("casepilot_workspace_id_required");
  if(!workspace.title) throw new TypeError("casepilot_workspace_title_required");
  if(!Array.isArray(slots)) throw new TypeError("casepilot_workspace_slots_array_required");

  let matter=createMatter({
    matterId:String(workspace.id),
    title:String(workspace.title),
    legalArea:safeText(workspace.legal_area||workspace.legalArea,160),
    phase:null,
    perspective:null,
    version:"0.1"
  });

  const rejected=[];
  for(const slot of slots){
    if(!slotEligibleForCasePilot(slot)){
      rejected.push({
        id:safeText(slot?.id,120),
        slotNumber:Number(slot?.slot_number)||null,
        reason:"document_slot_not_ready_for_source_linking"
      });
      continue;
    }

    const record=documentRecord({
      id:String(slot.id),
      title:safeText(slot.original_name,240)||`Документ ${Number(slot.slot_number)||""}`.trim(),
      sha256:String(slot.sha256),
      pageCount:Number(slot.page_count),
      sourceType:"secure_case_workspace_document"
    });
    matter=addMatterObject(matter,"documents",record);
  }

  const professionalLocked=Number(workspace.professional_use_locked)!==0;
  const storageStates=slots.reduce((acc,slot)=>{
    const key=String(slot?.storage_state||"unknown");
    acc[key]=(acc[key]||0)+1;
    return acc;
  },{});
  const extractionStates=slots.reduce((acc,slot)=>{
    const key=String(slot?.extraction_state||"unknown");
    acc[key]=(acc[key]||0)+1;
    return acc;
  },{});

  return Object.freeze({
    bridgeVersion:CASEPILOT_WORKSPACE_BRIDGE_VERSION,
    matterVersion:CASEPILOT_MATTER_VERSION,
    caseId:String(workspace.id),
    matter,
    sourceRegistry:Object.freeze(matter.objects.documents.map(d=>Object.freeze({
      sourceId:d.id,
      title:d.title,
      sha256:d.sha256,
      pageCount:d.pageCount
    }))),
    rejectedSlots:Object.freeze(rejected.map(x=>Object.freeze(x))),
    runtime:Object.freeze({
      confidentialityClass:safeText(workspace.confidentiality_class||workspace.confidentialityClass,80)||"private_legal",
      professionalUseLocked:professionalLocked,
      documentCount:slots.length,
      casePilotSourceCount:matter.objects.documents.length,
      storageStates:Object.freeze({...storageStates}),
      extractionStates:Object.freeze({...extractionStates})
    }),
    privacy:Object.freeze({
      fileBytesExposed:false,
      extractedTextExposed:false,
      documentBodyStoredByBridge:false,
      metadataOnly:true
    }),
    humanGate:Object.freeze({
      required:true,
      professionalUseLocked:professionalLocked
    })
  });
}
