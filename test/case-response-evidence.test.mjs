import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {responseEvidenceRefs,resolveResponseEvidence} from "../src/case-response-evidence.js";
const caseId="CASE-123e4567-e89b-42d3-a456-426614174000",documentId="DOC-123e4567-e89b-42d3-a456-426614174010",factId="F1";
const marker=`[${documentId}:${factId}]`,sourceSha256="a".repeat(64);
const hash=text=>createHash("sha256").update(text).digest("hex");
const fact={id:factId,text:"\u0416\u0430\u043b\u0438\u0442\u0435\u043b\u043e\u0442 \u0442\u0432\u0440\u0434\u0438 \u0443\u043f\u043b\u0430\u0442\u0430 \u043e\u0434 12.000 \u0434\u0435\u043d\u0430\u0440\u0438.",status:"source_indication",page:1,locator:"paragraph 2"};
function fixture(change={}){
  const packet={caseId,documentId,sourceSha256,extraction:{document_type:"appeal",facts:[fact]},...change};
  const extractionText=JSON.stringify(packet);
  const revision={caseId,sha256:"b".repeat(64),text:"\u041e\u0414\u0413\u041e\u0412\u041e\u0420 \u041d\u0410 \u0416\u0410\u041b\u0411\u0410\n\n"+fact.text+" "+marker,draft:{caseId,draftType:"response",responseSourcesSha256:"c".repeat(64),extractionDocuments:[{id:documentId,sha256:sourceSha256,extractionSha256:hash(extractionText)}]}};
  return {revision,caseId,documentId,factId,extractionText};
}
test("explicit refs only, duplicates removed, never infer by amount",()=>{
  assert.deepEqual(responseEvidenceRefs("12.000 "+marker+" "+marker),[{documentId,factId,marker}]);
  assert.deepEqual(responseEvidenceRefs("12.000 [DOC-invalid:F1]"),[]);
});
test("exact bound extraction preserves attribution and status, after reload",async()=>{
  const f=fixture(),result=await resolveResponseEvidence(JSON.parse(JSON.stringify(f)));
  assert.equal(result.text,fact.text);assert.equal(result.status,"source_indication");assert.equal(result.page,1);
  assert.equal(result.kind,"extracted_statement_not_proof");assert.equal(result.professionalUseLocked,true);
  assert.equal(result.extractionSha256,hash(f.extractionText));assert.equal(result.revisionSha256,f.revision.sha256);
});
test("wrong case, document and unknown or uncited fact rejected",async()=>{
  const f=fixture();
  for(const c of [{caseId:"other"},{documentId:"DOC-123e4567-e89b-42d3-a456-426614174011"},{factId:"F2"},{revision:{...f.revision,text:"12.000"}}])assert.equal(await resolveResponseEvidence({...f,...c}),null);
});
test("tampered extraction bytes rejected even with same source hash",async()=>{
  const f=fixture();assert.equal(await resolveResponseEvidence({...f,extractionText:f.extractionText+" "}),null);
});
test("case and document mismatch in extraction packet rejected",async()=>{
  for(const c of [{caseId:"other"},{documentId:"other"},{sourceSha256:"d".repeat(64)}])assert.equal(await resolveResponseEvidence(fixture(c)),null);
});
test("ambiguous fact id, invalid status or missing locator rejected",async()=>{
  for(const facts of [[fact,fact],[{...fact,status:"approved"}],[{...fact,page:null,locator:""}]])assert.equal(await resolveResponseEvidence(fixture({extraction:{document_type:"appeal",facts}})),null);
});
test("duplicate document receipt, missing source snapshot, non-response revision rejected",async()=>{
  const f=fixture(),d=f.revision.draft;
  for(const patch of [{extractionDocuments:[...d.extractionDocuments,...d.extractionDocuments]},{responseSourcesSha256:""},{draftType:"appeal"}])assert.equal(await resolveResponseEvidence({...f,revision:{...f.revision,draft:{...d,...patch}}}),null);
});
