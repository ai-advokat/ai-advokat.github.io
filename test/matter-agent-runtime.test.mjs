import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createMatterSpace, authorizeSpaceActor, inheritSpaceContext, createPlanPreview,
  approvePlanPreview, dispatchParallelTasks, transitionTask, createRuntimeNudge,
  completeTaskWithEvidence, buildAuditEvent, appendAuditEvent, matterRuntimeSnapshot
} from "../src/matter-agent-runtime.js";

const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");

function space(){
  return createMatterSpace({
    spaceId:"matter-1",matterRef:"ZOKI-1",label:"Matter 1",
    authorizedPrincipals:["zoki"],ethicalWallTags:["wall-a"],
    sourceUniverse:["official source","matter docs"],playbooks:["source-first"],
    memory:{outputLanguage:"mk",citationStyle:"source-first",workspaceRef:"matter-1"}
  });
}

test("matter Space enforces principal access and ethical walls",()=>{
  const s=space();
  assert.equal(authorizeSpaceActor(s,{actorId:"zoki",actorWallTags:["wall-a"]}).allowed,true);
  assert.equal(authorizeSpaceActor(s,{actorId:"zoki",actorWallTags:[]}).allowed,false);
  assert.equal(authorizeSpaceActor(s,{actorId:"other",actorWallTags:["wall-a"]}).allowed,false);
  assert.throws(()=>inheritSpaceContext(s,{actorId:"other",actorWallTags:["wall-a"],agentId:"matter_analyst"}),/space_access_denied/);
});

test("agent context is Space-scoped and consequential actions remain locked",()=>{
  const s=space();
  const ctx=inheritSpaceContext(s,{actorId:"zoki",actorWallTags:["wall-a"],agentId:"contract_reviewer"});
  assert.equal(ctx.spaceId,"matter-1");
  assert.equal(ctx.isolation.crossSpaceDataAccess,false);
  assert.equal(ctx.permissions.externalTransmission,false);
  assert.equal(ctx.permissions.consequentialActions,false);
});

test("plan cannot dispatch before Human approval and cannot cross Spaces",()=>{
  const s=space();
  const p=createPlanPreview({planId:"p1",space:s,templateId:"litigation_case_review",objective:"Review matter",requestedBy:"zoki"});
  assert.equal(p.state,"awaiting_plan_approval");
  assert.throws(()=>dispatchParallelTasks(p,s,{actorId:"zoki",actorWallTags:["wall-a"]}),/plan_not_approved/);
  const approved=approvePlanPreview(p,{reviewerId:"zoki",approved:true});
  const tasks=dispatchParallelTasks(approved,s,{actorId:"zoki",actorWallTags:["wall-a"]});
  assert.ok(tasks.length>=3);
  const s2=createMatterSpace({spaceId:"matter-2",matterRef:"ZOKI-2",label:"Matter 2",authorizedPrincipals:["zoki"],ethicalWallTags:["wall-a"]});
  assert.throws(()=>dispatchParallelTasks(approved,s2,{actorId:"zoki",actorWallTags:["wall-a"]}),/cross_space_plan_forbidden/);
});

test("parallel task lifecycle supports Human Nudges and cited completion",()=>{
  const s=space();
  const p=approvePlanPreview(createPlanPreview({planId:"p2",space:s,templateId:"legal_research_memo",objective:"Research issue",requestedBy:"zoki"}),{reviewerId:"zoki"});
  let [t]=dispatchParallelTasks(p,s,{actorId:"zoki",actorWallTags:["wall-a"]});
  t=transitionTask(t,{to:"running",actorId:"zoki"});
  const n=createRuntimeNudge(t,{reason:"Need lawyer choice",question:"Which theory should control?",sourceRefs:["official source"]});
  assert.equal(n.state,"awaiting_human_judgment");
  assert.throws(()=>completeTaskWithEvidence(t,{summary:"No sources",sourceRefs:[]}),/source_refs_required/);
  const done=completeTaskWithEvidence(t,{summary:"Review-ready findings",sourceRefs:["official source#1"]});
  assert.equal(done.state,"completed");
  assert.equal(done.result.reviewState,"review_ready_not_released");
  assert.equal(done.humanReviewRequired,true);
});

test("forbidden agent actions are blocked by runtime transitions",()=>{
  const s=space();
  const p=approvePlanPreview(createPlanPreview({planId:"p3",space:s,templateId:"contract_review",objective:"Review contract",requestedBy:"zoki"}),{reviewerId:"zoki"});
  const [t]=dispatchParallelTasks(p,s,{actorId:"zoki",actorWallTags:["wall-a"]});
  assert.throws(()=>transitionTask(t,{to:"running",actorId:"zoki",action:"sign_contract"}),/forbidden_agent_action/);
});

test("audit log is append-only by event id and snapshot uses real supplied state",()=>{
  const s=space();
  const event=buildAuditEvent({eventId:"e1",spaceId:s.spaceId,actorId:"zoki",actorType:"human",action:"created",objectType:"space",objectId:s.spaceId});
  const log=appendAuditEvent([],event);
  assert.equal(log.length,1);
  assert.throws(()=>appendAuditEvent(log,event),/duplicate_audit_event/);
  const snap=matterRuntimeSnapshot({space:s,auditLog:log});
  assert.equal(snap.metrics.auditEvents,1);
  assert.equal(snap.boundaries.consequentialActionsLocked,true);
  assert.equal(snap.boundaries.scheduleActivation,"separate_authorization_required");
});

test("runtime is exposed in header, guide, suite and curated Pages publish",()=>{
  const index=read("index.html"),guide=read("zoki-legal-ai-guide.html"),suite=read("legal-ai-suite.html"),wf=read(".github/workflows/sync-pages-runtime.yml");
  assert.ok((index.match(/href="\/proactive-agent-runtime\.html"/g)||[]).length>=2);
  assert.ok(guide.includes("/proactive-agent-runtime.html"));
  assert.ok(suite.includes("/proactive-agent-runtime.html"));
  for(const p of ["proactive-agent-runtime.html","assets/proactive-agent-runtime-ui.js","src/matter-agent-runtime.js"]) assert.ok(wf.includes(p),p);
});
