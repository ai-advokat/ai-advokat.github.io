import { enforceCanonicalContextProvenance } from "./canonical-provenance-gate.js";

const sha256 = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();

export async function caseResponseHash(text) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function caseResponseDocument(doc, packet, extractionSha256) {
  if (!packet || packet.caseId !== doc.caseId || packet.documentId !== doc.id ||
      !sha256.test(doc.sha256) || packet.sourceSha256 !== doc.sha256 ||
      !sha256.test(extractionSha256)) return null;
  return { id:doc.id, sha256:doc.sha256, extractionSha256 };
}

export function caseResponseSourceContext(legalContext) {
  const { context } = enforceCanonicalContextProvenance(legalContext);
  return context.filter(({ provenance:p }) =>
    p?.kind === "legal_article" && p.legalAuthority === true && p.currentLawClaim === true &&
    /^https:\/\//i.test(p.sourceUrl)
  );
}

export async function createCaseResponseSnapshot({ caseId, analysisSha256, documents, legalContext }) {
  if (!documents.length || documents.some(doc => !doc) || !sha256.test(analysisSha256)) return null;
  const context = caseResponseSourceContext(legalContext);
  if (!context.length) return null;
  const snapshot = { caseId, analysisSha256, documents, context };
  const bytes = JSON.stringify(snapshot);
  return { bytes, sha256:await caseResponseHash(bytes), sources:caseResponseSourceReferences(context) };
}

export function caseResponseSourceReferences(context) {
  return context.map(({ provenance:p }) => ({
    title:p.sourceIdentity, articleNumber:p.articleNumber, version:p.versionLabel,
    url:p.sourceUrl, sha256:p.sourceSha256
  }));
}

export async function readCaseResponseReceipt({ bytes, expectedSha256, caseId }) {
  if (!sha256.test(expectedSha256) || await caseResponseHash(bytes) !== expectedSha256) return null;
  let snapshot;
  try { snapshot = JSON.parse(bytes); } catch { return null; }
  if (snapshot?.caseId !== caseId || !sha256.test(snapshot.analysisSha256) ||
      !Array.isArray(snapshot.documents) || !snapshot.documents.length ||
      !Array.isArray(snapshot.context) || !snapshot.context.length ||
      caseResponseSourceContext(snapshot.context).length !== snapshot.context.length) return null;
  return snapshot;
}

export async function readCaseResponseSnapshot({ bytes, expectedSha256, caseId, analysisText }) {
  const snapshot = await readCaseResponseReceipt({ bytes, expectedSha256, caseId });
  return snapshot?.analysisSha256 === await caseResponseHash(analysisText) ? snapshot : null;
}
