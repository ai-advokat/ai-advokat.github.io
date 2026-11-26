import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import test from "node:test";
import {caseResponseHash} from "../src/case-response-sources.js";
import {responseReviewIdentity} from "../src/case-response-review.js";
import {captureCaseResponseAuthorization, caseResponseSourceEpoch, publishCaseResponseExtraction} from "../src/case-response-state.js";
import {captureCaseResponseAuthority, caseResponseApplicability} from "../src/case-response-authority.js";
import {
  captureCaseResponseExportValidation, finalizeCaseResponseExportValidation
} from "../src/case-response-professional-export.js";
import {normalizeCaseExportReport, renderCaseExportDocxBytes} from "../src/case-export.js";
import {resolveInstrumentVersion} from "../src/corpus-versions.js";
import {seedArticles} from "./d1-shim.mjs";
import {CASE_RESPONSE_WORKER_POLICY_SHA256} from "../src/case-response-worker-policy.js";
import {
  authKey, caseId, docId, draftId, makeRevisionFixture, otherCaseId, revisionPath
} from "./case-response-revision-fixture.mjs";
import {renderSyntheticCaseResponsePdf} from "./case-response-pdf-fixture.mjs";

const schema = readFileSync(new URL("../docs/oic2/PROPOSED_ATOMIC_RESPONSE_STATE.sql", import.meta.url), "utf8");
const gatePath = `/api/cases/${caseId}/human-gate`;
const extractionPath = `/api/cases/${caseId}/documents/${docId}/extract`;
const accountId = "p02-test-account";
const objectKey = (path, hash) => `case-derived/v2/${caseId}/${path}/${hash}.json`;

async function read(response, status) {
  const data = await response.json();
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}

function review(revision, expectedDecisionId = null, decision = "approved") {
  return {scope:"response_revision", decision, reason:"Синтетичка адвокатска проверка",
    revision:responseReviewIdentity(revision), expectedDecisionId};
}

const beforeCutover = Date.parse("2026-11-25T22:59:59Z") / 1000;

async function setup(r2,{clock,datedFixture=false}={}) {
  const f = await makeRevisionFixture({r2, transactionalBatch:true});
  f.raw.exec(schema);
  if (clock) f.raw.function("unixepoch",{varargs:true},value=>{
    if (value==="now" || value===undefined) return clock.now;
    if (value===null) return null;
    const text=String(value);
    return Math.floor(Date.parse(text.includes("T")?text:text.replace(" ","T")+"Z")/1000);
  });
  f.raw.prepare("INSERT INTO case_response_legal_policy (slot,sha256) VALUES (1,?)").run(CASE_RESPONSE_WORKER_POLICY_SHA256);
  f.env.CASE_ATOMIC_RESPONSE_ENABLED = "true";
  const source = f.raw.prepare(`INSERT INTO sources (title,url,source_status)
    VALUES ('Synthetic authority', 'https://example.invalid/atomic-authority', 'official')`).run();
  f.authorityId = source.lastInsertRowid;
  f.judgmentId = f.raw.prepare(`INSERT INTO case_law(case_title,court,source_id)
    VALUES ('Synthetic judgment','Synthetic court',?)`).run(f.authorityId).lastInsertRowid;
  f.raw.prepare(`INSERT INTO case_law_provenance
    (case_law_id,source_class,source_provider,source_url,discovery_only,official_binding_verified,human_review_status)
    VALUES (?, 'official_primary','Synthetic court','https://example.invalid/atomic-authority',0,1,'approved')`
  ).run(f.judgmentId);
  if (datedFixture) {
    const key="mk:atomic-temporal-fixture";
    f.temporalInstrument=f.raw.prepare(`INSERT INTO legal_instruments (title,canonical_key)
      VALUES ('Synthetic temporal instrument',?)`).run(key).lastInsertRowid;
    seedArticles(f.raw,key,[{number:"1",text:"First synthetic version"}],{version:{
      label:"old",valid_from:"2024-01-01",valid_to:"2026-11-26",human_review_status:"approved"
    }});
    seedArticles(f.raw,key,[{number:"1",text:"Second synthetic version"}],{version:{
      label:"next",valid_from:"2025-01-01",application_from:"2026-11-26",human_review_status:"approved"
    }});
  }
  f.epoch = () => caseResponseSourceEpoch(f.d1, caseId);
  const keyHash = await caseResponseHash(authKey);
  f.publishExtraction = async (text, expectedEpoch) => {
    const objectSha256 = await caseResponseHash(text);
    f.seedObject(objectKey(`extractions/${docId}`, objectSha256), text);
    return publishCaseResponseExtraction(f.d1, {
      caseId, documentId:docId, sourceSha256:"a".repeat(64), objectSha256,
      expectedEpoch:expectedEpoch ?? await f.epoch(), accountId, keyHash,
      authorization:await captureCaseResponseAuthorization(f.d1,{caseId,accountId,keyHash}),
      auditId:`CAE-${crypto.randomUUID()}`, at:new Date().toISOString(), metadata:JSON.stringify({derivedSha256:objectSha256})
    });
  };
  assert.equal(await f.publishExtraction(f.packet), true);
  const sourceEpoch = await f.epoch();
  const authority = await captureCaseResponseAuthority(f.d1,caseId);
  const snapshot = JSON.stringify({...JSON.parse(f.source.bytes), sourceEpoch, authority});
  const responseSourcesSha256 = await caseResponseHash(snapshot);
  f.raw.prepare("UPDATE case_audit_events SET metadata_json=? WHERE id='audit-p02'")
    .run(JSON.stringify({...f.audit, responseSourcesSha256, sourceEpoch}));
  f.seedObject(`case-derived/v1/${caseId}/drafts/${draftId}.sources.json`, snapshot);
  return f;
}

