import { buildOperatingPlan, listOperatingTasks } from "../src/operating-desk-router.js";

const STORAGE_KEY="ai_advokat_operating_desk_v1";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
let current=null;

function restore(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}catch{return null}
}
function saveSelection(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify({taskId:$("taskId").value,sensitivity:document.querySelector('input[name="sensitivity"]:checked')?.value||"public"}));
}
function render(plan){
  current=plan;
  $("planEmpty").hidden=true;
  $("plan").hidden=false;
  $("taskTitle").textContent=plan.taskLabel;
  $("privacyState").textContent=plan.sensitivity==="confidential"?"Доверливо · Secure Case прво":"Јавно/синтетичко · bounded route";
  $("firstAction").textContent=plan.firstAction.label;
  $("firstAction").href=plan.firstAction.href;
  $("objective").textContent=plan.objective;
  $("inputs").innerHTML=plan.inputs.map(x=>"<li>"+esc(x)+"</li>").join("");
  $("outputs").innerHTML=plan.outputs.map(x=>"<li>"+esc(x)+"</li>").join("");
  $("steps").innerHTML=plan.steps.map((x,i)=>"<li><b>"+(i+1)+"</b> · "+esc(x)+"</li>").join("");
  $("nextActions").innerHTML=plan.nextActions.length?plan.nextActions.map(a=>'<a class="btn secondary" href="'+esc(a.href)+'">'+esc(a.label)+'</a>').join(""):'<span class="muted">За оваа задача нема потреба од agent workflow.</span>';
  $("workflowState").textContent=plan.workflowTemplate?"Agent workflow е достапен, но не се стартува без plan preview и Human approval.":"Direct bounded workflow.";
  saveSelection();
}
function build(){
  try{
    const sensitivity=document.querySelector('input[name="sensitivity"]:checked')?.value||"public";
    render(buildOperatingPlan($("taskId").value,{sensitivity}));
  }catch(e){
    $("plan").hidden=true;$("planEmpty").hidden=false;$("planEmpty").textContent="Не може да се изгради работна патека: "+e.message;
  }
}
function init(){
  const tasks=listOperatingTasks();
  $("taskId").innerHTML=tasks.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.label)+'</option>').join("");
  const saved=restore();
  if(saved?.taskId && tasks.some(t=>t.id===saved.taskId)) $("taskId").value=saved.taskId;
  if(saved?.sensitivity==="confidential"){
    const radio=document.querySelector('input[name="sensitivity"][value="confidential"]'); if(radio) radio.checked=true;
  }
  $("buildPlan").onclick=build;
  $("taskId").onchange=build;
  document.querySelectorAll('input[name="sensitivity"]').forEach(x=>x.onchange=build);
  $("copyPlan").onclick=async()=>{
    if(!current)return;
    const payload=JSON.stringify(current,null,2);
    try{await navigator.clipboard.writeText(payload);$("copyStatus").textContent="Работниот налог е копиран."}
    catch{$("copyStatus").textContent="Копирањето не е достапно во овој browser."}
  };
  build();
}
init();
