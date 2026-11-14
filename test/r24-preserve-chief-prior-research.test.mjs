import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildAgentPlan,runOpenAIOrchestrator} from "../src/agent-orchestrator.js";

const env={
  OPENAI_ORCHESTRATOR_ENABLED:"true",
  OPENAI_API_KEY:"test-key-private-placeholder-1234567890",
  OPENAI_MODEL:"gpt-test",
  OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED:"true",
  LIOE_SPECIALIST_EXECUTION_ENABLED:"true",
  OPENAI_PROVIDER_TIMEOUT_MS:"12000"
};
const official="https://www.pravda.gov.mk/";
const citation={type:"url_citation",url:official,title:"Ministry of Justice — public source"};
function response(payload){
  return new Response(JSON.stringify(payload),{status:200,headers:{"content-type":"application/json"}});
}
function specialistPayload(){
  return {status:"completed",output_text:"SPECIALIST_PRIOR_FINDING",
    output:[
      {type:"web_search_call",id:"research-original"},
      {type:"message",content:[{type:"output_text",annotations:[citation]}]}
    ],
    usage:{input_tokens:12,output_tokens:6,total_tokens:18}
  };
}

test("P1: single Chief retry keeps prior specialist findings and citations without any second specialist/search calls",async()=>{
  const previousFetch=globalThis.fetch;
  let specialistCalls=0,chiefCalls=0;
  const plan=buildAgentPlan("Спореди македонско право со правото на ЕУ и праксата на ЕСЧП.");
  try{
    globalThis.fetch=async(_url,options)=>{
      const body=JSON.parse(options.body);
      if(body.instructions.includes("Return concise findings for the Chief Legal Orchestrator")){
        specialistCalls++;
        return response(specialistPayload());
      }
      chiefCalls++;
      return response({status:"incomplete",incomplete_details:{reason:"max_output_tokens"},output:[],
        usage:{input_tokens:45,output_tokens:900,total_tokens:945}});
    };
    const first=await runOpenAIOrchestrator(env,{
      plan,input:"Спореди ги процесните ризици и извори.",researchInput:"Спореди правни извори.",
      externalResearchEnabled:true,webSearchEnabled:true,maxOutputTokens:900
    });
    assert.equal(first.ok,false);
    assert.equal(first.failureDetail,"max_output_tokens");
    assert.ok(specialistCalls>=1,"specialist presearch fixture was not reached");
    assert.equal(chiefCalls,1);
    assert.equal(first.priorChiefRecovery.reason,"max_output_tokens");
    assert.equal(first.priorChiefRecovery.externalResearchAuthorized,true);
    assert.equal(first.priorChiefRecovery.priorWebSearchUsed,true);
    assert.equal(first.priorChiefRecovery.specialist.sources[0].url,official);
    assert.ok(first.priorChiefRecovery.specialist.findings.length>0);
    const originalCalls=specialistCalls+chiefCalls;
    let retryBody=null;
    let retryCalls=0;
    globalThis.fetch=async(_url,options)=>{
      retryCalls++;
      retryBody=JSON.parse(options.body);
      return response({status:"completed",output_text:"Правен нацрт со извори, задолжителна човечка проверка.",output:[],
        usage:{input_tokens:50,output_tokens:24,total_tokens:74}});
    };
    const retry=await runOpenAIOrchestrator(env,{
      plan,input:"Спореди ги процесните ризици и извори.",researchInput:"Спореди правни извори.",
      externalResearchEnabled:false,webSearchEnabled:false,maxOutputTokens:3000,
      reasoningEffort:"low",chiefOnlyRecoveryMode:true,priorChiefRecovery:first.priorChiefRecovery
    });
    assert.equal(retry.ok,true);
    assert.equal(retryCalls,1,"the recovered attempt MUST call only one Chief and no specialists");
    assert.equal(specialistCalls+chiefCalls,originalCalls,"first attempt's specialist results were not reused");
    assert.equal(retryBody.store,false);
    assert.equal(retryBody.tools,undefined,"no second paid web_search tool invocation");
    assert.equal(retryBody.tool_choice,undefined);
    assert.match(retryBody.input[0].content[0].text,/SPECIALIST_PRIOR_FINDING/);
    assert.ok(retryBody.input[0].content[0].text.includes(official),"previous cited URL absent from retry prompt");
    assert.equal(retry.sources[0].url,official);
    assert.equal(retry.webSearchUsed,true,"prior research must remain truthfully reported");
    assert.equal(retry.specialistExecution.executed,true);
    assert.equal(retry.specialistExecution.providerCalls,0,"recovery calls are counted only once in the first attempt");
    assert.equal(retry.providerCalls,1);
    assert.equal(retry.usage.totalTokens,74);
    assert.match(retry.humanGate,/not_authorized/);
  }finally{globalThis.fetch=previousFetch;}
});