function pauseBeforeWrite(f, prefix) {
  const prepare = f.d1.prepare;
  let arrived, resume;
  const reached = new Promise(resolve => { arrived = resolve; });
  const paused = new Promise(resolve => { resume = resolve; });
  f.d1.prepare = sql => {
    const statement = prepare(sql);
    if (sql.trimStart().startsWith(prefix)) {
      f.d1.prepare = prepare;
      const run = statement.run;
      statement.run = async () => {
        arrived();
        await paused;
        return run();
      };
    }
    return statement;
  };
  return {reached, resume};
}

for (const r2 of [false,true]) {
  const backend = r2 ? "R2 binding double" : "SQLite D1 object storage";

  test(`${backend}: one D1 head wins concurrent same-parent writes and retry is a replay`, {timeout:10000}, async () => {
    const f = await setup(r2);
    const {revision:first} = await read(await f.request(revisionPath,f.input()), 201);
    const parent = {number:first.number, sha256:first.sha256};
    const inputs = [f.input(parent,"Прва конкурентна верзија"), f.input(parent,"Втора конкурентна верзија")];
    const responses = await Promise.all(inputs.map(input => f.request(revisionPath,input)));
    assert.deepEqual(responses.map(response => response.status).sort(),[201,409]);
    const winner = responses.findIndex(response => response.status===201);
    const {revision} = await read(responses[winner],201);
    const replay = await read(await f.request(revisionPath,inputs[winner]),200);
    assert.equal(replay.replayed,true);
    assert.equal(replay.revision.sha256,revision.sha256);
    const list = await read(await f.request(revisionPath),200);
    assert.deepEqual(list.history,[2,1]);
    assert.equal(list.head.sha256,revision.sha256);
    if(r2) assert.ok(f.conditions.every(condition => condition==="*"));
  });

  test(`${backend}: A → B → A during review CAS cannot revive an old receipt`, {timeout:10000}, async t => {
    const f = await setup(r2);
    const initialEpoch = await f.epoch();
    const {revision} = await read(await f.request(revisionPath,f.input()),201);
    const {review:approved} = await read(await f.request(gatePath,review(revision)),201);
    assert.equal(approved.sourceEpoch,initialEpoch);
    assert.equal(approved.releaseAuthorized,false);
    const gate = pauseBeforeWrite(f,"INSERT INTO case_audit_events");
    t.after(gate.resume);
    const pending = f.request(gatePath,review(revision,approved.decisionId));
    await gate.reached;
    const changed = f.packet.replace("12.000","13.000");
    assert.equal(await f.publishExtraction(changed,initialEpoch),true);
    const changedEpoch = await f.epoch();
    assert.ok(changedEpoch>initialEpoch);
    assert.equal(await f.publishExtraction(f.packet,changedEpoch),true);
    assert.ok(await f.epoch()>changedEpoch);
    gate.resume();
    await read(await pending,409);
    const stale = await read(await f.request(gatePath,review(revision,approved.decisionId)),409);
    assert.equal(stale.error,"case_response_atomic_state_conflict");
    const current = await read(await f.request(gatePath),200);
    assert.equal(current.review.decisionId,approved.decisionId);
    assert.equal(current.gate.effectiveApproved,false);
    await read(await f.request(gatePath,review(revision,approved.decisionId,"revoked")),201);
    await read(await f.request(`/api/cases/${caseId}/exports`,{
      format:"docx",mode:"professional",report:{title:"Синтетички предмет"}
    }),409);
  });

  test(`${backend}: a staged object is invisible before D1 publication and a crash is retryable`, {timeout:10000}, async () => {
    const f = await setup(r2);
    const input = f.input();
    const prepare = f.d1.prepare;
    f.d1.prepare = sql => {
      const statement = prepare(sql);
      if (sql.trimStart().startsWith("INSERT INTO case_response_revision_publications")) {
        f.d1.prepare = prepare;
        statement.run = async () => { throw new Error("synthetic interruption"); };
      }
      return statement;
    };
    await read(await f.request(revisionPath,input),503);
    assert.deepEqual((await read(await f.request(revisionPath),200)).history,[]);
    await read(await f.request(`${revisionPath}/1`),404);
    const {revision} = await read(await f.request(revisionPath,input),201);
    const publication = f.raw.prepare("SELECT object_sha256 FROM case_response_revision_publications").get();
    f.seedObject(objectKey("revisions/1",publication.object_sha256), "{}");
    assert.equal((await read(await f.request(`${revisionPath}/1`),503)).error,"case_response_revision_integrity_failed");
    assert.equal((await read(await f.request(gatePath,review(revision)),503)).gate,undefined);
  });

  test(`${backend}: a newer revision or revoked role wins before review commit`, {timeout:10000}, async t => {
    const f = await setup(r2);
    const {revision:first} = await read(await f.request(revisionPath,f.input()),201);
    const gate = pauseBeforeWrite(f,"INSERT INTO case_audit_events");
    t.after(gate.resume);
    const pending = f.request(gatePath,review(first));
    await gate.reached;
    const {revision:second} = await read(await f.request(revisionPath,f.input({number:1,sha256:first.sha256})),201);
    assert.equal(second.text,first.text);
    assert.notEqual(second.sha256,first.sha256);
    gate.resume();
    await read(await pending,409);

    const next = pauseBeforeWrite(f,"INSERT INTO case_audit_events");
    t.after(next.resume);
    const pendingRole = f.request(gatePath,review(second));
    await next.reached;
    f.raw.prepare("UPDATE case_workspace_access SET role='reviewer' WHERE case_id=?").run(caseId);
    next.resume();
    await read(await pendingRole,409);
    assert.equal(f.raw.prepare("SELECT COUNT(*) AS n FROM case_audit_events WHERE event_type='human_gate_recorded'").get().n,0);
  });

  test(`${backend}: a revoked and restored grant cannot complete a paused revision write`, {timeout:10000}, async t => {
    const f = await setup(r2);
    const pause = pauseBeforeWrite(f,"INSERT INTO case_response_revision_publications");
    t.after(pause.resume);
    const pending = f.request(revisionPath,f.input());
    await pause.reached;
    f.raw.prepare("UPDATE case_workspace_access SET status='revoked' WHERE case_id=?").run(caseId);
    f.raw.prepare("UPDATE case_workspace_access SET status='active' WHERE case_id=?").run(caseId);
    pause.resume();
    await read(await pending,409);
    assert.deepEqual((await read(await f.request(revisionPath),200)).history,[]);
    await read(await f.request(revisionPath,f.input()),201);
  });

  test(`${backend}: a source withdrawn and restored while review is paused stays stale`, {timeout:10000}, async t => {
    const f = await setup(r2);
    const {revision} = await read(await f.request(revisionPath,f.input()),201);
    const {review:prior} = await read(await f.request(gatePath,review(revision)),201);
    assert.equal(prior.authorityStale,false);
    const sourceEpoch = await f.epoch();
    const gate = pauseBeforeWrite(f,"INSERT INTO case_audit_events");
    t.after(gate.resume);
    const pending = f.request(gatePath,review(revision,prior.decisionId));
    await gate.reached;
    const update = f.raw.prepare("UPDATE sources SET source_status=? WHERE id=?");
    update.run("pending",f.authorityId);
    update.run("official",f.authorityId);
    gate.resume();
    await read(await pending,409);
    assert.equal(await f.epoch(),sourceEpoch);
    const historic = (await read(await f.request(gatePath),200)).review;
    assert.equal(historic.decisionId,prior.decisionId);
    assert.equal(historic.authorityStale,true);
    assert.equal(historic.authorizationStale,false);
    assert.equal(historic.releaseAuthorized,false);
    const staleReview = await read(await f.request(gatePath,review(revision,prior.decisionId)),409);
    assert.equal(staleReview.error,"case_response_authority_changed");
    const staleRevision = await read(await f.request(revisionPath,f.input({number:1,sha256:revision.sha256})),409);
    assert.equal(staleRevision.error,"case_response_authority_changed");
    await read(await f.request(gatePath,review(revision,prior.decisionId,"revoked")),201);
  });

  test(`${backend}: Worker publishes exactly one competing extraction with matching audit and epoch`, {timeout:10000}, async () => {
    const f = await makeRevisionFixture({r2,transactionalBatch:true});
    f.raw.exec(schema);
    f.env.CASE_ATOMIC_RESPONSE_ENABLED = "true";
    const original = "%PDF-1.4 synthetic local test";
    const key = `case-files/v1/${caseId}/${docId}`;
    f.seedObject(key,original);
    f.raw.prepare("UPDATE case_document_slots SET storage_key=?,sha256=?,extraction_state='pending' WHERE id=?")
      .run(key,await caseResponseHash(original),docId);
    const initial = await caseResponseSourceEpoch(f.d1,caseId);
    let release, calls=0;
    const bothRunning = new Promise(resolve => { release=resolve; });
    Object.assign(f.env,{FREE_CHAT_PROVIDER:"workers_ai",WORKERS_AI_MARKDOWN_ENABLED:"true",AI:{
      toMarkdown:async()=>[{format:"text",data:"Синтетички документ за локален тест."}],
      run:async()=>{
        const ordinal=++calls;
        if(calls===2) release();
        await bothRunning;
        return {response:JSON.stringify({
          document_type:"appeal",summary:`Тест ${ordinal}`,entities:[],dates:[],property_refs:[],contracts:[],facts:[],
          legal_issue_hints:[],missing_context:[],extraction_warnings:[]
        })};
      }
    }});
    const responses = await Promise.all([f.request(extractionPath,{}),f.request(extractionPath,{})]);
    assert.deepEqual(responses.map(response => response.status).sort(),[200,409]);
    const successful = await read(responses.find(response => response.status===200),200);
    const failed = await read(responses.find(response => response.status===409),409);
    assert.equal(failed.error,"case_response_atomic_state_conflict");
    const pointer = f.raw.prepare("SELECT * FROM case_response_extraction_heads WHERE document_id=?").get(docId);
    assert.equal(pointer.object_sha256, successful.derivedSha256);
    assert.equal(f.raw.prepare("SELECT extraction_state FROM case_document_slots WHERE id=?").get(docId).extraction_state,"complete");
    const audits = f.raw.prepare("SELECT id,metadata_json FROM case_audit_events WHERE object_id=?").all(docId);
    assert.equal(audits.length,1);
    assert.equal(audits[0].id,pointer.operation_id);
    assert.equal(JSON.parse(audits[0].metadata_json).derivedSha256,pointer.object_sha256);
    assert.ok(await caseResponseSourceEpoch(f.d1,caseId)>initial);

    const batch = f.d1.batch;
    f.d1.batch = statements => {
      f.d1.batch = batch;
      f.raw.exec("UPDATE membership_access_keys SET status='revoked' WHERE id='p02-test-key'");
      f.raw.exec("UPDATE membership_access_keys SET status='active' WHERE id='p02-test-key'");
      return batch(statements);
    };
    assert.equal((await read(await f.request(extractionPath,{}),409)).error,"case_response_atomic_state_conflict");
    assert.equal(f.raw.prepare("SELECT operation_id FROM case_response_extraction_heads").get().operation_id,pointer.operation_id);
  });
}

