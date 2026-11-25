// Read-only navigation of explicit evidence anchors. An extraction is not proof.
const DOC=/^DOC-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const FACT=/^[A-Za-z0-9_.-]{1,120}$/;
const SHA=/^[a-f0-9]{64}$/;
const STATUS=new Set(["source_confirmed","source_indication","disputed","professional_review_required"]);
export function responseEvidenceRefs(text){
  const refs=[],seen=new Set();
  for(const match of String(text||"").slice(0,50000).matchAll(/\[(DOC-[a-f0-9-]{36}):([A-Za-z0-9_.-]{1,120})\]/gi)){
    const [,documentId,factId]=match;
    if(!DOC.test(documentId)) continue;
    const marker=match[0];
    if(seen.has(marker)) continue;
    seen.add(marker);
    refs.push({documentId,factId,marker});
    if(refs.length===120) break;
  }
  return refs;
}
export async function resolveResponseEvidence({revision,caseId,documentId,factId,extractionText}){
  if(!DOC.test(documentId||"") || !FACT.test(factId||"") || revision?.caseId!==caseId ||
      revision.draft?.caseId!==caseId || revision.draft?.draftType!=="response" || !SHA.test(revision.sha256||"") ||
      !SHA.test(revision.draft.responseSourcesSha256||"") || typeof extractionText!=="string" ||
      !responseEvidenceRefs(revision.text).some(ref=>ref.documentId===documentId && ref.factId===factId)) return null;
  const docs=Array.isArray(revision.draft.extractionDocuments)?revision.draft.extractionDocuments.filter(d=>d.id===documentId):[];
  if(docs.length!==1 || !SHA.test(docs[0].sha256||"") || !SHA.test(docs[0].extractionSha256||"")) return null;
  const doc=docs[0];
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(extractionText))),b=>b.toString(16).padStart(2,"0")).join("");
  if(digest!==doc.extractionSha256) return null;
  let packet;
  try{packet=JSON.parse(extractionText);}catch{return null;}
  if(packet?.caseId!==caseId || packet.documentId!==documentId || packet.sourceSha256!==doc.sha256) return null;
  const facts=Array.isArray(packet.extraction?.facts)?packet.extraction.facts.filter(f=>f?.id===factId):[];
  if(facts.length!==1) return null;
  const fact=facts[0],page=Number.isInteger(fact.page)&&fact.page>0?fact.page:null;
  const locator=typeof fact.locator==="string"?fact.locator.trim():"";
  if(!STATUS.has(fact.status) || typeof fact.text!=="string" || !fact.text.trim() || fact.text.length>2400 ||
      locator.length>240 || (!page && !locator)) return null;
  return {documentId,factId,text:fact.text,status:fact.status,page,locator,
    documentType:String(packet.extraction.document_type||"unknown").slice(0,120),
    sourceSha256:doc.sha256,extractionSha256:digest,revisionSha256:revision.sha256,
    responseSourcesSha256:revision.draft.responseSourcesSha256,
    kind:"extracted_statement_not_proof",professionalUseLocked:true};
}
