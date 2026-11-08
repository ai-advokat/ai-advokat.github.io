// AI Advokat Fact & Evidence Graph v1
// Converts matter records into auditable nodes/edges. It never decides credibility, liability or outcome.
export const LEGAL_FACT_GRAPH_VERSION="1.0.0";
function arr(v){return Array.isArray(v)?v:[]}
function id(v){const s=String(v||"").trim(); if(!s) throw new TypeError("graph_id_required"); return s.slice(0,180)}
export function buildFactEvidenceGraph(matter={}){
  const nodes=[]; const edges=[]; const seen=new Set();
  const addNode=(n)=>{if(!seen.has(n.id)){seen.add(n.id);nodes.push(Object.freeze(n))}};
  for(const c of arr(matter.claims)){
    const cid="claim:"+id(c.id); addNode({id:cid,type:"claim",label:String(c.text||c.title||c.id).slice(0,240),status:c.status||"unreviewed"});
  }
  for(const e of arr(matter.evidence)){
    const eid="evidence:"+id(e.id); addNode({id:eid,type:"evidence",label:String(e.title||e.description||e.id).slice(0,240),sourceId:e.sourceId||null});
  }
  for(const l of arr(matter.claim_evidence||matter.claimEvidence)){
    const from="claim:"+id(l.claimId), to="evidence:"+id(l.evidenceId);
    edges.push(Object.freeze({from,to,type:l.relationship||"supports",reviewRequired:true}));
  }
  for(const c of arr(matter.contradictions)){
    const nid="contradiction:"+id(c.id);
    addNode({id:nid,type:"contradiction",label:String(c.description||c.title||c.id).slice(0,240),status:"review_required"});
    if(c.claimId) edges.push(Object.freeze({from:"claim:"+id(c.claimId),to:nid,type:"contradicted_by",reviewRequired:true}));
  }
  for(const g of arr(matter.evidence_gaps||matter.evidenceGaps)){
    const nid="gap:"+id(g.id);
    addNode({id:nid,type:"evidence_gap",label:String(g.description||g.title||g.id).slice(0,240),status:"open"});
    if(g.claimId) edges.push(Object.freeze({from:"claim:"+id(g.claimId),to:nid,type:"has_gap",reviewRequired:true}));
  }
  return Object.freeze({
    version:LEGAL_FACT_GRAPH_VERSION,
    nodes:Object.freeze(nodes),
    edges:Object.freeze(edges),
    counts:Object.freeze({
      claims:nodes.filter(n=>n.type==="claim").length,
      evidence:nodes.filter(n=>n.type==="evidence").length,
      contradictions:nodes.filter(n=>n.type==="contradiction").length,
      gaps:nodes.filter(n=>n.type==="evidence_gap").length
    }),
    humanGateRequired:true,
    credibilityDetermined:false,
    outcomePredicted:false
  });
}