test("case classification ages only the review for the affected case", async () => {
  const f = await setup(false);
  const {revision} = await read(await f.request(revisionPath,f.input()),201);
  const {review:prior} = await read(await f.request(gatePath,review(revision)),201);
  const insert = f.raw.prepare(`INSERT INTO casepilot_authority_classifications
    (id,case_id,case_law_id,role,reason,classified_by_account_id)
    VALUES (?, ?, ?, 'adverse', 'Synthetic classification', ?)`);
  insert.run("other-classification",otherCaseId,f.judgmentId,accountId);
  assert.equal((await read(await f.request(gatePath),200)).review.authorityStale,false);
  insert.run("own-classification",caseId,f.judgmentId,accountId);
  f.raw.prepare("DELETE FROM casepilot_authority_classifications WHERE id='own-classification'").run();
  const receipt = (await read(await f.request(gatePath),200)).review;
  assert.equal(receipt.decisionId,prior.decisionId);
  assert.equal(receipt.authorityStale,true);
  const audit = await read(await f.request(`/api/cases/${caseId}/audit`),200);
  assert.equal(JSON.parse(audit.events.find(event=>event.id===prior.decisionId).metadata_json).authority,undefined);
});

test("withdrawal of an official judgment binding ages the existing review", async () => {
  const f = await setup(false);
  const {revision} = await read(await f.request(revisionPath,f.input()),201);
  const {review:prior} = await read(await f.request(gatePath,review(revision)),201);
  f.raw.prepare("UPDATE case_law_provenance SET official_binding_verified=0 WHERE case_law_id=?").run(f.judgmentId);
  const history = (await read(await f.request(gatePath),200)).review;
  assert.equal(history.decisionId,prior.decisionId);
  assert.equal(history.authorityStale,true);
});

