import { CASE_RESPONSE_WORKER_POLICY_SHA256 } from "./case-response-worker-policy.js";

const POLICY_DIGEST = /^[a-f0-9]{64}$/;
const LAST_SUPPORTED_CHECK = Date.UTC(9999,11,29) / 1000;
const skopjeDay = new Intl.DateTimeFormat("sv-SE", {
  timeZone:"Europe/Skopje", year:"numeric", month:"2-digit", day:"2-digit"
});
const AUTHORITY_EPOCH_QUERY = `SELECT registry.epoch AS registryEpoch,
  COALESCE(classification.epoch, 0) AS caseEpoch,
  policy.sha256 AS policySha256, unixepoch('now') AS checkedAt
  FROM case_response_legal_authority_epochs registry
  JOIN case_response_legal_policy policy ON policy.slot = 1
  LEFT JOIN case_response_legal_authority_epochs classification ON classification.case_id = ?
  WHERE registry.case_id = ''`;

export function caseResponseApplicability(checkedAt) {
  if (!Number.isSafeInteger(checkedAt) || checkedAt < 0 || checkedAt > LAST_SUPPORTED_CHECK) return null;
  const localDay = seconds => skopjeDay.format(seconds * 1000);
  const referenceDate = localDay(checkedAt);
  let start = checkedAt, end = checkedAt + 27 * 3600;
  while (end - start > 1) {
    const middle = Math.floor((start + end) / 2);
    if (localDay(middle) === referenceDate) start = middle;
    else end = middle;
  }
  return {referenceDate, checkedAt, validUntil:end};
}

function validApplicability(value) {
  const expected = value && caseResponseApplicability(value.checkedAt);
  return Boolean(expected && value.referenceDate === expected.referenceDate && value.validUntil === expected.validUntil);
}

export function validCaseResponseAuthority(value) {
  return Boolean(value && Number.isSafeInteger(value.registryEpoch) && value.registryEpoch >= 0
    && Number.isSafeInteger(value.caseEpoch) && value.caseEpoch >= 0
    && (value.policySha256 === undefined ||
      (typeof value.policySha256 === "string" && POLICY_DIGEST.test(value.policySha256)))
    && (value.applicability === undefined || validApplicability(value.applicability)));
}

export async function captureCaseResponseAuthority(db, caseId) {
  const state = await db.prepare(AUTHORITY_EPOCH_QUERY).bind(caseId).first();
  if (!validCaseResponseAuthority(state) || state.policySha256 !== CASE_RESPONSE_WORKER_POLICY_SHA256) return null;
  const {checkedAt,...authority} = state;
  const applicability = caseResponseApplicability(checkedAt);
  return applicability ? {...authority,applicability} : null;
}

export const CASE_RESPONSE_AUTHORITY_MATCHES = `EXISTS (SELECT 1 FROM (${AUTHORITY_EPOCH_QUERY})
  WHERE registryEpoch = ? AND caseEpoch = ? AND policySha256 = ? AND checkedAt >= ? AND checkedAt < ?)`;

function matchesWorkerPolicy(authority) {
  return validCaseResponseAuthority(authority) && authority.policySha256 === CASE_RESPONSE_WORKER_POLICY_SHA256
    && authority.applicability !== undefined;
}

export function caseResponseAuthorityBindings(caseId, authority) {
  if (!matchesWorkerPolicy(authority)) {
    throw new Error("case_response_authority_unavailable");
  }
  return [caseId, authority.registryEpoch, authority.caseEpoch, CASE_RESPONSE_WORKER_POLICY_SHA256,
    authority.applicability.checkedAt, authority.applicability.validUntil];
}

export async function caseResponseAuthorityCurrent(db, caseId, authority) {
  if (!matchesWorkerPolicy(authority)) return false;
  const row = await db.prepare(`SELECT ${CASE_RESPONSE_AUTHORITY_MATCHES} AS current`)
    .bind(...caseResponseAuthorityBindings(caseId, authority)).first();
  return row?.current === 1;
}
