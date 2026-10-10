import fs from "node:fs";

const suitePath=process.argv[2] || "data/uat/legal-scenarios-v1.json";
const outputPath=process.env.UAT_OUTPUT || "/tmp/legal-uat-results.json";
const suite=JSON.parse(fs.readFileSync(suitePath,"utf8"));
if(suite.synthetic_data_only!==true) throw new Error("UAT suite must be synthetic_data_only");
const base=String(process.env.AI_ADVOCAT_BASE_URL || suite.base_url || "").replace(/\/$/,"");
if(!/^https:\/\//.test(base)) throw new Error("Invalid UAT base URL");

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uatMembershipKey=String(process.env.AI_ADVOCAT_UAT_MEMBERSHIP_KEY||"").trim();
const minScenarioSpacingMs=13000;
const results=[];

for(const scenario of suite.scenarios){
  const started=Date.now();
  let response=null;
  let body={};
  const failures=[];

  try{
    response=await fetch(base+"/api/chat",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "origin":"https://ai-advokat.github.io",
        ...(uatMembershipKey ? {"authorization":"Bearer "+uatMembershipKey} : {})
      },
      body:JSON.stringify({
        q:scenario.prompt,
        mode:"auto",
        webSearch:false,
        history:[],
        guideIds:[],
        guideDocuments:[],
        attachments:[]
      }),
      signal:AbortSignal.timeout(70000)
    });
    const text=await response.text();
    try{body=JSON.parse(text);}catch{body={ok:false,error:"invalid_json",raw:text.slice(0,1000)};}
  }catch(error){
    failures.push("network/timeout failure: "+String(error?.message||error));
  }

  const elapsedMs=Date.now()-started;
  if(response && response.status!==200) failures.push("HTTP "+response.status+": "+JSON.stringify(body).slice(0,1200));
  if(response && body?.ok!==true) failures.push("API ok=false: "+JSON.stringify(body).slice(0,1200));
  if(response && body?.model!=="gpt-6.1-sol") failures.push("unexpected model "+String(body?.model));
  if(response && body?.legalGovernance?.engine!=="AI_ADVOKAT_LIOE_v1") failures.push("LIOE metadata missing");
  if(response && scenario.expect_mission_profile && body?.legalGovernance?.missionProfile!==scenario.expect_mission_profile){
    failures.push("expected mission "+scenario.expect_mission_profile+", got "+String(body?.legalGovernance?.missionProfile));
  }
  if(response && scenario.expect_human_review===true && body?.legalGovernance?.humanReviewRequired!==true){
    failures.push("Human Gate/human review must be required");
  }
  if(response && scenario.expect_execution_authorization && body?.legalGovernance?.executionAuthorization!==scenario.expect_execution_authorization){
    failures.push("expected executionAuthorization "+scenario.expect_execution_authorization+", got "+String(body?.legalGovernance?.executionAuthorization));
  }
  if(response && String(body?.answer||"").length<Number(scenario.min_answer_chars||1)){
    failures.push("answer too short ("+String(body?.answer||"").length+")");
  }
  const answerLower=String(body?.answer||"").toLowerCase();
  if(response && scenario.answer_must_match && !answerLower.includes(String(scenario.answer_must_match).toLowerCase())){
    failures.push("expected answer marker "+scenario.answer_must_match);
  }
  if(response && Array.isArray(scenario.answer_must_match_groups)){
    for(const group of scenario.answer_must_match_groups){
      const terms=Array.isArray(group)?group.map(x=>String(x).toLowerCase()).filter(Boolean):[];
      if(terms.length && !terms.some(term=>answerLower.includes(term))){
        failures.push("expected topical marker group "+terms.join("|"));
      }
    }
  }
  if(response && uatMembershipKey && body?.membership?.planCode!=="office"){
    failures.push("synthetic UAT membership not applied");
  }
  if(response && Number(body?.legalCrossReferenceCount||0)<Number(scenario.min_legal_cross_reference_count||0)){
    failures.push("expected at least "+scenario.min_legal_cross_reference_count+" legal cross-references, got "+String(body?.legalCrossReferenceCount||0));
  }
  if(response && body?.runtimeTelemetry!=="recorded"){
    failures.push("runtime telemetry not recorded ("+String(body?.runtimeTelemetry)+")");
  }
  if(elapsedMs>65000) failures.push("exceeded legal UAT latency budget: "+elapsedMs+"ms");

  const record={
    id:scenario.id,
    title:scenario.title,
    passed:failures.length===0,
    failures,
    http_status:response?.status||0,
    elapsed_ms:elapsedMs,
    ok:body?.ok===true,
    error:body?.error||null,
    failure_detail:body?.failureDetail||null,
    model:body?.model||null,
    mission_profile:body?.legalGovernance?.missionProfile||null,
    verification_state:body?.legalGovernance?.verificationState||null,
    release_state:body?.legalGovernance?.releaseState||null,
    execution_authorization:body?.legalGovernance?.executionAuthorization||null,
    human_review_required:body?.legalGovernance?.humanReviewRequired??null,
    postflight_verdict:body?.legalGovernance?.postflightVerdict||null,
    postflight_provisional:body?.legalGovernance?.postflightProvisional??null,
    runtime_telemetry:body?.runtimeTelemetry||null,
    legal_cross_reference_count:Number(body?.legalCrossReferenceCount||0),
    sources_count:Array.isArray(body?.sources) ? body.sources.length : 0,
    specialist_agents:Array.isArray(body?.legalGovernance?.specialistExecution?.agents)
      ? body.legalGovernance.specialistExecution.agents
      : [],
    answer_chars:String(body?.answer||"").length,
    answer:String(body?.answer||""),
    answer_excerpt:String(body?.answer||"").slice(0,500)
  };
  results.push(record);

  if(record.passed){
    console.log(`UAT PASS ${scenario.id}: ${elapsedMs}ms · ${record.mission_profile} · ${record.release_state}`);
  }else{
    console.error(`UAT FAIL ${scenario.id}: ${failures.join(" | ")}`);
  }
  const spacingDelay=Math.max(700,minScenarioSpacingMs-elapsedMs);
  await sleep(spacingDelay);
}

const passCount=results.filter(x=>x.passed).length;
const failCount=results.length-passCount;

fs.writeFileSync(outputPath,JSON.stringify({
  suite_id:suite.suite_id,
  executed_at:new Date().toISOString(),
  synthetic_data_only:true,
  scenario_count:results.length,
  pass_count:passCount,
  fail_count:failCount,
  results
},null,2)+"\n");

if(failCount){
  console.error(`LEGAL UAT FAIL: ${passCount}/${results.length} passed; ${failCount} failed`);
  process.exitCode=1;
}else{
  console.log(`LEGAL UAT PASS: ${passCount}/${results.length}`);
}
