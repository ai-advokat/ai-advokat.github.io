import {
  createMatterSpace, createPlanPreview, approvePlanPreview, dispatchParallelTasks,
  transitionTask, createRuntimeNudge, completeTaskWithEvidence, buildAuditEvent,
  appendAuditEvent, matterRuntimeSnapshot
} from "../src/matter-agent-runtime.js";
import { WORKFLOW_TEMPLATES } from "../src/proactive-legal-agents.js";

const STORAGE_KEY="ai_advokat_proactive_runtime_v1";
const state={space:null,plan:null,tasks:[],nudges:[],auditLog:[]};

const $=id=>document.getElementById(id);
const show=(id,v)=>{$(id).textContent=typeof v==="string"?v:JSON.stringify(v,null,2)};
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
const restore=()=>{
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    if(raw&&typeof raw==="object"){
      state.space=raw.space||null; state.plan=raw.plan||null;
      state.tasks=Array.isArray(raw.tasks)?raw.tasks:[];
      state.nudges=Array.isArray(raw.nudges)?raw.nudges:[];
      state.auditLog=Array.isArray(raw.auditLog)?raw.auditLog:[];
    }
  }catch{}
};

function audit(action,objectType,objectId,detail=""){
  const event=buildAuditEvent({
    eventId:"evt-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
    spaceId:state.space?.spaceId||"no-space",
    actorId:$("actorId").value||"zoki",
    actorType:"human",action,objectType,objectId,detail
  });
  state.auditLog=appendAuditEvent(state.auditLog,event);
}
function render(){
  show("spaceOut",state.space||"Нема Space.");
  show("planOut",state.plan||"Нема plan.");
  $("tasks").innerHTML=state.tasks.length?state.tasks.map(t=>`
    <article class="task">
      <div><strong>${t.agentId}</strong><span class="state">${t.state}</span></div>
      <small>${t.taskId}</small>
      <div class="actions">
        <button data-action="start" data-id="${t.taskId}">Start</button>
        <button data-action="nudge" data-id="${t.taskId}">Human Nudge</button>
        <button data-action="complete" data-id="${t.taskId}">Complete + citation</button>
      </div>
    </article>`).join(""):'<p class="muted">Нема dispatch-ирани задачи.</p>';
  show("nudgesOut",state.nudges);
  show("auditOut",state.auditLog);
  show("snapshotOut",state.space?matterRuntimeSnapshot(state):"Нема snapshot.");
  save();
}
function tags(v){return String(v||"").split(",").map(x=>x.trim()).filter(Boolean)}
function initTemplates(){
  $("templateId").innerHTML=Object.values(WORKFLOW_TEMPLATES).map(t=>`<option value="${t.id}">${t.label}</option>`).join("");
}
$("createSpace").onclick=()=>{
  try{
    state.space=createMatterSpace({
      spaceId:$("spaceId").value,matterRef:$("matterRef").value,label:$("spaceLabel").value,
      authorizedPrincipals:tags($("authorized").value),ethicalWallTags:tags($("walls").value),
      sourceUniverse:tags($("sources").value),playbooks:tags($("playbooks").value),
      memory:{outputLanguage:"mk",citationStyle:"source-first",matterPhase:"active",workspaceRef:$("spaceId").value}
    });
    state.plan=null;state.tasks=[];state.nudges=[];state.auditLog=[];
    audit("space_created","space",state.space.spaceId,"Bounded matter context created");
    render();
  }catch(e){show("spaceOut",{error:e.message})}
};
$("previewPlan").onclick=()=>{
  try{
    if(!state.space)throw new Error("Прво креирај Matter Space.");
    state.plan=createPlanPreview({
      planId:"plan-"+Date.now(),space:state.space,templateId:$("templateId").value,
      objective:$("objective").value,requestedBy:$("actorId").value
    });
    audit("plan_preview_created","plan",state.plan.planId,state.plan.templateId);
    render();
  }catch(e){show("planOut",{error:e.message})}
};
$("approvePlan").onclick=()=>{
  try{
    state.plan=approvePlanPreview(state.plan,{reviewerId:$("actorId").value,approved:true,notes:"Human plan approval from runtime UI"});
    audit("plan_approved","plan",state.plan.planId,state.plan.templateId); render();
  }catch(e){show("planOut",{error:e.message})}
};
$("dispatch").onclick=()=>{
  try{
    state.tasks=[...dispatchParallelTasks(state.plan,state.space,{actorId:$("actorId").value,actorWallTags:tags($("actorWalls").value)})];
    audit("parallel_dispatch","plan",state.plan.planId,String(state.tasks.length)+" tasks"); render();
  }catch(e){show("planOut",{error:e.message})}
};
$("tasks").onclick=e=>{
  const b=e.target.closest("button[data-action]"); if(!b)return;
  const i=state.tasks.findIndex(t=>t.taskId===b.dataset.id); if(i<0)return;
  const t=state.tasks[i];
  try{
    if(b.dataset.action==="start"){
      state.tasks[i]=transitionTask(t,{to:"running",actorId:$("actorId").value});
      audit("task_started","task",t.taskId,t.agentId);
    }else if(b.dataset.action==="nudge"){
      const running=t.state==="queued"?transitionTask(t,{to:"running",actorId:$("actorId").value}):t;
      const n=createRuntimeNudge(running,{reason:"Потребна е адвокатска процена",question:"Провери ја оваа точка пред агентот да продолжи.",sourceRefs:["matter-space:"+state.space.spaceId]});
      state.tasks[i]=transitionTask(running,{to:"awaiting_human_judgment",actorId:t.agentId});
      state.nudges.push(n); audit("human_nudge_created","task",t.taskId,n.question);
    }else if(b.dataset.action==="complete"){
      const running=t.state==="queued"?transitionTask(t,{to:"running",actorId:$("actorId").value}):t;
      if(running.state!=="running")throw new Error("Задачата мора да е running.");
      state.tasks[i]=completeTaskWithEvidence(running,{summary:"Review-ready agent output. Human review required.",sourceRefs:["matter-space:"+state.space.spaceId],artifacts:["review-note"]});
      audit("task_completed_with_evidence","task",t.taskId,t.agentId);
    }
    render();
  }catch(err){alert(err.message)}
};
$("clearRuntime").onclick=()=>{localStorage.removeItem(STORAGE_KEY);state.space=null;state.plan=null;state.tasks=[];state.nudges=[];state.auditLog=[];render()};

restore();initTemplates();render();
