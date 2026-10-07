import fs from "node:fs";

const suitePath=process.argv[2] || "data/uat/legal-scenarios-v1.json";
const outputPath=process.env.UAT_OUTPUT || "/tmp/legal-uat-results.json";
const suite=JSON.parse(fs.readFileSync(suitePath,"utf8"));
if(suite.synthetic_data_only!==true) throw new Error("UAT suite must be synthetic_data_only");
const base=String(process.env.AI_ADVOCAT_BASE_URL || suite.base_url || "").replace(/\/$/,"");
if(!/^https:\/\//.test(base)) throw new Error("Invalid UAT base URL");

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];

for(const scenario of suite.scenarios){
  const started=Date.now();
  let response;
  let body;
  try{
    response=await fetch(base+"/api/chat",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "origin":"https://ai-advokat.github.io"
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
    throw new Error(`${scenario.id}: network/timeout failure: ${String(error?.message||error)}`);
  }

  const elapsedMs=Date.now()-started;
  const record={
    id:scenario.id,
    title:scenario.title,
    http_status:response.status,
    elapsed_ms:elapsedMs,
    ok:body?.ok===true,
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
    answer_chars:String(body?.answer||"").length,
    answer_excerpt:String(body?.answer||"").slice(0,500)
  };
  results.push(record);

  if(response.status!==200) throw new Error(`${scenario.id}: HTTP ${response.status}: ${JSON.stringify(body).slice(0,1200)}`);
  if(body?.ok!==true) throw new Error(`${scenario.id}: API ok=false: ${JSON.stringify(body).slice(0,1200)}`);
  if(body?.model!=="gpt-6.1-sol") throw new Error(`${scenario.id}: unexpected model ${body?.model}`);
  if(body?.legalGovernance?.engine!=="AI_ADVOKAT_LIOE_v1") throw new Error(`${scenario.id}: LIOE metadata missing`);
  if(scenario.expect_mission_profile && body?.legalGovernance?.missionProfile!==scenario.expect_mission_profile){
    throw new Error(`${scenario.id}: expected mission ${scenario.expect_mission_profile}, got ${body?.legalGovernance?.missionProfile}`);
  }
  if(scenario.expect_human_review===true && body?.legalGovernance?.humanReviewRequired!==true){
    throw new Error(`${scenario.id}: Human Gate/human review must be required`);
  }
  if(scenario.expect_execution_authorization && body?.legalGovernance?.executionAuthorization!==scenario.expect_execution_authorization){
    throw new Error(`${scenario.id}: expected executionAuthorization ${scenario.expect_execution_authorization}, got ${body?.legalGovernance?.executionAuthorization}`);
  }
  if(String(body?.answer||"").length<Number(scenario.min_answer_chars||1)){
    throw new Error(`${scenario.id}: answer too short (${String(body?.answer||"").length})`);
  }
  if(scenario.answer_must_match && !String(body?.answer||"").toLowerCase().includes(String(scenario.answer_must_match).toLowerCase())){
    throw new Error(`${scenario.id}: expected answer marker ${scenario.answer_must_match}`);
  }
  if(Number(body?.legalCrossReferenceCount||0)<Number(scenario.min_legal_cross_reference_count||0)){
    throw new Error(`${scenario.id}: expected at least ${scenario.min_legal_cross_reference_count} legal cross-references, got ${body?.legalCrossReferenceCount||0}`);
  }
  if(body?.runtimeTelemetry!=="recorded"){
    throw new Error(`${scenario.id}: runtime telemetry not recorded (${body?.runtimeTelemetry})`);
  }
  if(elapsedMs>65000) throw new Error(`${scenario.id}: exceeded legal UAT latency budget: ${elapsedMs}ms`);

  console.log(`UAT PASS ${scenario.id}: ${elapsedMs}ms · ${record.mission_profile} · ${record.release_state}`);
  await sleep(700);
}

fs.writeFileSync(outputPath,JSON.stringify({
  suite_id:suite.suite_id,
  executed_at:new Date().toISOString(),
  synthetic_data_only:true,
  scenario_count:results.length,
  pass_count:results.length,
  results
},null,2)+"\n");

console.log(`LEGAL UAT PASS: ${results.length}/${results.length}`);
