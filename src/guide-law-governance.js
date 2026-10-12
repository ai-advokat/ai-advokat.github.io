// AI Advokat — guide-to-law runtime governance.
// Practical guides remain secondary. This module never promotes a guide or statute.

export const GUIDE_LAW_GATE_VERSION="GUIDE_LAW_GATE_V1";

function readinessMap(ledger){
  return new Map((Array.isArray(ledger?.instruments)?ledger.instruments:[]).map(x=>[String(x.canonical_key),x]));
}

function dependencyState(dep,lawMap){
  const key=String(dep?.key||"");
  if(!key) return {state:"invalid_dependency",verified:false};
  if(!key.startsWith("mk:")){
    return {
      state:"external_official_source_required",
      verified:false,
      key,
      title:String(dep?.title||key),
      role:String(dep?.role||"primary"),
      sourceClass:"external_official_source_required"
    };
  }
  const law=lawMap.get(key);
  if(!law){
    return {
      state:"readiness_record_missing",
      verified:false,
      key,
      title:String(dep?.title||key),
      role:String(dep?.role||"primary"),
      sourceClass:"readiness_ledger"
    };
  }
  const gates=law.gates||{};
  const verified=gates.current_version_verified===true && gates.human_gate_approved===true;
  let state="current_law_not_verified";
  if(verified) state="current_law_verified";
  else if(String(law.current_law_status||"").includes("TEMPORAL_DUAL_TRACK")) state="temporal_dual_track_review";
  else if(law.final_human_gate?.ready===true) state="human_gate_pending";
  else if(String(law.current_law_status||"").includes("HUMAN_GATE")) state="human_gate_pending";
  return {
    state,verified,key,
    title:String(dep?.title||law.title||key),
    role:String(dep?.role||"primary"),
    sourceClass:"readiness_ledger",
    lawStatus:String(law.current_law_status||""),
    currentVersionVerified:gates.current_version_verified===true,
    humanGateApproved:gates.human_gate_approved===true
  };
}

export function evaluateGuideLawDependencies(guideId,registry,ledger){
  const profile=(Array.isArray(registry?.records)?registry.records:[]).find(x=>String(x.guide_id)===String(guideId));
  if(!profile){
    return {
      version:GUIDE_LAW_GATE_VERSION,
      guideId:String(guideId||""),
      state:"unmapped_primary_source_required",
      primarySourceRequired:true,
      allDependenciesCurrentVerified:false,
      dependencies:[]
    };
  }
  const lawMap=readinessMap(ledger);
  const dependencies=(Array.isArray(profile.dependencies)?profile.dependencies:[]).map(d=>dependencyState(d,lawMap));
  const allVerified=dependencies.length>0 && dependencies.every(d=>d.verified===true);
  const anyTemporal=dependencies.some(d=>d.state==="temporal_dual_track_review");
  const anyHumanGate=dependencies.some(d=>d.state==="human_gate_pending");
  const anyExternal=dependencies.some(d=>d.state==="external_official_source_required");
  const state=allVerified
    ? "all_mapped_dependencies_current_verified"
    : anyTemporal
      ? "primary_source_required_temporal_track"
      : anyHumanGate
        ? "primary_source_required_human_gate_pending"
        : anyExternal
          ? "primary_source_required_external_check"
          : "primary_source_required";
  return {
    version:GUIDE_LAW_GATE_VERSION,
    guideId:String(guideId||""),
    state,
    primarySourceRequired:true,
    allDependenciesCurrentVerified:allVerified,
    dependencies
  };
}

export function guideLawGatePrompt(gate){
  const deps=(gate?.dependencies||[]).map(d=>`${d.key}=${d.state}`).join("; ")||"none";
  return [
    "GUIDE_LAW_DEPENDENCY_GATE: "+String(gate?.state||"unmapped_primary_source_required"),
    "DEPENDENCIES: "+deps,
    "RULE: The practical guide is secondary guidance only.",
    "RULE: Any current-law proposition, deadline, remedy or procedural rule must be supported by a matching primary/official source for the applicable date.",
    "RULE: An unresolved, external, temporal-dual-track or Human-Gate-pending dependency is never silently treated as verified current law."
  ].join("\n");
}
