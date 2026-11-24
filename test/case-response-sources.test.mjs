import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import {
  caseResponseHash, caseResponseDocument, createCaseResponseSnapshot, readCaseResponseSnapshot
} from "../src/case-response-sources.js";

const caseId="CASE-123e4567-e89b-42d3-a456-426614174000";
const otherCaseId="CASE-123e4567-e89b-42d3-a456-426614174001";
const id="DOC-123e4567-e89b-42d3-a456-426614174010";
const sha256="a".repeat(64);
const analysisText="Синтетичка работна анализа. Извлечениот факт е означен за проверка.";
const document={
  id, caseId, sha256, original_name:"synthetic.pdf", storage_state:"uploaded", extraction_state:"complete"
};
const packet={
  caseId, documentId:id, sourceSha256:sha256,
  extraction:{
    document_type:"decision",summary:"Синтетичко решение",entities:[],dates:[],property_refs:[],contracts:[],
    facts:[{id:"F1",text:"Судот го одбил предлогот.",status:"source_confirmed",page:1,material:true}],
    legal_issue_hints:[],missing_context:[],extraction_warnings:[]
  }
};
const law={
  source:"Тестен правен извор", text:"СИНТЕТИЧКА РЕФЕРЕНЦА ЗА ТЕСТ", locator:"Член 1",
  provenance:{
    kind:"legal_article",sourceIdentity:"Тестен правен извор",authorityClass:"primary_official",
    locator:"Член 1",releaseRole:"legal_authority",legalAuthority:true,humanReviewStatus:"approved",
    versionHumanReviewStatus:"approved",instrumentKey:"mk:synthetic",articleNumber:"1",
    versionLabel:"test-only",sourceIssueNumber:"1/2026",sourceIssueDate:"2026-01-01",
    sourceUrl:"https://example.invalid/fixture",sourceSha256:"b".repeat(64),currentLawClaim:true
  }
};

async function fixture(legalContext=[law]){
  const documentRecord=caseResponseDocument(document,packet,await caseResponseHash(JSON.stringify(packet)));
  return createCaseResponseSnapshot({
    caseId, analysisSha256:await caseResponseHash(analysisText), documents:[documentRecord], legalContext
  });
}

test("response sources exclude incomplete, unreviewed, historical and notice records",async()=>{
  for(const change of [
    {sourceSha256:""}, {currentLawClaim:false}, {legalAuthority:false},
    {versionHumanReviewStatus:"pending"}, {sourceUrl:"http://example.invalid/"}
  ]){
    assert.equal(await fixture([{...law,provenance:{...law.provenance,...change}}]),null);
  }
  assert.equal(await fixture([{contextRole:"governance_notice"}]),null);
  const snapshot=await fixture([{contextRole:"governance_notice"},law]);
  assert.deepEqual(snapshot.sources.map(item=>item.articleNumber),["1"]);
});

test("extraction artifacts must match the server case, document and document bytes",()=>{
  for(const change of [{caseId:otherCaseId},{documentId:"other"},{sourceSha256:"c".repeat(64)}]){
    assert.equal(caseResponseDocument(document,{...packet,...change},"d".repeat(64)),null);
  }
  assert.equal(caseResponseDocument(document,null,"d".repeat(64)),null);
});

test("snapshot verifies the exact analysis, SHA and case",async()=>{
  const {bytes,sha256:expectedSha256}=await fixture();
  const valid={bytes,expectedSha256,caseId,analysisText};
  assert.equal((await readCaseResponseSnapshot(valid)).documents[0].sha256,sha256);
  for(const change of [
    {caseId:otherCaseId},{analysisText:"changed"},{bytes:bytes+" "},{expectedSha256:"e".repeat(64)},
    {bytes:"{",expectedSha256:await caseResponseHash("{")}
  ]){
    assert.equal(await readCaseResponseSnapshot({...valid,...change}),null);
  }
});