test("a corpus change before the revision publication CAS prevents a stale draft from publishing", {timeout:10000}, async t => {
  const f = await setup(true);
  const pause = pauseBeforeWrite(f,"INSERT INTO case_response_revision_publications");
  t.after(pause.resume);
  const pending = f.request(revisionPath,f.input());
  await pause.reached;
  f.raw.prepare("UPDATE sources SET title='Changed synthetic authority' WHERE id=?").run(f.authorityId);
  pause.resume();
  await read(await pending,409);
  assert.deepEqual((await read(await f.request(revisionPath),200)).history,[]);
});

test("loss of the registered Worker policy or a mixed release blocks revisions from the old draft", async () => {
  const f = await setup(false);
  f.raw.exec("DELETE FROM case_response_legal_policy WHERE slot=1");
  assert.equal(await captureCaseResponseAuthority(f.d1,caseId),null);
  assert.equal((await read(await f.request(revisionPath,f.input()),409)).error,"case_response_authority_changed");
  f.raw.prepare("INSERT INTO case_response_legal_policy (slot,sha256) VALUES (1,?)").run("f".repeat(64));
  assert.equal(await captureCaseResponseAuthority(f.d1,caseId),null);
  assert.equal((await read(await f.request(revisionPath,f.input()),409)).error,"case_response_authority_changed");
});

