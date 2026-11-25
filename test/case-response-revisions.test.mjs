import test from "node:test";
import assert from "node:assert/strict";
import {
  caseId, otherCaseId, revisionPath, edited, draftId, makeRevisionFixture
} from "./case-response-revision-fixture.mjs";
import { caseResponseRevisionKey, verifyResponseRevision } from "../src/case-response-revisions.js";

async function parsed(response,status){
  const data=await response.json();
  assert.equal(response.status,status,JSON.stringify(data));
  return data;
}

function baseOf({number,sha256}) { return {number,sha256}; }

for(const r2 of [false,true]){
  const backend=r2?"R2 conditional fixture":"D1 SQL";
  test(`${backend} keeps the exact server revision after reopen and protects parallel writers`,async()=>{
    const fixture=await makeRevisionFixture({r2});
    const empty=await parsed(await fixture.request(),200);
    assert.equal(empty.head,null);
    const one=fixture.input();
    const alternative=fixture.input(null,"Конкурентна измена.");
    const results=await Promise.all([fixture.request(revisionPath,one),fixture.request(revisionPath,alternative)]);
    assert.deepEqual(results.map(response=>response.status).sort(),[201,409]);
    const winner=results[0].status===201?one:alternative;
    const {head,history}=await parsed(await fixture.request(),200);
    assert.deepEqual(history,[1]);
    assert.equal(head.text,winner.text);
    assert.equal(head.draft.draftId,draftId);
    assert.equal(head.draft.responseSourcesSha256,fixture.source.sha256);
    assert.ok(!("accountId" in head));
    const retry=await parsed(await fixture.request(revisionPath,winner),200);
    assert.equal(retry.replayed,true);
    assert.equal(retry.revision.sha256,head.sha256);

    const second=fixture.input(baseOf(head),"Втора адвокатска доработка.");
    const competing=fixture.input(baseOf(head),"Втора конкурентна доработка.");
    const requests=await Promise.all([fixture.request(revisionPath,second),fixture.request(revisionPath,competing)]);
    assert.deepEqual(requests.map(response=>response.status).sort(),[201,409]);
    const {head:latest}=await parsed(await fixture.request(),200);
    assert.equal(latest.number,2);
    assert.equal(latest.parentSha256,head.sha256);
    assert.equal((await parsed(await fixture.request(revisionPath+"/1"),200)).revision.sha256,head.sha256);
    await parsed(await fixture.request(revisionPath+"?exportSha256="+head.sha256),409);
    const exportCheck=await parsed(await fixture.request(revisionPath+"?exportSha256="+latest.sha256),200);
    assert.equal(exportCheck.legalHold,"ACTIVE");
    assert.equal(exportCheck.humanGate.professionalUseLocked,true);
    assert.equal(exportCheck.head.sha256,latest.sha256);
    assert.equal((await parsed(await fixture.request(revisionPath,winner),200)).revision.sha256,head.sha256);
    if(r2) assert.deepEqual([...new Set(fixture.conditions)],["*"]);
  });
}

test("working revisions are bound to case authorization and server draft receipts",async()=>{
  const f=await makeRevisionFixture();
  await parsed(await f.request(revisionPath,undefined,null),401);
  const other=revisionPath.replace(caseId,otherCaseId);
  await parsed(await f.request(other,f.input()),422);
  await parsed(await f.request(revisionPath,{...f.input(),base:{number:9,sha256:"c".repeat(64)}}),409);
  await parsed(await f.request(revisionPath,{...f.input(),text:"\u202e"+edited}),400);
  f.raw.prepare("UPDATE case_workspace_access SET role='reviewer' WHERE case_id=?").run(caseId);
  await parsed(await f.request(revisionPath,f.input()),403);
  await parsed(await f.request(revisionPath+"?exportSha256="+"a".repeat(64)),403);
  f.raw.prepare("UPDATE case_workspace_access SET status='revoked' WHERE case_id=?").run(caseId);
  await parsed(await f.request(revisionPath),404);
});

test("same-document extraction change blocks saves and working exports",async()=>{
  const f=await makeRevisionFixture();
  const {revision}=await parsed(await f.request(revisionPath,f.input()),201);
  f.seedObject(f.extractionKey,f.packet+" ");
  const editedRevision=await parsed(await f.request(revisionPath,f.input(baseOf(revision))),409);
  assert.equal(editedRevision.error,"case_response_document_snapshot_changed");
  const check=await parsed(await f.request(revisionPath+"?exportSha256="+revision.sha256),409);
  assert.equal(check.error,"case_response_document_snapshot_changed");
  assert.equal((await parsed(await f.request(revisionPath),200)).head.text,edited);
});

test("stored bytes are checked before display or export",async()=>{
  const f=await makeRevisionFixture();
  const {revision}=await parsed(await f.request(revisionPath,f.input()),201);
  assert.equal(await verifyResponseRevision({...revision,text:"Непотврдена замена."},caseId,1),null);
  const key=caseResponseRevisionKey(caseId,1);
  const {chunk_b64}=f.raw.prepare("SELECT chunk_b64 FROM case_private_object_chunks WHERE object_key=?").get(key);
  const stored=JSON.parse(Buffer.from(chunk_b64,"base64").toString());
  f.seedObject(key,JSON.stringify({...stored,text:"Непотврдена замена."}));
  await parsed(await f.request(revisionPath),503);
  await parsed(await f.request(revisionPath+"/1"),503);
  await parsed(await f.request(revisionPath+"?exportSha256="+revision.sha256),503);
});

test("R2 cursor pages retain ordered history",async()=>{
  const f=await makeRevisionFixture({r2:true});
  let head=null;
  for(let number=1;number<=23;number++){
    const saved=await parsed(await f.request(revisionPath,f.input(head?baseOf(head):null,`Синтетичка ревизија ${number}.`)),201);
    head=saved.revision;
  }
  const page=await parsed(await f.request(),200);
  assert.equal(page.head.number,23);
  assert.deepEqual(page.history,Array.from({length:20},(_,index)=>23-index));
  assert.equal(page.nextBefore,4);
  const older=await parsed(await f.request(revisionPath+"?before=4"),200);
  assert.deepEqual(older.history,[3,2,1]);
  assert.equal(older.head,null);
  assert.equal(older.nextBefore,null);
});

test("server refuses contradictory and missing act headings before saving a response revision",async()=>{
  const f=await makeRevisionFixture();
  for(const [text,error] of [["ЖАЛБА\n\nСинтетички текст.","case_draft_instrument_mismatch"],["Синтетички текст без наслов.","case_draft_instrument_heading_required"]]){
    const result=await parsed(await f.request(revisionPath,{...f.input(),text}),422);
    assert.equal(result.error,error);
  }
  assert.equal((await parsed(await f.request(),200)).head,null);
});
