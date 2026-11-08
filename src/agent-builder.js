// AI Advokat Agent Builder v1.
// Creates bounded agent specifications only from approved capabilities.
// Generated agents have no autonomous external-action authority.

import { AGENT_CAPABILITIES, CONSEQUENT_ACTIONS } from "./proactive-legal-agents.js";

export const AGENT_BUILDER_VERSION="1.0.0";
export const BUILDER_CAPABILITY_POOL=Object.freeze(
  [...new Set(Object.values(AGENT_CAPABILITIES).flatMap(a=>a.allowed))].sort()
);

function clean(v,max=300){
  if(typeof v!=="string") throw new TypeError("agent_builder_text_required");
  const x=v.normalize("NFKC").trim();
  if(!x||x.length>max) throw new TypeError("agent_builder_invalid_text");
  return x;
}
export function buildCustomAgent({id,label,purpose,capabilities=[],sourceBoundary=[],requiresHumanReview=true}={}){
  const agentId=clean(String(id||""),80);
  if(!/^[a-z0-9_-]+$/.test(agentId)) throw new TypeError("agent_builder_invalid_id");
  if(!Array.isArray(capabilities)||!capabilities.length) throw new TypeError("agent_builder_capabilities_required");
  const requested=[...new Set(capabilities.map(x=>clean(String(x),120)))];
  const unknown=requested.filter(x=>!BUILDER_CAPABILITY_POOL.includes(x));
  const consequential=requested.filter(x=>CONSEQUENT_ACTIONS.includes(x));
  if(unknown.length||consequential.length) throw new TypeError("agent_builder_unapproved_capability");
  if(!Array.isArray(sourceBoundary)||!sourceBoundary.length) throw new TypeError("agent_builder_source_boundary_required");
  return Object.freeze({
    version:AGENT_BUILDER_VERSION,
    id:agentId,
    label:clean(label,120),
    purpose:clean(purpose,700),
    capabilities:Object.freeze(requested),
    sourceBoundary:Object.freeze(sourceBoundary.map(x=>clean(String(x),240))),
    requiresHumanReview:Boolean(requiresHumanReview),
    externalActions:"forbidden",
    filing:"forbidden",
    signature:"forbidden",
    canonicalPromotion:"forbidden",
    status:"draft_agent_spec"
  });
}
export function validateCustomAgent(agent){
  if(!agent||agent.version!==AGENT_BUILDER_VERSION) return Object.freeze({valid:false,errors:["invalid_version"]});
  const errors=[];
  if(agent.requiresHumanReview!==true) errors.push("human_review_must_remain_enabled");
  if(agent.externalActions!=="forbidden") errors.push("external_actions_must_be_forbidden");
  for(const cap of agent.capabilities||[]) if(!BUILDER_CAPABILITY_POOL.includes(cap)) errors.push("unapproved_capability:"+cap);
  return Object.freeze({valid:errors.length===0,errors:Object.freeze(errors),releaseState:"spec_only_not_runtime_activated"});
}