test("rollback to the original Worker digest during review does not revive the decision", {timeout:10000}, async t => {
  const f = await setup(true);
  const {revision} = await read(await f.request(revisionPath,f.input()),201);
  assert.equal(revision.draft.authority.policySha256,CASE_RESPONSE_WORKER_POLICY_SHA256);
  const {review:prior} = await read(await f.request(gatePath,review(revision)),201);
  const gate = pauseBeforeWrite(f,"INSERT INTO case_audit_events");
  t.after(gate.resume);
  const pending = f.request(gatePath,review(revision,prior.decisionId));
  await gate.reached;
  const promote = f.raw.prepare("UPDATE case_response_legal_policy SET sha256=? WHERE slot=1");
  promote.run("f".repeat(64));
  promote.run(CASE_RESPONSE_WORKER_POLICY_SHA256);
  gate.resume();
  await read(await pending,409);
  const receipt = (await read(await f.request(gatePath),200)).review;
  assert.equal(receipt.decisionId,prior.decisionId);
  assert.equal(receipt.authorityStale,true);
  assert.equal(receipt.releaseAuthorized,false);
});

test("the Skopje civil-day cutoff follows both DST transitions", () => {
  const spring=Date.parse("2026-03-28T23:00:00Z")/1000;
  const autumn=Date.parse("2026-10-24T22:00:00Z")/1000;
  assert.deepEqual(caseResponseApplicability(spring),{referenceDate:"2026-03-29",checkedAt:spring,validUntil:spring+23*3600});
  assert.deepEqual(caseResponseApplicability(autumn),{referenceDate:"2026-10-25",checkedAt:autumn,validUntil:autumn+25*3600});
});

test("local midnight changes the applicable version and stales a paused review without a D1 write", {timeout:10000}, async t => {
  const clock={now:beforeCutover};
  const f=await setup(true,{clock,datedFixture:true});
  const original=await captureCaseResponseAuthority(f.d1,caseId);
  assert.equal(original.applicability.referenceDate,"2026-11-25");
  const select=date=>resolveInstrumentVersion(f.env,f.temporalInstrument,{date});
  assert.equal((await select(original.applicability.referenceDate)).version.version_label,"old");
  const {revision}=await read(await f.request(revisionPath,f.input()),201);
  const {review:prior}=await read(await f.request(gatePath,review(revision)),201);
  const gate=pauseBeforeWrite(f,"INSERT INTO case_audit_events");
  t.after(gate.resume);
  const pending=f.request(gatePath,review(revision,prior.decisionId));
  await gate.reached;
  const changes=f.raw.prepare("SELECT total_changes() AS n");
  const before=changes.get().n;
  clock.now=original.applicability.validUntil;
  const after=await captureCaseResponseAuthority(f.d1,caseId);
  assert.equal(after.applicability.referenceDate,"2026-11-26");
  assert.equal(after.registryEpoch,original.registryEpoch);
  assert.equal((await select(after.applicability.referenceDate)).version.version_label,"next");
  gate.resume();
  await read(await pending,409);
  const current=(await read(await f.request(gatePath),200)).review;
  assert.equal(current.decisionId,prior.decisionId);
  assert.equal(current.authorityStale,true);
  assert.equal(changes.get().n,before);
});

async function prepareExport(f,input=f.input()) {
  const {revision}=await read(await f.request(revisionPath,input),201);
  const {review:approved}=await read(await f.request(gatePath,review(revision)),201);
  const identity={caseId,accountId,keyHash:await caseResponseHash(authKey),revision,decisionId:approved.decisionId};
  assert.equal(await captureCaseResponseExportValidation(f.d1,identity),null);
  f.raw.exec("UPDATE case_response_export_validation_policy SET hold_active=0,epoch=epoch+1 WHERE slot=1");
  const check=await captureCaseResponseExportValidation(f.d1,identity);
  assert.ok(check);
  const model=normalizeCaseExportReport({
    caseId,title:"Изолиран синтетички модел",summary:revision.text,caseVersion:revision.sha256,
    generatedAt:approved.decidedAt
  },{mode:"professional",serverHumanGate:{
    status:"approved",reviewer:"Синтетички преглед",decidedAt:approved.decidedAt,decisionRef:approved.decisionId
  }});
  return {approved,revision,check,model};
}

function renderExport(model,format,render) {
  const modelBytes=new TextEncoder().encode(JSON.stringify(model));
  return {format,modelBytes,artifactBytes:render(JSON.parse(new TextDecoder().decode(modelBytes)))};
}

