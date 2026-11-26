import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {parseResponseReview,responseReviewIdentity,sameResponseReviewIdentity,responseWorkflowExists,latestResponseReview,appendResponseReview} from "../src/case-response-review.js";
const caseId="CASE-123e4567-e89b-42d3-a456-426614174000",accountId="synthetic-lawyer",keyHash="a".repeat(64),fingerprint="b".repeat(64);
const revision={number:1,sha256:"c".repeat(64),draftId:"DRAFT-123e4567-e89b-42d3-a456-426614174011",responseSourcesSha256:"d".repeat(64)};
const decisionId=n=>"CAE-00000000-0000-4000-8000-"+String(n).padStart(12,"0");
const body=(extra={})=>({scope:"response_revision",decision:"approved",reason:"Synthetic review only",revision,expectedDecisionId:null,...extra});
// Minimal isolated SQLite schema with the existing D1 column contract. Not a full Worker fixture.
function fixture(){
  const raw=new DatabaseSync(":memory:");
  raw.exec(`CREATE TABLE case_audit_events(id TEXT PRIMARY KEY,case_id TEXT NOT NULL,actor_account_id TEXT NOT NULL,event_type TEXT NOT NULL,object_type TEXT,object_id TEXT,metadata_json TEXT NOT NULL CHECK(length(metadata_json)<=4000),created_at TEXT NOT NULL);
    CREATE TABLE case_workspaces(id TEXT PRIMARY KEY,status TEXT,professional_use_locked INTEGER);
    CREATE TABLE case_workspace_access(case_id TEXT,account_id TEXT,role TEXT,status TEXT,PRIMARY KEY(case_id,account_id));
    CREATE TABLE membership_accounts(id TEXT PRIMARY KEY,status TEXT);
    CREATE TABLE membership_access_keys(account_id TEXT,key_hash TEXT,status TEXT,expires_at TEXT);
    CREATE TABLE membership_entitlements(account_id TEXT,plan_code TEXT,status TEXT,expires_at TEXT);`);
  raw.prepare("INSERT INTO case_workspaces VALUES (?,'active',1)").run(caseId);
  raw.prepare("INSERT INTO case_workspace_access VALUES (?,?,'lawyer','active')").run(caseId,accountId);
  raw.prepare("INSERT INTO membership_accounts VALUES (?,'active')").run(accountId);
  raw.prepare("INSERT INTO membership_access_keys VALUES (?,?,'active',NULL)").run(accountId,keyHash);
  raw.prepare("INSERT INTO membership_entitlements VALUES (?,'pro','active',NULL)").run(accountId);
  const db={prepare(sql){return {bind(...args){return {async first(){return raw.prepare(sql).get(...args)||null},async run(){return {meta:{changes:Number(raw.prepare(sql).run(...args).changes)}}}}}}}};
  const write=(n,input=body(),extra={})=>appendResponseReview(db,{caseId,accountId,keyHash,input,fingerprint,decisionId:decisionId(n),at:"2026-11-25T08:00:00Z",...extra});
  return {raw,db,write};
}
test("strict request rejects client identity, release flag and wrong revision",()=>{
  assert.ok(parseResponseReview(body()));
  for(const b of [body({actorAccountId:"fake"}),body({releaseAuthorized:true}),body({revision:{...revision,sha256:"bad"}}),body({expectedDecisionId:"bad"}),body({reason:"short"}),body({reason:"x".repeat(161)}),body({decision:"unlock"})])assert.equal(parseResponseReview(b),null);
});
test("trusted revision identity requires exact revision and snapshot",()=>{
  const r=responseReviewIdentity({number:revision.number,sha256:revision.sha256,draft:revision});
  assert.deepEqual(r,revision);assert.equal(sameResponseReviewIdentity(r,revision),true);
  for(const change of [{number:2},{sha256:"e".repeat(64)},{responseSourcesSha256:"e".repeat(64)},{draftId:"DRAFT-123e4567-e89b-42d3-a456-426614174012"}])assert.equal(sameResponseReviewIdentity(r,{...revision,...change}),false);
});
test("review receipt binds actor and exact revision, never unlocks",async()=>{
  const f=fixture();assert.equal(await latestResponseReview(f.db,caseId),null);assert.equal(await responseWorkflowExists(f.db,caseId),false);
  assert.equal(await f.write(1),true);const r=await latestResponseReview(f.db,caseId);
  assert.equal(r.reviewerAccountId,accountId);assert.deepEqual(r.revision,revision);assert.equal(r.releaseAuthorized,false);
  assert.equal(f.raw.prepare("SELECT professional_use_locked FROM case_workspaces").get().professional_use_locked,1);
  assert.equal(await responseWorkflowExists(f.db,caseId),true);
});
test("two decisions with same expected head yield one append, revocation preserves history",async()=>{
  const f=fixture(),results=await Promise.all([f.write(1),f.write(2)]);assert.deepEqual(results.sort(),[false,true]);
  const first=await latestResponseReview(f.db,caseId);
  assert.equal(await f.write(3,body({decision:"revoked",expectedDecisionId:first.decisionId})),true);
  const revoked=await latestResponseReview(f.db,caseId);assert.equal(revoked.decision,"revoked");assert.equal(revoked.releaseAuthorized,false);assert.equal(revoked.previousDecisionId,first.decisionId);
  assert.equal(await f.write(4),false);assert.equal(f.raw.prepare("SELECT count(*) AS n FROM case_audit_events").get().n,2);
});
for(const sql of ["UPDATE case_workspace_access SET role='reviewer'","UPDATE case_workspace_access SET status='revoked'","UPDATE case_workspaces SET status='delete_pending'","UPDATE membership_accounts SET status='inactive'","UPDATE membership_access_keys SET status='revoked'","UPDATE membership_entitlements SET status='expired'"]){
  test("write-time authorization rejects "+sql,async()=>{const f=fixture();f.raw.exec(sql);assert.equal(await f.write(1),false);assert.equal(await latestResponseReview(f.db,caseId),null)});
}
test("cross-case and wrong key denied",async()=>{const f=fixture();assert.equal(await f.write(1,body(),{caseId:"other"}),false);assert.equal(await f.write(2,body(),{keyHash:"f".repeat(64)}),false)});
test("receipt corruption fails closed",async()=>{const f=fixture();await f.write(1);f.raw.exec("UPDATE case_audit_events SET metadata_json='{}'");await assert.rejects(()=>latestResponseReview(f.db,caseId),/integrity_failed/)});
test("existing response draft receipt identifies response case, legacy draft does not",async()=>{
  const f=fixture(),insert=f.raw.prepare("INSERT INTO case_audit_events VALUES (?,?,?,'analysis_requested','case_draft',?,?,?)");
  insert.run("old",caseId,accountId,revision.draftId,"{}","2026-11-25");assert.equal(await responseWorkflowExists(f.db,caseId),false);
  insert.run("response",caseId,accountId,revision.draftId,JSON.stringify({responseSourcesSha256:revision.responseSourcesSha256}),"2026-11-25");assert.equal(await responseWorkflowExists(f.db,caseId),true);
});
