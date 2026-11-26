import { caseResponseHash } from "./case-response-sources.js";

export const RESPONSE_REVISION_PAGE_SIZE = 20;
export const SHA256_PATTERN = /^[a-f0-9]{64}$/;
export const DRAFT_ID_PATTERN = /^DRAFT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;

export function parseResponseRevision(body) {
  if (!body || typeof body !== "object" || typeof body.requestId !== "string" || !REQUEST_ID_PATTERN.test(body.requestId) ||
      typeof body.draftId !== "string" || !DRAFT_ID_PATTERN.test(body.draftId) ||
      typeof body.text !== "string" || typeof body.note !== "string") return null;
  const base = body.base;
  if (base !== null && (!Number.isSafeInteger(base?.number) || base.number < 1 ||
      base.number >= Number.MAX_SAFE_INTEGER || typeof base.sha256 !== "string" || !SHA256_PATTERN.test(base.sha256))) return null;
  if (body.text.length > 50000 || body.note.length > 200) return null;
  const text = body.text.replace(/\r\n?/g, "\n").normalize("NFKC").trim();
  const note = body.note.normalize("NFKC").trim();
  if (!text || text.length > 50000 || note.length > 200 || UNSAFE_TEXT.test(text) || UNSAFE_TEXT.test(note)) return null;
  return { requestId:body.requestId, draftId:body.draftId, text, note,
    base:base === null ? null : { number:base.number, sha256:base.sha256 } };
}

export function caseResponseRevisionPrefix(caseId) {
  return `case-derived/v1/${caseId}/response-revisions/`;
}

export function caseResponseRevisionKey(caseId, number) {
  return caseResponseRevisionPrefix(caseId) + String(number).padStart(16, "0") + ".json";
}

function numberFromKey(prefix, key) {
  if (!key.startsWith(prefix)) return null;
  const suffix = key.slice(prefix.length);
  const number = Number(suffix.slice(0, 16));
  return /^\d{16}\.json$/.test(suffix) && Number.isSafeInteger(number) && number > 0 ? number : null;
}

export async function listResponseRevisionNumbers({ caseId, before, bucket, db }) {
  const prefix = caseResponseRevisionPrefix(caseId);
  const upper = before === null ? prefix.slice(0, -1) + "0" : caseResponseRevisionKey(caseId, before);
  const limit = RESPONSE_REVISION_PAGE_SIZE + 1;
  let numbers = [];
  if (bucket) {
    let cursor;
    do {
      const page = await bucket.list({ prefix, cursor, limit:1000 });
      for (const { key } of page.objects) {
        if (key >= upper) return numbers.slice(-limit).reverse();
        const number = numberFromKey(prefix, key);
        if (number !== null) numbers.push(number);
      }
      numbers = numbers.slice(-limit);
      if (page.truncated && (!page.cursor || page.cursor === cursor)) throw new Error("case_response_revision_storage_unavailable");
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return numbers.reverse();
  }
  const result = await db.prepare(
    `SELECT object_key FROM case_private_object_chunks
      WHERE object_key >= ? AND object_key < ? AND chunk_index = 0
      ORDER BY object_key DESC LIMIT ?`
  ).bind(prefix, upper, limit).all();
  return (result.results || []).map(row => numberFromKey(prefix, row.object_key)).filter(n => n !== null);
}

export async function createResponseRevision({ caseId, accountId, input, draft, savedAt }) {
  const record = {
    number:(input.base?.number ?? 0) + 1, parentSha256:input.base?.sha256 ?? null, caseId,
    draft, text:input.text, note:input.note, savedAt,
    writerFingerprint:await caseResponseHash(JSON.stringify([caseId,accountId,input.requestId]))
  };
  return {
    ...record, sha256:await caseResponseHash(JSON.stringify(record)), accountId, requestId:input.requestId
  };
}

export async function verifyResponseRevision(stored, caseId, number) {
  if (!stored || stored.caseId !== caseId || stored.number !== number || !SHA256_PATTERN.test(stored.sha256) ||
      typeof stored.accountId !== "string" || !REQUEST_ID_PATTERN.test(stored.requestId)) return null;
  const { accountId, requestId, sha256, ...record } = stored;
  if (record.writerFingerprint !== await caseResponseHash(JSON.stringify([caseId,accountId,requestId]))) return null;
  return await caseResponseHash(JSON.stringify(record)) === sha256 ? { ...record, sha256 } : null;
}

export function isResponseRevisionRetry(stored, input, accountId) {
  return stored && stored.accountId === accountId && stored.requestId === input.requestId &&
    stored.parentSha256 === (input.base?.sha256 ?? null) && stored.draft.draftId === input.draftId &&
    stored.text === input.text && stored.note === input.note;
}