test("isolated final validation binds actual server-rendered DOCX bytes while the HTTP route holds professional delivery", async () => {
  const f=await setup(false);
  const {check,model,approved}=await prepareExport(f);
  const rendered=renderExport(model,"docx",renderCaseExportDocxBytes);
  const receipt=await finalizeCaseResponseExportValidation(f.d1,check,rendered);
  assert.equal(receipt.releaseAuthorized,false);
  assert.equal(rendered.artifactBytes[0],0x50);
  assert.equal(rendered.artifactBytes[1],0x4b);
  const saved=f.raw.prepare("SELECT * FROM case_response_export_validation_receipts WHERE id=?").get(receipt.receiptId);
  assert.equal(saved.decision_id,approved.decisionId);
  assert.equal(saved.artifact_sha256,receipt.artifactSha256);
  for (const format of ["docx","pdf"]) {
    const response=await f.request(`/api/cases/${caseId}/exports`,{format,mode:"professional"});
    assert.equal(response.headers.get("Content-Disposition"),null);
    assert.equal((await read(response,409)).legalHold,"ACTIVE");
  }
});

const lateExportChanges=[
  ["new head",async (f,{revision})=>read(await f.request(revisionPath,f.input({number:revision.number,sha256:revision.sha256})),201)],
  ["revoked decision",async (f,{revision,approved})=>read(await f.request(gatePath,review(revision,approved.decisionId,"revoked")),201)],
  ["restored source contents",async f=>{
    assert.equal(await f.publishExtraction(f.packet.replace("12.000","13.000")),true);
    assert.equal(await f.publishExtraction(f.packet),true);
  }],
  ["changed authority",f=>f.raw.prepare("UPDATE sources SET title='Updated synthetic authority' WHERE id=?").run(f.authorityId)],
  ["restored authorization",f=>f.raw.exec(`UPDATE case_workspace_access SET status='revoked' WHERE case_id='${caseId}';
    UPDATE case_workspace_access SET status='active' WHERE case_id='${caseId}'`)],
  ["reactivated then cleared hold",f=>f.raw.exec(`UPDATE case_response_export_validation_policy SET hold_active=1,epoch=epoch+1 WHERE slot=1;
    UPDATE case_response_export_validation_policy SET hold_active=0,epoch=epoch+1 WHERE slot=1`)],
  ["time-only cutoff",(_f,_data,clock)=>{clock.now=beforeCutover+1;}]
];

test("final conditional DOCX validation refuses late changes after server rendering", async t => {
  for (const [name,change] of lateExportChanges) await t.test(name,async()=>{
    const clock={now:beforeCutover};
    const f=await setup(false,{clock});
    const data=await prepareExport(f);
    const rendered=renderExport(data.model,"docx",renderCaseExportDocxBytes);
    await change(f,data,clock);
    assert.equal(await finalizeCaseResponseExportValidation(f.d1,data.check,rendered),null);
    assert.equal(f.raw.prepare("SELECT COUNT(*) AS n FROM case_response_export_validation_receipts").get().n,0);
  });
});

