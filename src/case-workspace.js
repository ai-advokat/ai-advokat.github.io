// AI Advokat Secure Case Workspace v1.
// Private case metadata only. File bytes remain in a separately governed object-store layer.

export const CASE_WORKSPACE_VERSION="1.0.0";
export const CASE_WORKSPACE_DOCUMENT_LIMIT=20;
export const CASE_WORKSPACE_ALLOWED_PLANS=Object.freeze(["trial_pro","pro","office"]);
export const CASE_WORKSPACE_ROLES=Object.freeze(["owner","lawyer","reviewer"]);
export const CASE_WORKSPACE_STATUSES=Object.freeze(["active","closed","delete_pending","deleted"]);

const CONTROL=/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;

function cleanOptional(value,max){
  if(value===undefined || value===null || value==="") return null;
  if(typeof value!=="string") throw new TypeError("case_workspace_invalid_text");
  const text=value.normalize("NFKC").trim();
  if(!text) return null;
  if(text.length>max || CONTROL.test(text)) throw new TypeError("case_workspace_invalid_text");
  return text;
}

export function caseWorkspacePlanAllowed(planCode){
  return CASE_WORKSPACE_ALLOWED_PLANS.includes(String(planCode||""));
}

export function validateCaseWorkspaceCreate(payload){
  const errors=[];
  if(!payload || typeof payload!=="object" || Array.isArray(payload)) return {ok:false,errors:["payload_required"]};
  const allowed=new Set(["title","clientReference","legalArea","retentionUntil"]);
  for(const key of Object.keys(payload)) if(!allowed.has(key)) errors.push("unexpected_field:"+key);

  let title=null,clientReference=null,legalArea=null,retentionUntil=null;
  try{
    title=cleanOptional(payload.title,180);
    clientReference=cleanOptional(payload.clientReference,120);
    legalArea=cleanOptional(payload.legalArea,120);
    retentionUntil=cleanOptional(payload.retentionUntil,40);
  }catch{
    errors.push("invalid_text");
  }
  if(!title) errors.push("title_required");
  if(retentionUntil && !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z)?$/.test(retentionUntil)){
    errors.push("invalid_retention_until");
  }
  return {ok:errors.length===0,errors,value:{title,clientReference,legalArea,retentionUntil}};
}

export function caseWorkspaceId(value){
  const id=String(value||"").trim();
  return /^CASE-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

export function caseWorkspaceStorageReady(env){
  const b=env?.CASE_FILES;
  return !!b
    && typeof b.put==="function"
    && typeof b.get==="function"
    && typeof b.delete==="function";
}

export function caseWorkspaceRuntimeState(env,{schemaReady=false}={}){
  if(env?.CASE_WORKSPACE_ENABLED!=="true") return "locked";
  if(!schemaReady) return "schema_not_ready";
  return caseWorkspaceStorageReady(env) ? "workspace_and_storage_ready" : "workspace_ready_storage_locked";
}

export function safeCaseWorkspaceView(row,role="owner"){
  return Object.freeze({
    id:String(row.id),
    title:String(row.title),
    clientReference:row.client_reference||null,
    legalArea:row.legal_area||null,
    status:String(row.status),
    confidentialityClass:String(row.confidentiality_class||"private_legal"),
    documentLimit:Number(row.document_limit||CASE_WORKSPACE_DOCUMENT_LIMIT),
    professionalUseLocked:Number(row.professional_use_locked)!==0,
    retentionUntil:row.retention_until||null,
    deleteRequestedAt:row.delete_requested_at||null,
    role,
    createdAt:row.created_at||null,
    updatedAt:row.updated_at||null
  });
}

export function safeCaseAuditMetadata(value={}){
  const out={};
  if(value && typeof value==="object" && !Array.isArray(value)){
    for(const key of ["reason","previousStatus","newStatus","slotNumber","mimeType","pageCount","storageState","format","mode","caseVersion","decision","reviewer","role","issueKey","authorityClassificationCount"]){
      const v=value[key];
      if(v===undefined || v===null) continue;
      if(typeof v==="number" && Number.isFinite(v)) out[key]=v;
      else if(typeof v==="string" && v.length<=160 && !CONTROL.test(v)) out[key]=v;
    }
  }
  return JSON.stringify(out);
}
