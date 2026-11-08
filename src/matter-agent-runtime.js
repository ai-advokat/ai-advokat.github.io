// AI Advokat Matter-Native Proactive Agent Runtime v1.
// Public-design equivalent of frontier legal-agent operating patterns:
// Space-scoped context inheritance, plan preview/approval, parallel task dispatch,
// Human Nudges, audit trail, permission/ethical-wall enforcement and matter-level attribution.
// No proprietary vendor code or hidden implementation is reproduced.

import { AGENT_CAPABILITIES, WORKFLOW_TEMPLATES, assertAgentAction } from "./proactive-legal-agents.js";
import { sanitizeMatterMemory } from "./matter-memory.js";

export const MATTER_AGENT_RUNTIME_VERSION="1.0.0";

const TASK_STATES=Object.freeze([
  "planned","queued","running","awaiting_human_judgment","completed","blocked","rejected"
]);

function text(v,max=1000){
  if(typeof v!=="string") throw new TypeError("matter_runtime_text_required");
  const s=v.normalize("NFKC").trim();
  if(!s || s.length>max) throw new TypeError("matter_runtime_invalid_text");
  return s;
}
function list(v,{maxItems=50,maxLen=300}={}){
  if(!Array.isArray(v) || v.length>maxItems) throw new TypeError("matter_runtime_invalid_list");
  return Object.freeze(v.map(x=>text(String(x),maxLen)));
}
function iso(v){
  const d=v?new Date(v):new Date();
  if(Number.isNaN(d.getTime())) throw new TypeError("matter_runtime_invalid_time");
  return d.toISOString();
}
function uniq(v){return [...new Set(v)]}

export function createMatterSpace({
  spaceId,
  matterRef,
  label,
  authorizedPrincipals=[],
  ethicalWallTags=[],
  sourceUniverse=[],
  playbooks=[],
  memory={},
  createdAt
}={}){
  const principals=uniq(list(authorizedPrincipals,{maxItems:100,maxLen:180}));
  if(!principals.length) throw new TypeError("matter_runtime_authorized_principal_required");
  return Object.freeze({
    version:MATTER_AGENT_RUNTIME_VERSION,
    spaceId:text(spaceId,160),
    matterRef:text(matterRef,200),
    label:text(label,240),
    authorizedPrincipals:Object.freeze(principals),
    ethicalWallTags:list(ethicalWallTags,{maxItems:40,maxLen:120}),
    sourceUniverse:list(sourceUniverse,{maxItems:100,maxLen:500}),
    playbooks:list(playbooks,{maxItems:40,maxLen:240}),
    memory:sanitizeMatterMemory(memory),
    createdAt:iso(createdAt),
    state:"active",
    boundary:Object.freeze({
      crossSpaceDataAccess:"forbidden",
      externalTransmission:"forbidden",
      filing:"forbidden",
      signature:"forbidden",
      canonicalPromotion:"forbidden"
    })
  });
}