async function workerFixture({ role="lawyer", docs=[document], source=true, extraction=packet }={}){
  const snapshot=await fixture();
  const prefix=`case-derived/v1/${caseId}/`;
  const stored=new Map([
    [prefix+"analysis/latest.md",analysisText],
    [prefix+id+"/extraction.json",JSON.stringify(extraction)]
  ]);
  if(source) stored.set(prefix+"analysis/response-sources.json",snapshot.bytes);
  const writes=[];
  const audit=[];
  let providerCalls=0;
  const env={
    CASE_WORKSPACE_ENABLED:"true",
    FREE_CHAT_PROVIDER:"workers_ai",
    AI:{async run(){
      providerCalls++;
      return {response:[
        "РАБОТЕН НАЦРТ — ПОТРЕБНА Е АДВОКАТСКА ПРОВЕРКА",
        "Одговор на жалба",
        "Судот го одбил предлогот. Документот и првата страница се наведени за проверка.",
        "Се предлага судот да ги цени наводите и приложените докази при своето одлучување."
      ].join("\n\n")};
    }},
    CASE_FILES:{
      async put(key,bytes){writes.push(key);stored.set(key,new TextDecoder().decode(bytes));},
      async get(key){return stored.has(key)?{text:async()=>stored.get(key)}:null;},
      async delete(key){stored.delete(key);}
    },
    DB:{
      prepare(sql){
        return {
          bind(...values){this.values=values;return this;},
          async first(){
            if(sql.includes("SELECT 1 AS ok")) return {ok:1};
            if(sql.includes("FROM schema_migrations")) return {version:"53"};
            if(sql.includes("FROM sqlite_master")) return {n:4};
            if(sql.includes("FROM membership_access_keys")) return {account_id:"synthetic",plan_code:"pro",entitlement_status:"active"};
            if(sql.includes("JOIN case_workspace_access")) return this.values[0]===caseId?{role,status:"active"}:null;
            throw Error("Unexpected query: "+sql);
          },
          async all(){
            if(sql.includes("FROM case_document_slots")) return {results:docs};
            throw Error("Unexpected query: "+sql);
          },
          async run(){
            if(sql.includes("INSERT INTO case_audit_events")) audit.push(this.values);
            return {success:true};
          }
        };
      }
    }
  };
  function request({caseKey=caseId,member=true,hash=snapshot.sha256}={}){
    return worker.fetch(new Request("https://worker.invalid/api/cases/"+caseKey+"/intelligence/draft",{
      method:"POST",
      headers:{"content-type":"application/json",...(member?{"x-membership-key":"synthetic"}:{})},
      body:JSON.stringify({draftType:"response",instruction:"Подготви работен одговор на жалба.",responseSourcesSha256:hash})
    }),env);
  }
  return {snapshot,request,writes,stored,audit,providerCalls:()=>providerCalls};
}

test("actual Worker response route rejects unauthenticated, other-case and reviewer requests",async()=>{
  const owner=await workerFixture();
  const reviewer=await workerFixture({role:"reviewer"});
  assert.equal((await owner.request({member:false})).status,401);
  assert.equal((await owner.request({caseKey:otherCaseId})).status,404);
  assert.equal((await reviewer.request()).status,403);
  assert.equal(owner.providerCalls()+reviewer.providerCalls(),0);
});

test("actual Worker stops stale law snapshot and changed extraction before AI invocation",async()=>{
  const missing=await workerFixture({source:false});
  const stale=await workerFixture({extraction:{...packet,model:"different"}});
  for(const [fixture,error] of [[missing,"case_response_source_snapshot_changed"],[stale,"case_response_document_snapshot_changed"]]){
    const response=await fixture.request();
    assert.equal(response.status,409);
    assert.equal((await response.json()).error,error);
    assert.equal(fixture.providerCalls(),0);
    assert.deepEqual(fixture.writes,[]);
  }
});

test("actual Worker stores the working draft and exact source receipt with Human Gate locked",async()=>{
  const f=await workerFixture();
  const response=await f.request();
  const payload=await response.json();
  assert.equal(response.status,200,JSON.stringify(payload));
  assert.equal(payload.draftType,"response");
  assert.equal(payload.draftSha256,await caseResponseHash(payload.draft));
  assert.equal(payload.responseSourcesSha256,f.snapshot.sha256);
  assert.equal(payload.humanGate.professionalUseLocked,true);
  assert.equal(payload.filing,"forbidden");
  assert.equal(f.stored.get(f.writes.find(key=>key.endsWith(".sources.json"))),f.snapshot.bytes);
  assert.match(JSON.stringify(f.audit),new RegExp(f.snapshot.sha256));
});
