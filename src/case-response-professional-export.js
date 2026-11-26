import {
  CASE_RESPONSE_WRITER, CASE_RESPONSE_AUTHORIZATION_MATCHES, captureCaseResponseAuthorization,
  caseResponseAuthorizationBindings, validResponseAuthorization
} from "./case-response-state.js";
import {
  CASE_RESPONSE_AUTHORITY_MATCHES, caseResponseAuthorityBindings, caseResponseAuthorityCurrent
} from "./case-response-authority.js";
import {responseReviewIdentity, sameResponseReviewIdentity} from "./case-response-review.js";

// The HTTP delivery boundary accepts working models only while LEGAL_HOLD is active.
export function caseExportDeliveryAllowed(model) {
  return model?.mode === "working" && model.humanGate?.status === "pending";
}

// Captures a server-verified revision and a specific historical review before a test render.
// The isolated validation functions return audit evidence only. They never deliver bytes.
export async function captureCaseResponseExportValidation(db, {caseId, accountId, keyHash, revision, decisionId}) {
  const identity = responseReviewIdentity(revision);
  if (!identity || revision.caseId !== caseId || !await caseResponseAuthorityCurrent(db,caseId,revision.draft.authority)) {
    return null;
  }
  const policy = await db.prepare(`SELECT epoch FROM case_response_export_validation_policy
    WHERE slot=1 AND hold_active=0`).first();
  if (!Number.isSafeInteger(policy?.epoch)) return null;
  const authorization = await captureCaseResponseAuthorization(db,{caseId,accountId,keyHash});
  if (!authorization) return null;

  const recorded = await db.prepare(`SELECT id, actor_account_id, metadata_json
    FROM case_audit_events WHERE case_id=? AND event_type='human_gate_recorded'
      AND object_type='case_response_revision' ORDER BY rowid DESC LIMIT 1`).bind(caseId).first();
  if (recorded?.id !== decisionId || typeof recorded?.metadata_json !== "string") return null;
  let review;
  try { review = JSON.parse(recorded.metadata_json); } catch { return null; }
  if (review?.decision !== "approved" || review.releaseAuthorized !== false ||
      !sameResponseReviewIdentity(identity,review.revision) ||
      review.sourceEpoch !== revision.draft.sourceEpoch ||
      JSON.stringify(review.authority) !== JSON.stringify(revision.draft.authority) ||
      !validResponseAuthorization(review.authorization)) return null;

  return {
    caseId, accountId, keyHash, authorization, identity, policyEpoch:policy.epoch,
    decisionId, reviewerId:recorded.actor_account_id, reviewerAuthorization:review.authorization,
    reviewMetadata:recorded.metadata_json, authority:revision.draft.authority, sourceEpoch:review.sourceEpoch
  };
}

async function digest(bytes) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  return Array.from(hash,byte=>byte.toString(16).padStart(2,"0")).join("");
}

// Simulates the last conditional D1 write after rendering in an isolated database.
export async function finalizeCaseResponseExportValidation(db, check, {format, modelBytes, artifactBytes}) {
  if (!check || !["docx","pdf"].includes(format) || ![modelBytes,artifactBytes].every(bytes =>
    bytes instanceof Uint8Array && bytes.byteLength > 0)) return null;
  const [modelSha256,artifactSha256] = await Promise.all([digest(modelBytes),digest(artifactBytes)]);
  const receiptId = "EXPORT-CHECK-"+crypto.randomUUID();
  const {caseId,accountId,keyHash,identity} = check;
  const result = await db.prepare(`INSERT INTO case_response_export_validation_receipts
    (id,case_id,actor_account_id,decision_id,revision_sha256,format,model_sha256,artifact_sha256)
    SELECT ?,s.case_id,?,h.id,p.revision_sha256,?,?,?
    FROM case_response_source_epochs s
    JOIN case_response_revision_publications p ON p.case_id=s.case_id
    JOIN case_audit_events h ON h.case_id=s.case_id AND h.id=?
    JOIN case_response_export_validation_policy gate ON gate.slot=1 AND gate.hold_active=0 AND gate.epoch=?
    WHERE s.case_id=? AND s.epoch=? AND p.source_epoch=s.epoch AND p.revision_number=? AND p.revision_sha256=?
      AND NOT EXISTS (SELECT 1 FROM case_response_revision_publications newer
        WHERE newer.case_id=p.case_id AND newer.revision_number>p.revision_number)
      AND h.actor_account_id=? AND h.metadata_json=? AND h.event_type='human_gate_recorded'
      AND h.object_type='case_response_revision'
      AND NOT EXISTS (SELECT 1 FROM case_audit_events newer WHERE newer.case_id=h.case_id
        AND newer.event_type='human_gate_recorded' AND newer.object_type='case_response_revision' AND newer.rowid>h.rowid)
      AND ${CASE_RESPONSE_WRITER}
      AND ${CASE_RESPONSE_AUTHORIZATION_MATCHES}
      AND ${CASE_RESPONSE_AUTHORIZATION_MATCHES}
      AND ${CASE_RESPONSE_AUTHORITY_MATCHES}`)
    .bind(receiptId,accountId,format,modelSha256,artifactSha256,check.decisionId,check.policyEpoch,
      caseId,check.sourceEpoch,identity.number,identity.sha256,check.reviewerId,check.reviewMetadata,
      caseId,accountId,keyHash,...caseResponseAuthorizationBindings(caseId,accountId,check.authorization),
      ...caseResponseAuthorizationBindings(caseId,check.reviewerId,check.reviewerAuthorization),
      ...caseResponseAuthorityBindings(caseId,check.authority)).run();
  return result.meta?.changes === 1 ? {receiptId, modelSha256, artifactSha256, releaseAuthorized:false} : null;
}
