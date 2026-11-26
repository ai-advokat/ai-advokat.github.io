import { RESPONSE_REVISION_PAGE_SIZE } from "./case-response-revisions.js";
import { CASE_RESPONSE_AUTHORITY_MATCHES, caseResponseAuthorityBindings } from "./case-response-authority.js";

const ACTIVE_ENTITLEMENT = `e.status IN ('trial','active')
  AND (e.expires_at IS NULL OR datetime(e.expires_at) > datetime('now'))`;
const PROFESSIONAL_PLANS = "('trial_pro','pro','office')";
export const MEMBERSHIP_ENTITLEMENT_ORDER = "CASE e.status WHEN 'active' THEN 0 ELSE 1 END, e.updated_at DESC, e.id";

// Parameters are case ID, server-derived account ID and the request key hash.
export const CASE_RESPONSE_WRITER = `EXISTS (
  SELECT 1
  FROM case_workspace_access a
  JOIN case_workspaces w ON w.id = a.case_id
  JOIN membership_accounts m ON m.id = a.account_id
  WHERE a.case_id = ? AND a.account_id = ?
    AND a.status = 'active' AND a.role IN ('owner','lawyer')
    AND w.status = 'active' AND m.status = 'active'
    AND EXISTS (SELECT 1 FROM membership_access_keys k WHERE k.account_id = a.account_id
      AND k.key_hash = ? AND k.status = 'active'
      AND (k.expires_at IS NULL OR datetime(k.expires_at) > datetime('now')))
    AND EXISTS (SELECT 1 FROM membership_entitlements e WHERE e.account_id = a.account_id
      AND e.plan_code IN ${PROFESSIONAL_PLANS} AND ${ACTIVE_ENTITLEMENT})
)`;

// The case ID and account ID select the workspace, account and specific case grant.
const AUTHORIZATION_EPOCHS = `FROM case_response_authorization_epochs account
  JOIN case_response_authorization_epochs workspace ON workspace.scope = 'workspace'
    AND workspace.account_id = '' AND workspace.case_id = ?
  JOIN case_response_authorization_epochs grant_epoch ON grant_epoch.scope = 'grant'
    AND grant_epoch.account_id = account.account_id AND grant_epoch.case_id = workspace.case_id
  WHERE account.scope = 'account' AND account.case_id = '' AND account.account_id = ?`;

export const CASE_RESPONSE_AUTHORIZATION_MATCHES = `EXISTS (SELECT 1 ${AUTHORIZATION_EPOCHS}
  AND account.epoch = ? AND workspace.epoch = ? AND grant_epoch.epoch = ?
  AND (? IS NULL OR ? > unixepoch('now')))`;

export function validResponseAuthorization(value) {
  return value && [value.accountEpoch, value.workspaceEpoch, value.grantEpoch]
    .every(epoch => Number.isSafeInteger(epoch) && epoch >= 0)
    && (value.validUntil === null || Number.isSafeInteger(value.validUntil));
}

export function caseResponseAuthorizationBindings(caseId, accountId, authorization) {
  if (!validResponseAuthorization(authorization)) throw new Error("case_response_authorization_unavailable");
  return [caseId, accountId, authorization.accountEpoch, authorization.workspaceEpoch,
    authorization.grantEpoch, authorization.validUntil, authorization.validUntil];
}

export async function captureCaseResponseAuthorization(db, {caseId, accountId, keyHash}) {
  // A key and at least one eligible entitlement must still be valid at write time.
  // The earliest of the key expiry and the selected entitlement expiry also
  // makes a historical receipt stale when a grant expires without a database write.
  const row = await db.prepare(`WITH selected_plan AS (
    SELECT e.plan_code, unixepoch(e.expires_at) AS plan_until
    FROM membership_entitlements e WHERE e.account_id = ? AND ${ACTIVE_ENTITLEMENT}
    ORDER BY ${MEMBERSHIP_ENTITLEMENT_ORDER} LIMIT 1
  ), expiry AS (
    SELECT unixepoch(k.expires_at) AS key_until, p.plan_until
    FROM membership_access_keys k CROSS JOIN selected_plan p
    WHERE k.account_id = ? AND k.key_hash = ? AND p.plan_code IN ${PROFESSIONAL_PLANS}
    )
    SELECT account.epoch AS accountEpoch, workspace.epoch AS workspaceEpoch, grant_epoch.epoch AS grantEpoch,
      (SELECT CASE WHEN key_until IS NULL THEN plan_until WHEN plan_until IS NULL THEN key_until
        ELSE MIN(key_until,plan_until) END FROM expiry) AS validUntil
    ${AUTHORIZATION_EPOCHS} AND ${CASE_RESPONSE_WRITER} AND EXISTS (SELECT 1 FROM expiry)`)
    .bind(accountId, accountId, keyHash, caseId, accountId, caseId, accountId, keyHash).first();
  return validResponseAuthorization(row) ? row : null;
}

export async function caseResponseAuthorizationCurrent(db, caseId, accountId, authorization) {
  const row = await db.prepare(`SELECT ${CASE_RESPONSE_AUTHORIZATION_MATCHES} AS current`)
    .bind(...caseResponseAuthorizationBindings(caseId, accountId, authorization)).first();
  return row?.current === 1;
}

