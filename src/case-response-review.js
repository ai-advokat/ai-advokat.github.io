// Review receipt only. This module never authorizes professional release.
export const RESPONSE_REVIEW_SCOPE="response_revision";
const SHA=/^[a-f0-9]{64}$/;
const UUID="[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const DRAFT=new RegExp("^DRAFT-"+UUID+"$","i"), DECISION=new RegExp("^CAE-"+UUID+"$","i");
const DECISIONS=new Set(["approved","rejected","needs_revision","revoked"]);
const CONTROL=/[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
function exactKeys(value,keys){
  return value && typeof value==="object" && !Array.isArray(value) && Object.keys(value).length===keys.length && keys.every(k=>Object.hasOwn(value,k));
}
function validIdentity(r){
  return exactKeys(r,["number","sha256","draftId","responseSourcesSha256"]) && Number.isSafeInteger(r.number) && r.number>0 &&
    typeof r.sha256==="string" && SHA.test(r.sha256) && typeof r.draftId==="string" && DRAFT.test(r.draftId) &&
    typeof r.responseSourcesSha256==="string" && SHA.test(r.responseSourcesSha256);
}
export function parseResponseReview(body){
  if(!exactKeys(body,["scope","decision","reason","revision","expectedDecisionId"]) || body.scope!==RESPONSE_REVIEW_SCOPE ||
    !DECISIONS.has(body.decision) || !validIdentity(body.revision) || typeof body.reason!=="string" ||
    !(body.expectedDecisionId===null || (typeof body.expectedDecisionId==="string" && DECISION.test(body.expectedDecisionId)))) return null;
  const reason=body.reason.normalize("NFKC").trim();
  if(reason.length<8 || reason.length>160 || CONTROL.test(reason)) return null;
  return {scope:RESPONSE_REVIEW_SCOPE,decision:body.decision,reason,revision:{...body.revision},expectedDecisionId:body.expectedDecisionId};
}
export function responseReviewIdentity(revision){
  const r={number:revision?.number,sha256:revision?.sha256,draftId:revision?.draft?.draftId,responseSourcesSha256:revision?.draft?.responseSourcesSha256};
  return validIdentity(r)?r:null;
}
export function sameResponseReviewIdentity(a,b){
  return Boolean(validIdentity(a) && validIdentity(b) && a.number===b.number && a.sha256===b.sha256 && a.draftId===b.draftId && a.responseSourcesSha256===b.responseSourcesSha256);
}
export async function responseWorkflowExists(db,caseId){
  return Boolean(await db.prepare(`SELECT 1 AS present FROM case_audit_events WHERE case_id=? AND (
    (object_type='case_draft' AND CASE WHEN json_valid(metadata_json) THEN json_type(metadata_json,'$.responseSourcesSha256') IS NOT NULL ELSE 1 END)
    OR (event_type='human_gate_recorded' AND object_type='case_response_revision')) LIMIT 1`).bind(caseId).first());
}
export async function latestResponseReview(db,caseId){
  const row=await db.prepare(`SELECT id,actor_account_id,object_id,metadata_json,created_at FROM case_audit_events
    WHERE case_id=? AND event_type='human_gate_recorded' AND object_type='case_response_revision' ORDER BY rowid DESC LIMIT 1`).bind(caseId).first();
  if(!row) return null;
  let meta;try{meta=JSON.parse(row.metadata_json);}catch{throw new Error("case_response_review_integrity_failed");}
  const parsed=parseResponseReview({scope:meta?.scope,decision:meta?.decision,reason:meta?.reason,revision:meta?.revision,expectedDecisionId:meta?.previousDecisionId});
  if(!parsed || !DECISION.test(row.id) || row.object_id!==parsed.revision.draftId || !row.actor_account_id || !SHA.test(meta.observedCaseFingerprint||"") || meta.releaseAuthorized!==false) throw new Error("case_response_review_integrity_failed");
  return {decisionId:row.id,decision:parsed.decision,reason:parsed.reason,revision:parsed.revision,previousDecisionId:parsed.expectedDecisionId,
    reviewerAccountId:row.actor_account_id,decidedAt:row.created_at,observedCaseFingerprint:meta.observedCaseFingerprint,releaseAuthorized:false};
}
// One conditional INSERT on the existing D1 audit table. CAS protects the
// decision sequence and rechecks account, key, entitlement and case role at write.
// It does NOT atomically bind external R2/extraction/authority state to this write.
export async function appendResponseReview(db,{caseId,accountId,keyHash,input,fingerprint,decisionId,at}){
  const parsed=parseResponseReview(input);
  if(!parsed || !SHA.test(keyHash||"") || !SHA.test(fingerprint||"") || !DECISION.test(decisionId||"")) throw new Error("case_response_review_invalid");
  const metadata=JSON.stringify({scope:RESPONSE_REVIEW_SCOPE,decision:parsed.decision,reason:parsed.reason,revision:parsed.revision,
    previousDecisionId:parsed.expectedDecisionId,observedCaseFingerprint:fingerprint,releaseAuthorized:false});
  const result=await db.prepare(`INSERT INTO case_audit_events
    (id,case_id,actor_account_id,event_type,object_type,object_id,metadata_json,created_at)
    SELECT ?,a.case_id,a.account_id,'human_gate_recorded','case_response_revision',?,?,?
    FROM case_workspace_access a JOIN case_workspaces w ON w.id=a.case_id JOIN membership_accounts m ON m.id=a.account_id
    WHERE a.case_id=? AND a.account_id=? AND a.status='active' AND a.role IN ('owner','lawyer')
      AND w.status='active' AND m.status='active'
      AND EXISTS (SELECT 1 FROM membership_access_keys k WHERE k.account_id=a.account_id AND k.key_hash=? AND k.status='active'
        AND (k.expires_at IS NULL OR datetime(k.expires_at)>datetime('now')))
      AND EXISTS (SELECT 1 FROM membership_entitlements e WHERE e.account_id=a.account_id AND e.plan_code IN ('trial_pro','pro','office')
        AND e.status IN ('trial','active') AND (e.expires_at IS NULL OR datetime(e.expires_at)>datetime('now')))
      AND COALESCE((SELECT id FROM case_audit_events WHERE case_id=a.case_id AND event_type='human_gate_recorded'
        AND object_type='case_response_revision' ORDER BY rowid DESC LIMIT 1),'')=?`)
    .bind(decisionId,parsed.revision.draftId,metadata,at,caseId,accountId,keyHash,parsed.expectedDecisionId??"").run();
  return result.meta?.changes===1;
}