export function authorizeSpaceActor(space,{actorId,actorWallTags=[]}={}){
  if(!space || space.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_space_required");
  const actor=text(actorId,180);
  const wallTags=uniq(list(actorWallTags,{maxItems:40,maxLen:120}));
  const principalAllowed=space.authorizedPrincipals.includes(actor);
  const requiredWalls=space.ethicalWallTags;
  const wallAllowed=requiredWalls.every(tag=>wallTags.includes(tag));
  return Object.freeze({
    actorId:actor,
    allowed:principalAllowed && wallAllowed,
    principalAllowed,
    wallAllowed,
    missingWallTags:Object.freeze(requiredWalls.filter(tag=>!wallTags.includes(tag)))
  });
}

export function inheritSpaceContext(space,{actorId,actorWallTags=[],agentId}={}){
  const auth=authorizeSpaceActor(space,{actorId,actorWallTags});
  if(!auth.allowed) throw new TypeError("matter_runtime_space_access_denied");
  const agent=AGENT_CAPABILITIES[agentId];
  if(!agent) throw new TypeError("matter_runtime_unknown_agent");
  return Object.freeze({
    version:MATTER_AGENT_RUNTIME_VERSION,
    spaceId:space.spaceId,
    matterRef:space.matterRef,
    agentId,
    objectiveContext:Object.freeze({
      sourceUniverse:space.sourceUniverse,
      playbooks:space.playbooks,
      memory:space.memory
    }),
    permissions:Object.freeze({
      allowedActions:agent.allowed,
      forbiddenActions:agent.forbidden,
      externalTransmission:false,
      consequentialActions:false
    }),
    isolation:Object.freeze({
      sameSpaceOnly:true,
      crossSpaceDataAccess:false
    })
  });
}

export function createPlanPreview({
  planId,
  space,
  templateId,
  objective,
  requestedBy,
  requestedSchedule=null,
  createdAt
}={}){
  if(!space || space.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_space_required");
  const template=WORKFLOW_TEMPLATES[templateId];
  if(!template) throw new TypeError("matter_runtime_unknown_template");
  if(requestedSchedule && !template.scheduleEligible) throw new TypeError("matter_runtime_schedule_not_allowed");
  return Object.freeze({
    version:MATTER_AGENT_RUNTIME_VERSION,
    planId:text(planId,160),
    spaceId:space.spaceId,
    templateId,
    objective:text(objective,1400),
    requestedBy:text(requestedBy,180),
    agents:Object.freeze(template.agents.map(id=>Object.freeze({
      agentId:id,
      label:AGENT_CAPABILITIES[id].label,
      mandate:AGENT_CAPABILITIES[id].purpose
    }))),
    phases:template.phases,
    requestedSchedule:requestedSchedule?Object.freeze({
      cadence:text(String(requestedSchedule.cadence||""),100),
      timezone:text(String(requestedSchedule.timezone||""),100),
      enabled:false,
      activation:"requires_separate_runtime_authorization"
    }):null,
    state:"awaiting_plan_approval",
    createdAt:iso(createdAt),
    humanGate:Object.freeze({
      planApprovalRequired:true,
      executionAllowed:false
    })
  });
}

export function approvePlanPreview(plan,{reviewerId,approved=true,notes="",reviewedAt}={}){
  if(!plan || plan.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_plan_required");
  if(plan.state!=="awaiting_plan_approval") throw new TypeError("matter_runtime_plan_not_awaiting_approval");
  return Object.freeze({
    ...plan,
    state:approved?"approved_for_execution":"rejected",
    approval:Object.freeze({
      reviewerId:text(reviewerId,180),
      approved:Boolean(approved),
      notes:typeof notes==="string"?notes.normalize("NFKC").trim().slice(0,1200):"",
      reviewedAt:iso(reviewedAt)
    }),
    humanGate:Object.freeze({
      planApprovalRequired:false,
      executionAllowed:Boolean(approved)
    })
  });
}

export function dispatchParallelTasks(plan,space,{actorId,actorWallTags=[],dispatchedAt}={}){
  if(!plan || plan.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_plan_required");
  if(plan.state!=="approved_for_execution") throw new TypeError("matter_runtime_plan_not_approved");
  if(plan.spaceId!==space?.spaceId) throw new TypeError("matter_runtime_cross_space_plan_forbidden");
  const auth=authorizeSpaceActor(space,{actorId,actorWallTags});
  if(!auth.allowed) throw new TypeError("matter_runtime_space_access_denied");

  return Object.freeze(plan.agents.map((entry,index)=>{
    const ctx=inheritSpaceContext(space,{actorId,actorWallTags,agentId:entry.agentId});
    return Object.freeze({
      version:MATTER_AGENT_RUNTIME_VERSION,
      taskId:`${plan.planId}:${String(index+1).padStart(2,"0")}:${entry.agentId}`,
      planId:plan.planId,
      spaceId:space.spaceId,
      agentId:entry.agentId,
      ownerType:"agent",
      ownerId:entry.agentId,
      objective:plan.objective,
      state:"queued",
      context:ctx,
      citationsRequired:true,
      humanReviewRequired:true,
      dispatchedAt:iso(dispatchedAt)
    });
  }));
}

export function assignTaskOwner(task,{ownerType,ownerId,assignedAt}={}){
  if(!task || task.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_task_required");
  if(!["agent","lawyer"].includes(ownerType)) throw new TypeError("matter_runtime_owner_type_invalid");
  return Object.freeze({
    ...task,
    ownerType,
    ownerId:text(ownerId,180),
    assignedAt:iso(assignedAt)
  });
}

export function transitionTask(task,{to,actorId,action=null,at}={}){
  if(!task || task.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_task_required");
  if(!TASK_STATES.includes(to)) throw new TypeError("matter_runtime_task_state_invalid");
  if(action){
    const gate=assertAgentAction(task.agentId,action);
    if(!gate.allowed) throw new TypeError("matter_runtime_forbidden_agent_action");
  }
  const allowed=Object.freeze({
    planned:["queued","rejected"],
    queued:["running","blocked","rejected"],
    running:["awaiting_human_judgment","completed","blocked"],
    awaiting_human_judgment:["running","blocked","rejected"],
    completed:[],
    blocked:["queued","rejected"],
    rejected:[]
  });
  if(!allowed[task.state]?.includes(to)) throw new TypeError("matter_runtime_invalid_task_transition");
  return Object.freeze({
    ...task,
    state:to,
    lastTransition:Object.freeze({
      from:task.state,to,actorId:text(actorId,180),at:iso(at)
    })
  });
}

export function createRuntimeNudge(task,{reason,question,sourceRefs=[],at}={}){
  if(!task || task.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_task_required");
  if(!["running","awaiting_human_judgment"].includes(task.state)) throw new TypeError("matter_runtime_nudge_state_invalid");
  return Object.freeze({
    version:MATTER_AGENT_RUNTIME_VERSION,
    type:"human_nudge",
    nudgeId:`${task.taskId}:nudge:${Date.parse(iso(at))}`,
    taskId:task.taskId,
    spaceId:task.spaceId,
    agentId:task.agentId,
    reason:text(reason,500),
    question:text(question,1200),
    sourceRefs:list(sourceRefs,{maxItems:40,maxLen:400}),
    blocking:true,
    state:"awaiting_human_judgment",
    createdAt:iso(at)
  });
}

export function completeTaskWithEvidence(task,{summary,sourceRefs=[],artifacts=[],completedAt}={}){
  if(!task || task.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_task_required");
  if(task.state!=="running") throw new TypeError("matter_runtime_task_not_running");
  const refs=list(sourceRefs,{maxItems:100,maxLen:500});
  if(!refs.length) throw new TypeError("matter_runtime_source_refs_required");
  return Object.freeze({
    ...task,
    state:"completed",
    result:Object.freeze({
      summary:text(summary,4000),
      sourceRefs:refs,
      artifacts:list(artifacts,{maxItems:50,maxLen:500}),
      reviewState:"review_ready_not_released"
    }),
    completedAt:iso(completedAt),
    humanReviewRequired:true
  });
}

export function buildAuditEvent({
  eventId,
  spaceId,
  actorId,
  actorType,
  action,
  objectType,
  objectId,
  detail="",
  at
}={}){
  if(!["human","agent","system"].includes(actorType)) throw new TypeError("matter_runtime_actor_type_invalid");
  return Object.freeze({
    version:MATTER_AGENT_RUNTIME_VERSION,
    eventId:text(eventId,180),
    spaceId:text(spaceId,160),
    actorId:text(actorId,180),
    actorType,
    action:text(action,220),
    objectType:text(objectType,120),
    objectId:text(objectId,220),
    detail:typeof detail==="string"?detail.normalize("NFKC").trim().slice(0,1600):"",
    at:iso(at)
  });
}

export function appendAuditEvent(log,event){
  if(!Array.isArray(log)) throw new TypeError("matter_runtime_audit_log_required");
  if(!event || event.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_audit_event_required");
  if(log.some(x=>x.eventId===event.eventId)) throw new TypeError("matter_runtime_duplicate_audit_event");
  return Object.freeze([...log,event]);
}

export function matterRuntimeSnapshot({space,plan=null,tasks=[],nudges=[],auditLog=[]}={}){
  if(!space || space.version!==MATTER_AGENT_RUNTIME_VERSION) throw new TypeError("matter_runtime_space_required");
  const scoped=tasks.filter(t=>t.spaceId===space.spaceId);
  return Object.freeze({
    version:MATTER_AGENT_RUNTIME_VERSION,
    space:Object.freeze({
      spaceId:space.spaceId,
      matterRef:space.matterRef,
      label:space.label,
      state:space.state
    }),
    planState:plan?.state||null,
    metrics:Object.freeze({
      totalTasks:scoped.length,
      queued:scoped.filter(t=>t.state==="queued").length,
      running:scoped.filter(t=>t.state==="running").length,
      awaitingHuman:scoped.filter(t=>t.state==="awaiting_human_judgment").length,
      completed:scoped.filter(t=>t.state==="completed").length,
      blocked:scoped.filter(t=>t.state==="blocked").length,
      nudges:nudges.filter(n=>n.spaceId===space.spaceId).length,
      auditEvents:auditLog.filter(e=>e.spaceId===space.spaceId).length
    }),
    boundaries:Object.freeze({
      crossSpaceDataAccess:false,
      consequentialActionsLocked:true,
      externalTransmission:false,
      scheduleActivation:"separate_authorization_required"
    })
  });
}
