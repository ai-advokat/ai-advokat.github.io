import test from "node:test";
import assert from "node:assert/strict";
import {caseId,otherCaseId,revisionPath,makeRevisionFixture} from "./case-response-revision-fixture.mjs";
const gatePath="/api/cases/"+caseId+"/human-gate";
const identity=r=>({number:r.number,sha256:r.sha256,draftId:r.draft.draftId,responseSourcesSha256:r.draft.responseSourcesSha256});
const request=(r,expectedDecisionId=null,decision="approved")=>({scope:"response_revision",decision,reason:"Synthetic legal review",revision:identity(r),expectedDecisionId});
async function parsed(response,status){const data=await response.json();assert.equal(response.status,status,JSON.stringify(data));return data;}

test("response review is recorded on exact saved revision, legacy gate cannot unlock it",async()=>{
  const f=await makeRevisionFixture();
  const {revision}=await parsed(await f.request(revisionPath,f.input()),201);
  const initial=await parsed(await f.request(gatePath),200);
  assert.equal(initial.responseReviewRequired,true);
  assert.equal(initial.review,null);
  await parsed(await f.request(gatePath,{decision:"approved",reason:"Legacy attempted approval"}),409);
  const result=await parsed(await f.request(gatePath,request(revision)),201);
  assert.deepEqual(result.review.revision,identity(revision));
  assert.equal(result.review.reviewerAccountId,"p02-test-account");
  assert.equal(result.review.releaseAuthorized,false);
  assert.equal(result.gate.effectiveApproved,false);
  assert.equal(result.professionalUseLocked,true);
  assert.equal((await parsed(await f.request(gatePath),200)).review.decisionId,result.review.decisionId);
  await parsed(await f.request(gatePath,request(revision)),409);
  f.raw.prepare("UPDATE case_workspaces SET professional_use_locked=0 WHERE id=?").run(caseId);
  for(const format of ["docx","pdf"]){
    const denied=await parsed(await f.request("/api/cases/"+caseId+"/exports",{format,report:{title:"Synthetic"}}),409);
    assert.equal(denied.error,"case_response_professional_release_on_hold");
  }
});
test("new revision or changed extraction cannot receive approval for previous snapshot; prior approval may be revoked",async()=>{
  const f=await makeRevisionFixture();
  const {revision}=await parsed(await f.request(revisionPath,f.input()),201);
  const {review}=await parsed(await f.request(gatePath,request(revision)),201);
  const {revision:next}=await parsed(await f.request(revisionPath,f.input({number:revision.number,sha256:revision.sha256},"Second revision")),201);
  await parsed(await f.request(gatePath,request(revision,review.decisionId)),409);
  f.seedObject(f.extractionKey,f.packet+" ");
  const stale=await parsed(await f.request(gatePath,request(next,review.decisionId)),409);
  assert.equal(stale.error,"case_response_document_snapshot_changed");
  const revoked=await parsed(await f.request(gatePath,request(revision,review.decisionId,"revoked")),201);
  assert.equal(revoked.review.decision,"revoked");
  assert.equal(revoked.professionalUseLocked,true);
  await parsed(await f.request(gatePath,request(revision,review.decisionId,"revoked")),409);
});
test("review rejects wrong case, forged fields, reviewer and unauthenticated actor",async()=>{
  const f=await makeRevisionFixture();
  const {revision}=await parsed(await f.request(revisionPath,f.input()),201);
  await parsed(await f.request(gatePath,{...request(revision),actorAccountId:"forged"}),400);
  await parsed(await f.request(gatePath.replace(caseId,otherCaseId),request(revision)),409);
  await parsed(await f.request(gatePath,request(revision),null),401);
  f.raw.prepare("UPDATE case_workspace_access SET role='reviewer' WHERE case_id=?").run(caseId);
  await parsed(await f.request(gatePath,request(revision)),403);
});