test("P1: a partial Chief web citation is restored as historical context but no new web search is allowed",async()=>{
  const previousFetch=globalThis.fetch;
  const plan=buildAgentPlan("Направи кратко истражувачко резиме со јавни извори.");
  try{
    let firstBody=null;
    globalThis.fetch=async(_url,options)=>{
      firstBody=JSON.parse(options.body);
      return response({status:"incomplete",incomplete_details:{reason:"max_output_tokens"},
        output:[
          {type:"web_search_call",id:"chief-research-original"},
          {type:"message",content:[{type:"output_text",annotations:[citation]}]}
        ],
        usage:{input_tokens:21,output_tokens:900,total_tokens:921}
      });
    };
    const first=await runOpenAIOrchestrator(env,{
      plan,input:"Истражи и наведи ги изворите.",externalResearchEnabled:true,
      webSearchEnabled:true,maxOutputTokens:900
    });
    assert.equal(first.error,"openai_incomplete_response");
    assert.ok(Array.isArray(firstBody.tools)&&firstBody.tools.some(t=>t.type==="web_search"));
    assert.equal(first.priorChiefRecovery.chiefCitations[0].url,official);
    let retryCalls=0,secondBody=null;
    globalThis.fetch=async(_url,options)=>{
      retryCalls++;
      secondBody=JSON.parse(options.body);
      return response({status:"completed",output_text:"Истражувачки нацрт.",output:[],
        usage:{input_tokens:25,output_tokens:10,total_tokens:35}
      });
    };
    const second=await runOpenAIOrchestrator(env,{
      plan,input:"Истражи и наведи ги изворите.",externalResearchEnabled:false,
      webSearchEnabled:false,chiefOnlyRecoveryMode:true,
      priorChiefRecovery:first.priorChiefRecovery,maxOutputTokens:3000
    });
    assert.equal(second.ok,true);
    assert.equal(retryCalls,1);
    assert.equal(secondBody.tools,undefined);
    assert.ok(secondBody.input[0].content[0].text.includes(official));
    assert.equal(second.sources[0].url,official);
    assert.equal(second.webSearchUsed,true);
  }finally{globalThis.fetch=previousFetch;}
});

test("P1: filtered/unknown incompletes cannot be promoted into retry snapshots, and no authorisation cannot create web citations",async()=>{
  const previousFetch=globalThis.fetch;
  const plan=buildAgentPlan("Напиши краток правен информативен преглед.");
  try{
    globalThis.fetch=async()=>response({status:"incomplete",
      incomplete_details:{reason:"content_filter"},
      output:[{type:"web_search_call"},{type:"message",content:[{type:"output_text",annotations:[citation]}]}]
    });
    const refused=await runOpenAIOrchestrator(env,{plan,input:"Краток преглед.",
      externalResearchEnabled:true,webSearchEnabled:true});
    assert.equal(refused.error,"openai_incomplete_response");
    assert.equal(refused.priorChiefRecovery,undefined,"filtered content is not valid recovered evidence");

    globalThis.fetch=async()=>response({status:"incomplete",
      incomplete_details:{reason:"max_output_tokens"},
      output:[{type:"web_search_call"},{type:"message",content:[{type:"output_text",annotations:[citation]}]}]
    });
    const noConsent=await runOpenAIOrchestrator(env,{plan,input:"Краток преглед.",
      externalResearchEnabled:false,webSearchEnabled:false});
    assert.equal(noConsent.priorChiefRecovery.externalResearchAuthorized,false);
    assert.equal(noConsent.priorChiefRecovery.chiefCitations.length,0);
    assert.equal(noConsent.priorChiefRecovery.priorWebSearchUsed,false);
  }finally{globalThis.fetch=previousFetch;}
});

test("P1: R24 must forward the actual first-attempt evidence only to token-exhaustion retry",()=>{
  const worker=readFileSync("src/index.js","utf8");
  const orch=readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(worker,/priorChiefRecovery:truncatedAtTokenBudget \? first\.priorChiefRecovery : null/);
  assert.match(orch,/chiefNeedsWeb=!capacityFallbackMode && !chiefOnlyRecoveryMode/);
  assert.match(orch,/restoreChiefRecoveryEvidence\(priorChiefRecovery\)/);
  assert.match(orch,/priorChiefRecovery:snapshotChiefRecoveryEvidence\(specialistStage,payload,\{externalResearchEnabled\}\)/);
});