export function atomicCaseResponseEnabled(env) {
  return env.CASE_ATOMIC_RESPONSE_ENABLED === "true";
}

export async function caseResponseSourceEpoch(db, caseId) {
  const row = await db.prepare("SELECT epoch FROM case_response_source_epochs WHERE case_id = ?").bind(caseId).first();
  if (!Number.isSafeInteger(row?.epoch) || row.epoch < 0) throw new Error("case_response_atomic_state_unavailable");
  return row.epoch;
}

export function caseResponseExtractionHead(db, caseId, documentId) {
  return db.prepare(`SELECT source_sha256, object_sha256 FROM case_response_extraction_heads
    WHERE case_id = ? AND document_id = ?`).bind(caseId, documentId).first();
}

export function publishCaseResponseExtraction(db, {caseId, documentId, sourceSha256, objectSha256,
  expectedEpoch, accountId, keyHash, authorization, auditId, at, metadata}) {
  const published = `EXISTS (SELECT 1 FROM case_response_extraction_heads
    WHERE document_id = ? AND case_id = ? AND operation_id = ?)`;
  return db.batch([
    db.prepare(`INSERT INTO case_response_extraction_heads
        (document_id, case_id, source_sha256, object_sha256, operation_id)
      SELECT d.id, d.case_id, d.sha256, ?, ?
      FROM case_document_slots d JOIN case_response_source_epochs s ON s.case_id = d.case_id
      WHERE d.id = ? AND d.case_id = ? AND d.sha256 = ? AND d.storage_state = 'uploaded'
        AND s.epoch = ? AND ${CASE_RESPONSE_WRITER}
        AND ${CASE_RESPONSE_AUTHORIZATION_MATCHES}
      ON CONFLICT(document_id) DO UPDATE SET source_sha256 = excluded.source_sha256,
        object_sha256 = excluded.object_sha256, operation_id = excluded.operation_id
      RETURNING operation_id`
    ).bind(objectSha256, auditId, documentId, caseId, sourceSha256, expectedEpoch, caseId, accountId, keyHash,
      ...caseResponseAuthorizationBindings(caseId, accountId, authorization)),
    db.prepare(`UPDATE case_document_slots SET extraction_state = 'complete', updated_at = ?
      WHERE id = ? AND case_id = ? AND ${published}`
    ).bind(at, documentId, caseId, documentId, caseId, auditId),
    db.prepare(`UPDATE case_workspaces SET professional_use_locked = 1, updated_at = ?
      WHERE id = ? AND ${published}`
    ).bind(at, caseId, documentId, caseId, auditId),
    db.prepare(`INSERT INTO case_audit_events
      (id, case_id, actor_account_id, event_type, object_type, object_id, metadata_json, created_at)
      SELECT ?, ?, ?, 'analysis_requested', 'case_document', ?, ?, ? WHERE ${published}`
    ).bind(auditId, caseId, accountId, documentId, metadata, at, documentId, caseId, auditId)
  ]).then(([publication]) => publication.results?.[0]?.operation_id === auditId);
}

export function caseResponseRevisionPublication(db, caseId, number) {
  return db.prepare(`SELECT revision_sha256, object_sha256, source_epoch
    FROM case_response_revision_publications WHERE case_id = ? AND revision_number = ?`
  ).bind(caseId, number).first();
}

export async function listPublishedCaseResponseRevisions(db, caseId, before) {
  const range = before === null ? "" : "AND revision_number < ?";
  const {results} = await db.prepare(`SELECT revision_number FROM case_response_revision_publications
    WHERE case_id = ? ${range} ORDER BY revision_number DESC LIMIT ?`
  ).bind(caseId, ...(before === null ? [] : [before]), RESPONSE_REVISION_PAGE_SIZE + 1).all();
  return results.map(row => row.revision_number);
}

export async function publishCaseResponseRevision(db, {caseId, accountId, keyHash, authorization, record, objectSha256, sourceEpoch}) {
  const result = await db.prepare(`INSERT INTO case_response_revision_publications
      (case_id, revision_number, revision_sha256, object_sha256, source_epoch)
    SELECT s.case_id, ?, ?, ?, s.epoch
    FROM case_response_source_epochs s
    WHERE s.case_id = ? AND s.epoch = ? AND ${CASE_RESPONSE_WRITER}
      AND ${CASE_RESPONSE_AUTHORIZATION_MATCHES}
      AND ${CASE_RESPONSE_AUTHORITY_MATCHES}
      AND COALESCE((SELECT revision_number FROM case_response_revision_publications
        WHERE case_id = s.case_id ORDER BY revision_number DESC LIMIT 1), 0) = ?
      AND (SELECT revision_sha256 FROM case_response_revision_publications
        WHERE case_id = s.case_id AND revision_number = ?) IS ?
    ON CONFLICT(case_id, revision_number) DO NOTHING`
  ).bind(record.number, record.sha256, objectSha256, caseId, sourceEpoch, caseId, accountId, keyHash,
    ...caseResponseAuthorizationBindings(caseId, accountId, authorization),
    ...caseResponseAuthorityBindings(caseId, record.draft.authority),
    record.number - 1, record.number - 1, record.parentSha256).run();
  return result.meta?.changes === 1;
}
