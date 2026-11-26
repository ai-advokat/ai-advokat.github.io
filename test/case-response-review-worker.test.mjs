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

const exportPath=id=>"/api/cases/"+id+"/exports";
const sampleReport={title:"Синтетички работен извештај",summary:"Текст за проверка на извозот."};
const formats=["md","txt","docx","csv","json","png","jpg","pdf"];
async function assertProfessionalHold(f,id,format,mode){
  const response=await f.request(exportPath(id),{format,mode,report:sampleReport});
  assert.equal(response.headers.get("content-disposition"),null);
  const result=await parsed(response,409);
  assert.equal(result.error,id===caseId
    ?"case_response_professional_release_on_hold"
    :"case_export_professional_release_on_hold");
  assert.equal(result.legalHold,"ACTIVE");
  assert.equal(result.professionalUseLocked,true);
  assert.equal(result.exportModel,undefined);
}

test("a current or revoked exact revision receipt never enables professional output in D1 or R2",async t=>{
  for(const r2 of [false,true]) await t.test(r2?"R2 test double":"SQLite D1 fallback",async()=>{
    const f=await makeRevisionFixture({r2});
    const auditCount=()=>f.raw.prepare("SELECT COUNT(*) AS n FROM case_audit_events WHERE event_type='export_generated'").get().n;
    const {revision}=await parsed(await f.request(revisionPath,f.input()),201);
    const {review}=await parsed(await f.request(gatePath,request(revision)),201);
    const baseline=auditCount();

    for(const format of formats) await assertProfessionalHold(f,caseId,format,"professional");

    await parsed(await f.request(revisionPath,f.input(
      {number:revision.number,sha256:revision.sha256},"Следна адвокатска доработка."
    )),201);
    f.seedObject(f.extractionKey,f.packet+" ");
    await assertProfessionalHold(f,caseId,"docx","professional");
    f.seedObject(f.extractionKey,f.packet);
    await assertProfessionalHold(f,caseId,"pdf","professional");

    await parsed(await f.request(gatePath,request(revision,review.decisionId,"revoked")),201);
    for(const format of ["docx","pdf"]) await assertProfessionalHold(f,caseId,format,"professional");
    assert.equal(auditCount(),baseline);
  });
});

test("legacy case approval cannot release professional reports; explicit working exports still work",async()=>{
  const f=await makeRevisionFixture();
  f.d1.batch=async statements=>{
    f.raw.exec("BEGIN");
    try{
      const results=[];
      for(const statement of statements) results.push(await statement.run());
      f.raw.exec("COMMIT");
      return results;
    }catch(error){
      f.raw.exec("ROLLBACK");
      throw error;
    }
  };
  const legacyGate="/api/cases/"+otherCaseId+"/human-gate";
  await parsed(await f.request(legacyGate,{decision:"approved",reason:"Synthetic case-level review"}),201);
  for(const format of formats){
    await assertProfessionalHold(f,otherCaseId,format);
    await assertProfessionalHold(f,otherCaseId,format,"professional");
  }

  const report={...sampleReport,mode:"professional",humanGate:{
    status:"approved",reviewer:"Client label",decidedAt:"2026-11-25T00:00:00.000Z",decisionRef:"CLIENT-REVIEW"
  }};
  const workerOutput=await f.request(exportPath(otherCaseId),{format:"docx",mode:"working",report});
  assert.equal(workerOutput.status,200);
  assert.equal(workerOutput.headers.get("x-ai-advokat-export-mode"),"working");
  assert.deepEqual([...new Uint8Array(await workerOutput.arrayBuffer()).slice(0,2)],[80,75]);
  const pdf=await parsed(await f.request(exportPath(otherCaseId),{format:"pdf",mode:"working",report}),200);
  assert.equal(pdf.mode,"working");
  assert.equal(pdf.exportModel.mode,"working");
  assert.equal(pdf.exportModel.humanGate.status,"pending");
  assert.equal(pdf.exportModel.humanGate.decisionRef,"");

  await parsed(await f.request(legacyGate,{decision:"revoked",reason:"Synthetic case-level revocation"}),201);
  for(const format of ["docx","pdf"]) await assertProfessionalHold(f,otherCaseId,format,"professional");
  const compatible=await f.request(exportPath(otherCaseId),{format:"txt",report:sampleReport});
  assert.equal(compatible.status,200);
  assert.equal(compatible.headers.get("x-ai-advokat-export-mode"),"working");
});
