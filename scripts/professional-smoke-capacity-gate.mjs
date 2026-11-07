import fs from "node:fs";

export const PROFESSIONAL_SMOKE_CAPACITY_GATE_VERSION="AI_ADVOCAT_PRO_SMOKE_CAPACITY_GATE_V3";

export function isOpenAIProviderCapacityStatus(value){
  const status=String(value||"").trim();
  const recognized=new Set([
    "rate_limit_exceeded",
    "rate_limited_during_bounded_specialist",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
    "credit_balance_exhausted",
    "insufficient_quota"
  ]);
  return recognized.has(status);
}

export function classifyProfessionalProviderCapacity(httpStatus,data){
  const d=data&&typeof data==="object"?data:{};
  const fallback=d.providerFallback&&typeof d.providerFallback==="object"?d.providerFallback:{};
  const capacity=d.providerCapacity&&typeof d.providerCapacity==="object"?d.providerCapacity:{};
  const runtime=d.runtime&&typeof d.runtime==="object"?d.runtime:{};
  const primaryStatus=String(fallback.primaryResponseStatus||"").trim();
  const primaryCapacityBlocked=isOpenAIProviderCapacityStatus(primaryStatus);

  const commonFailClosed=Number(httpStatus)===503
    && d.ok===false
    && fallback.from==="openai"
    && fallback.to==="workers_ai"
    && fallback.reason==="openai_response_error"
    && Number(fallback.primaryProviderCalls)>=1
    && Number(fallback.primaryHttpStatus)===429
    && primaryCapacityBlocked
    && runtime.provider==="workers_ai_free"
    && !String(d.answer||"").trim();

  const dualCapacityBlocked=commonFailClosed
    && d.error==="workers_ai_daily_capacity_exhausted"
    && capacity.state==="exhausted"
    && capacity.provider==="workers_ai"
    && capacity.capacity==="daily_free_allocation_exhausted"
    && capacity.retryable===false
    && fallback.fallbackState==="capacity_exhausted";

  const fallbackProviderErrorBlocked=commonFailClosed
    && d.error==="free_workers_ai_provider_error"
    && fallback.fallbackState==="failed"
    && !d.providerCapacity;

  const recognized=dualCapacityBlocked||fallbackProviderErrorBlocked;
  const classification=dualCapacityBlocked
    ?"PROVIDER_CAPACITY_BLOCKED"
    :fallbackProviderErrorBlocked
      ?"PRIMARY_PROVIDER_CAPACITY_BLOCKED_FALLBACK_PROVIDER_ERROR"
      :"UNRECOGNIZED_PROFESSIONAL_SMOKE_FAILURE";

  return Object.freeze({
    recognized,
    classification,
    systemIntegrity:recognized?"PASS_FAIL_CLOSED":"UNVERIFIED",
    providerAvailability:recognized?"BLOCKED":"UNKNOWN",
    primaryProvider:recognized?"openai":null,
    primaryHttpStatus:recognized?429:null,
    primaryCapacityReason:recognized?primaryStatus:null,
    fallbackProvider:recognized?"workers_ai":null,
    fallbackCapacity:dualCapacityBlocked?"daily_free_allocation_exhausted":null,
    fallbackFailure:fallbackProviderErrorBlocked?"provider_error":null,
    retryable:dualCapacityBlocked?false:fallbackProviderErrorBlocked?null:null,
    gateVersion:PROFESSIONAL_SMOKE_CAPACITY_GATE_VERSION
  });
}

function runCli(){
  const httpStatus=Number(process.argv[2]||0);
  const responsePath=String(process.argv[3]||"/tmp/pro-response.json");
  const summaryPath=String(process.argv[4]||"/tmp/pro-summary.json");
  let data=null;
  try{
    data=JSON.parse(fs.readFileSync(responsePath,"utf8"));
  }catch(error){
    console.error("PROFESSIONAL_SMOKE_RESPONSE_PARSE_FAILED",String(error?.message||error));
    process.exit(1);
  }

  const result=classifyProfessionalProviderCapacity(httpStatus,data);
  if(!result.recognized){
    console.error("PROFESSIONAL_SMOKE_UNRECOGNIZED_FAILURE",JSON.stringify({
      httpStatus,
      error:data?.error||null,
      providerCapacity:data?.providerCapacity||null,
      providerFallback:data?.providerFallback||null,
      runtime:data?.runtime||null
    }));
    process.exit(1);
  }

  const dualCapacity=result.classification==="PROVIDER_CAPACITY_BLOCKED";
  const summary={
    ok:false,
    smokeStatus:dualCapacity?"PASS_WITH_PROVIDER_CAPACITY_BLOCKER":"PASS_WITH_PROVIDER_AVAILABILITY_BLOCKER",
    releaseState:dualCapacity?"PROVIDER_CAPACITY_BLOCKED":"PROVIDER_AVAILABILITY_BLOCKED",
    classification:result.classification,
    systemIntegrity:result.systemIntegrity,
    providerAvailability:result.providerAvailability,
    capacityGateVersion:result.gateVersion,
    httpStatus,
    error:data.error,
    providerCapacity:data.providerCapacity||null,
    providerFallback:data.providerFallback,
    runtime:data.runtime,
    model:data.model||null,
    primaryCapacityReason:result.primaryCapacityReason,
    fallbackFailure:result.fallbackFailure,
    answerReleased:false
  };
  fs.writeFileSync(summaryPath,JSON.stringify(summary,null,2));

  if(dualCapacity){
    console.log("::warning title=Professional provider capacity blocked::Runtime integrity passed fail-closed checks. OpenAI capacity/quota reason: "+result.primaryCapacityReason+"; Workers AI daily free allocation is exhausted. This is an operational capacity blocker, not a code regression.");
    console.log("PROFESSIONAL PROVIDER CAPACITY: BLOCKED · SYSTEM FAIL-CLOSED CONTRACT: PASS");
  }else{
    console.log("::warning title=Professional provider availability blocked::Runtime integrity passed fail-closed checks. OpenAI primary is blocked by "+result.primaryCapacityReason+" and the bounded Workers AI fallback returned a provider error. No answer was released. This is an operational provider-availability blocker, not a code regression.");
    console.log("PROFESSIONAL PROVIDER AVAILABILITY: BLOCKED · SYSTEM FAIL-CLOSED CONTRACT: PASS");
  }
}

if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
  runCli();
}
