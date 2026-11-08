// AI Advokat Horizon Scanning Engine v1.
// Real delta detection over supplied source observations.
// Fetch/scheduling is intentionally separate; this engine never invents a change.

export const HORIZON_ENGINE_VERSION="1.0.0";
export const HORIZON_STATUSES=Object.freeze(["candidate_change","no_change","source_error","needs_review"]);

function clean(v,max=1200){
  if(typeof v!=="string") throw new TypeError("horizon_text_required");
  const x=v.normalize("NFKC").trim();
  if(!x||x.length>max) throw new TypeError("horizon_invalid_text");
  return x;
}
function date(v){
  const x=clean(String(v),40);
  if(Number.isNaN(Date.parse(x))) throw new TypeError("horizon_invalid_date");
  return new Date(x).toISOString();
}
export function sourceObservation({sourceId,title,url,jurisdiction,observedAt,fingerprint,versionLabel=null,statusCode=200}={}){
  if(!Number.isInteger(statusCode)||statusCode<100||statusCode>599) throw new TypeError("horizon_invalid_status_code");
  const fp=clean(String(fingerprint||""),128);
  if(!/^[a-f0-9]{16,128}$/i.test(fp)) throw new TypeError("horizon_invalid_fingerprint");
  return Object.freeze({
    sourceId:clean(sourceId,100),title:clean(title,240),url:clean(url,700),
    jurisdiction:clean(jurisdiction,40),observedAt:date(observedAt),fingerprint:fp.toLowerCase(),
    versionLabel:versionLabel?clean(String(versionLabel),120):null,statusCode
  });
}
export function compareObservations(previous,current){
  if(!previous||!current) throw new TypeError("horizon_observations_required");
  if(previous.sourceId!==current.sourceId) throw new TypeError("horizon_source_mismatch");
  if(current.statusCode>=400) return Object.freeze({status:"source_error",changed:false,sourceId:current.sourceId,reviewRequired:true});
  const changed=previous.fingerprint!==current.fingerprint || previous.versionLabel!==current.versionLabel;
  return Object.freeze({
    status:changed?"candidate_change":"no_change",
    changed,sourceId:current.sourceId,previousFingerprint:previous.fingerprint,currentFingerprint:current.fingerprint,
    previousVersion:previous.versionLabel,currentVersion:current.versionLabel,
    reviewRequired:changed,
    authorityState:changed?"unverified_candidate_not_current_law":"unchanged_observation"
  });
}
export function prioritizeHorizonEvents(events=[]){
  if(!Array.isArray(events)) throw new TypeError("horizon_events_array_required");
  const score=e=>e.status==="source_error"?100:e.status==="candidate_change"?80:e.status==="needs_review"?60:10;
  return Object.freeze([...events].sort((a,b)=>score(b)-score(a)));
}
export function horizonSummary(events=[]){
  const xs=prioritizeHorizonEvents(events);
  const count=s=>xs.filter(x=>x.status===s).length;
  return Object.freeze({
    version:HORIZON_ENGINE_VERSION,total:xs.length,
    candidateChanges:count("candidate_change"),sourceErrors:count("source_error"),noChange:count("no_change"),
    humanReviewRequired:xs.some(x=>x.reviewRequired===true),
    currentLawDeclared:false
  });
}