test("isolated server PDF renders selectable Cyrillic and binds the exact bytes to the final D1 write", {
  skip:process.env.CASE_RESPONSE_PDF_TEST!=="1"
}, async t=>{
  const privateNote="PRIVATE_SYNTHETIC_REVIEW_NOTE_DO_NOT_EXPORT";
  const cyrillic="Ѓорѓи, Ќиро, Љупчо, Његош и Ѕвезда";
  const special="Синтетички доказ <предлог> & одговор.";
  const paragraph="Ова е вештачки текст за проверка на редоследот, кирилицата и преминот меѓу страниците.";
  const longText=[cyrillic,special,...Array(45).fill(paragraph),"Крај на синтетичкиот текст."].join("\n\n");
  const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");

  await t.test("real multipage PDF, exact receipt digests and professional HTTP hold",async subtest=>{
    const f=await setup(true);
    const {check,model,revision,approved}=await prepareExport(f,{...f.input(null,longText),note:privateNote});
    const rendered=renderExport(model,"pdf",renderSyntheticCaseResponsePdf);
    const pdf=rendered.artifactBytes;
    assert.match(pdf.subarray(0,8).toString(),/^%PDF-1\./);
    const extracted=execFileSync("pdftotext",["-enc","UTF-8","-","-"],{input:pdf,encoding:"utf8"});
    const pages=extracted.split("\f").filter(page=>page.trim());
    assert.ok(pages.length>=2);
    for (const [index,page] of pages.entries()) {
      assert.ok(page.includes("СИНТЕТИЧКИ ТЕСТ"));
      assert.ok(page.includes(`Страница ${index+1}`));
    }
    assert.ok(extracted.includes(cyrillic));
    assert.ok(extracted.includes(special));
    assert.equal(extracted.replace(/\s+/gu," ").split(paragraph).length-1,45);
    assert.ok(pages.at(-1).includes("Крај на синтетичкиот текст."));
    assert.ok(!extracted.includes(privateNote));
    assert.ok(!Buffer.from(rendered.modelBytes).includes(privateNote));
    const info=execFileSync("pdfinfo",["-"],{input:pdf,encoding:"utf8"});
    assert.match(info,/Page size:\s+595\.2[78][0-9]* x 841\.89[0-9]* pts \(A4\)/);
    assert.match(info,/JavaScript:\s+no/);
    const temp=mkdtempSync(join(tmpdir(),"case-export-pdf-"));
    subtest.after(()=>rmSync(temp,{recursive:true,force:true}));
    const sample=join(temp,"fixture.pdf");
    writeFileSync(sample,pdf);
    assert.match(execFileSync("pdfdetach",["-list",sample],{encoding:"utf8"}),/^0 embedded files/);
    const receipt=await finalizeCaseResponseExportValidation(f.d1,check,rendered);
    assert.ok(receipt);
    assert.deepEqual(receipt,{
      receiptId:receipt.receiptId,modelSha256:sha256(rendered.modelBytes),artifactSha256:sha256(pdf),releaseAuthorized:false
    });
    const saved=f.raw.prepare(`SELECT decision_id,revision_sha256,format,model_sha256,artifact_sha256
      FROM case_response_export_validation_receipts WHERE id=?`).get(receipt.receiptId);
    assert.deepEqual({...saved},{
      decision_id:approved.decisionId,revision_sha256:revision.sha256,format:"pdf",
      model_sha256:receipt.modelSha256,artifact_sha256:receipt.artifactSha256
    });
    const response=await f.request(`/api/cases/${caseId}/exports`,{format:"pdf",mode:"professional"});
    assert.equal(response.headers.get("Content-Disposition"),null);
    assert.match(response.headers.get("Content-Type"),/^application\/json\b/);
    assert.equal((await read(response,409)).legalHold,"ACTIVE");
    const evidence=process.env.CASE_RESPONSE_PDF_EVIDENCE_DIR;
    if(evidence) {
      writeFileSync(join(evidence,"SYNTHETIC_SERVER_PDF.pdf"),pdf);
      writeFileSync(join(evidence,"SYNTHETIC_MODEL.json"),rendered.modelBytes);
      writeFileSync(join(evidence,"D1_VALIDATION_RECEIPT.json"),JSON.stringify({caseId,...saved,...receipt},null,2)+"\n");
    }
  });

  for (const [name,change] of lateExportChanges) await t.test(name,{timeout:15000},async subtest=>{
    const clock={now:beforeCutover};
    const f=await setup(false,{clock,datedFixture:true});
    const data=await prepareExport(f);
    const rendered=renderExport(data.model,"pdf",renderSyntheticCaseResponsePdf);
    const beforeWrite=pauseBeforeWrite(f,"INSERT INTO case_response_export_validation_receipts");
    subtest.after(beforeWrite.resume);
    const pending=finalizeCaseResponseExportValidation(f.d1,data.check,rendered);
    await Promise.race([beforeWrite.reached,pending.then(()=>assert.fail("D1 write was not reached"))]);
    const before=f.raw.prepare("SELECT total_changes() AS n").get().n;
    await change(f,data,clock);
    beforeWrite.resume();
    assert.equal(await pending,null);
    assert.equal(f.raw.prepare("SELECT COUNT(*) AS n FROM case_response_export_validation_receipts").get().n,0);
    if(name==="time-only cutoff") {
      assert.equal(f.raw.prepare("SELECT total_changes() AS n").get().n,before);
      const applicability=(await captureCaseResponseAuthority(f.d1,caseId)).applicability;
      assert.equal(applicability.referenceDate,"2026-11-26");
      const selected=await resolveInstrumentVersion(f.env,f.temporalInstrument,{date:applicability.referenceDate});
      assert.equal(selected.version.version_label,"next");
    }
  });
});

const authorizationTransitions=[
  ["case_workspace_access","role","reviewer","lawyer","case_id",caseId],
  ["membership_access_keys","status","revoked","active","id","p02-test-key"],
  ["membership_entitlements","status","expired","active","id","p02-test-plan"],
  ["membership_accounts","status","suspended","active","id",accountId],
  ["case_workspaces","status","closed","active","id",caseId]
];
for (const [table, column, changed, restored, identityColumn, identity] of authorizationTransitions) {
  test(`${table}: loss and restoration before review commit denies the old operation`, {timeout:10000}, async t => {
    const f = await setup(false);
    const {revision} = await read(await f.request(revisionPath,f.input()),201);
    const {review:prior} = await read(await f.request(gatePath,review(revision)),201);
    assert.equal(prior.authorizationStale,false);

    const pause = pauseBeforeWrite(f,"INSERT INTO case_audit_events");
    t.after(pause.resume);
    const pending = f.request(gatePath,review(revision,prior.decisionId));
    await pause.reached;
    const update = f.raw.prepare(`UPDATE ${table} SET ${column}=? WHERE ${identityColumn}=?`);
    update.run(changed,identity);
    update.run(restored,identity);
    pause.resume();
    assert.equal((await read(await pending,409)).error,"case_response_review_conflict_or_access_changed");
    const stale = await read(await f.request(gatePath),200);
    assert.equal(stale.review.decisionId,prior.decisionId);
    assert.equal(stale.review.authorizationStale,true);
    assert.equal(stale.gate.effectiveApproved,false);
    const fresh = await read(await f.request(gatePath,review(revision,prior.decisionId)),201);
    assert.equal(fresh.review.authorizationStale,false);
    assert.equal(fresh.review.releaseAuthorized,false);
  });
}

test("authorization is scoped, preserves history and excludes internal expiry from public receipts", async () => {
  const f = await setup(false);
  const {revision} = await read(await f.request(revisionPath,f.input()),201);
  const {review:decision} = await read(await f.request(gatePath,review(revision)),201);
  f.raw.prepare("UPDATE case_workspace_access SET status='revoked' WHERE case_id<>?").run(caseId);
  f.raw.prepare("UPDATE membership_access_keys SET last_used_at=CURRENT_TIMESTAMP").run();
  assert.equal((await read(await f.request(gatePath),200)).review.authorizationStale,false);
  const audit = await read(await f.request(`/api/cases/${caseId}/audit`),200);
  const event = audit.events.find(event => event.id===decision.decisionId);
  assert.equal(JSON.parse(event.metadata_json).authorization,undefined);

  const key = f.raw.prepare("SELECT * FROM membership_access_keys WHERE id='p02-test-key'").get();
  f.raw.prepare("DELETE FROM membership_access_keys WHERE id=?").run(key.id);
  f.raw.prepare(`INSERT INTO membership_access_keys (${Object.keys(key).join(",")})
    VALUES (${Object.keys(key).map(()=>"?").join(",")})`).run(...Object.values(key));
  const historic = (await read(await f.request(gatePath),200)).review;
  assert.equal(historic.decisionId,decision.decisionId);
  assert.equal(historic.authorizationStale,true);
  await read(await f.request(gatePath,review(revision,decision.decisionId,"revoked")),201);
});

test("the original key's scheduled expiry makes the record stale even with another valid key", async () => {
  const f = await setup(false);
  const secondKey = "LOCAL-SECOND-KEY";
  f.raw.prepare(`INSERT INTO membership_access_keys (id,account_id,key_hash,key_prefix)
    VALUES ('second-test-key',?,?,'local')`).run(accountId,await caseResponseHash(secondKey));
  const deadline = Math.floor(Date.now()/1000)+3600;
  f.raw.prepare("UPDATE membership_access_keys SET expires_at=datetime(?,'unixepoch') WHERE id='p02-test-key'").run(deadline);
  const {revision} = await read(await f.request(revisionPath,f.input()),201);
  await read(await f.request(gatePath,review(revision)),201);
  assert.equal((await read(await f.request(gatePath,null,secondKey),200)).review.authorizationStale,false);
  f.raw.function("unixepoch", {varargs:true}, () => deadline);
  assert.equal((await read(await f.request(gatePath,null,secondKey),200)).review.authorizationStale,true);
});

test("expiry of the selected plan makes the receipt stale even when a later request can select a different plan", async () => {
  const f = await setup(false);
  const deadline = Math.floor(Date.now()/1000)+3600;
  f.raw.prepare(`INSERT INTO membership_entitlements (id,account_id,plan_code,monthly_quota,updated_at)
    VALUES ('fallback-test-plan',?,'office',100,'2020-01-01 00:00:00')`).run(accountId);
  f.raw.prepare("UPDATE membership_entitlements SET expires_at=datetime(?,'unixepoch') WHERE id='p02-test-plan'").run(deadline);
  const {revision} = await read(await f.request(revisionPath,f.input()),201);
  await read(await f.request(gatePath,review(revision)),201);
  assert.equal((await read(await f.request(gatePath),200)).review.authorizationStale,false);
  f.raw.function("unixepoch", {varargs:true}, () => deadline);
  assert.equal((await read(await f.request(gatePath),200)).review.authorizationStale,true);
});

test("an enabled Worker with no proposed schema fails closed without falling back to legacy revision writes", async () => {
  const f = await makeRevisionFixture();
  f.env.CASE_ATOMIC_RESPONSE_ENABLED = "true";
  await read(await f.request(revisionPath,f.input()),503);
  f.env.CASE_ATOMIC_RESPONSE_ENABLED = "false";
  assert.deepEqual((await read(await f.request(revisionPath),200)).history,[]);
});

test("atomic mode refuses to fork an existing legacy revision history", async () => {
  const f = await makeRevisionFixture();
  const {revision} = await read(await f.request(revisionPath,f.input()),201);
  f.raw.exec(schema);
  f.env.CASE_ATOMIC_RESPONSE_ENABLED = "true";
  assert.equal((await read(await f.request(revisionPath,f.input()),409)).error,"case_response_atomic_legacy_history");
  f.env.CASE_ATOMIC_RESPONSE_ENABLED = "false";
  assert.equal((await read(await f.request(revisionPath),200)).head.sha256,revision.sha256);
});
