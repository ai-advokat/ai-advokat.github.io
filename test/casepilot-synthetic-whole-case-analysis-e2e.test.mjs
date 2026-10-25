import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import worker from "../src/index.js";

const MEMBER_KEY="SYNTHETIC-PRO-KEY-2026";
const ACCOUNT_ID="ACC-SYNTHETIC-OWNER";

function sha256Hex(value){ return crypto.createHash("sha256").update(value).digest("hex"); }

class MemoryR2Object {
  constructor(bytes,meta={}){
    this.bytes=bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes||[]);
    this.size=this.bytes.byteLength;
    this.httpMetadata=meta.httpMetadata||{};
    this.customMetadata=meta.customMetadata||{};
    this.body=this.bytes;
  }
  async arrayBuffer(){ return this.bytes.buffer.slice(this.bytes.byteOffset,this.bytes.byteOffset+this.bytes.byteLength); }
  async text(){ return new TextDecoder().decode(this.bytes); }
}
class MemoryR2 {
  constructor(){ this.objects=new Map(); }
  async put(key,bytes,meta={}){ this.objects.set(key,new MemoryR2Object(new Uint8Array(bytes),meta)); }
  async get(key){ return this.objects.get(key)||null; }
  async head(key){ return this.objects.get(key)||null; }
  async delete(key){ this.objects.delete(key); }
}
class Statement {
  constructor(db,sql){ this.db=db; this.sql=sql.replace(/\s+/g," ").trim(); this.args=[]; }
  bind(...args){ this.args=args; return this; }
  async first(){ return this.db.first(this.sql,this.args); }
  async all(){ return this.db.all(this.sql,this.args); }
  async run(){ return this.db.run(this.sql,this.args); }
}
class MemoryD1 {
  constructor(){
    this.membershipHash=sha256Hex(MEMBER_KEY);
    this.workspaces=new Map();
    this.access=[];
    this.documents=new Map();
    this.audits=[];
  }
  prepare(sql){ return new Statement(this,sql); }
  async batch(statements){ const out=[]; for(const statement of statements) out.push(await statement.run()); return out; }
  async first(sql,args){
    if(sql==="SELECT 1 AS ok") return {ok:1};
    if(sql.includes("SELECT version FROM schema_migrations")) return {version:"0045_case_private_d1_object_store"};
    if(sql.includes("FROM sqlite_master") && sql.includes("case_workspaces")) return {n:4};
    if(sql.includes("FROM membership_access_keys k")){
      if(args[0]!==this.membershipHash) return null;
      return {account_id:ACCOUNT_ID,key_status:"active",plan_code:"pro",entitlement_status:"active",monthly_quota:1000,seat_limit:1,account_status:"active"};
    }
    if(sql.includes("FROM case_workspaces w JOIN case_workspace_access a")){
      const caseId=args[0],accountId=args[1];
      const workspace=this.workspaces.get(caseId);
      const access=this.access.find(x=>x.case_id===caseId && x.account_id===accountId && x.status==="active");
      return workspace&&access&&workspace.status!=="deleted" ? {...workspace,role:access.role} : null;
    }
    if(sql.includes("FROM case_document_slots") && sql.includes("WHERE id=? AND case_id=?")){
      const docId=args[0],caseId=args[1];
      const row=this.documents.get(docId);
      return row&&row.case_id===caseId ? {...row} : null;
    }
    return null;
  }
  async all(sql,args){
    if(sql.includes("SELECT slot_number FROM case_document_slots WHERE case_id=?")){
      const caseId=args[0];
      return {results:[...this.documents.values()].filter(x=>x.case_id===caseId && x.storage_state!=="deleted").sort((a,b)=>a.slot_number-b.slot_number).map(x=>({slot_number:x.slot_number}))};
    }
    if(sql.includes("FROM case_document_slots") && sql.includes("WHERE case_id=?") && sql.includes("ORDER BY slot_number")){
      const caseId=args[0];
      return {results:[...this.documents.values()].filter(x=>x.case_id===caseId && x.storage_state!=="deleted").sort((a,b)=>a.slot_number-b.slot_number).map(x=>({...x}))};
    }
    if(sql.includes("FROM legal_articles") || sql.includes("FROM case_law") || sql.includes("FROM gazette")) return {results:[]};
    return {results:[]};
  }
  async run(sql,args){
    if(sql.startsWith("INSERT INTO case_workspaces")){
      const [id,owner,title,clientReference,legalArea,retentionUntil,createdAt,updatedAt]=args;
      this.workspaces.set(id,{id,owner_account_id:owner,title,client_reference:clientReference,legal_area:legalArea,status:"active",confidentiality_class:"private_legal",document_limit:20,professional_use_locked:1,retention_until:retentionUntil,created_at:createdAt,updated_at:updatedAt});
      return {success:true};
    }
    if(sql.startsWith("INSERT INTO case_workspace_access")){
      const [caseId,accountId,grantedAt]=args;
      this.access.push({case_id:caseId,account_id:accountId,role:"owner",status:"active",granted_at:grantedAt});
      return {success:true};
    }
    if(sql.startsWith("INSERT INTO case_document_slots")){
      const [id,caseId,slotNumber,originalName,mimeType,sha256,pageCount,storageKey,createdAt,updatedAt]=args;
      this.documents.set(id,{id,case_id:caseId,slot_number:slotNumber,original_name:originalName,mime_type:mimeType,sha256,page_count:pageCount,storage_key:storageKey,storage_state:"reserved",extraction_state:"not_started",provenance_required:1,created_at:createdAt,updated_at:updatedAt});
      return {success:true};
    }
    if(sql.startsWith("UPDATE case_document_slots") && sql.includes("storage_state='uploaded'")){
      const [updatedAt,docId,caseId]=args;
      const row=this.documents.get(docId);
      if(row && row.case_id===caseId && row.storage_state==="reserved"){ row.storage_state="uploaded"; row.updated_at=updatedAt; }
      return {success:true};
    }
    if(sql.startsWith("UPDATE case_document_slots") && sql.includes("extraction_state='complete'")){
      const [updatedAt,docId,caseId]=args;
      const row=this.documents.get(docId);
      if(row && row.case_id===caseId){ row.extraction_state="complete"; row.updated_at=updatedAt; }
      return {success:true};
    }
    if(sql.startsWith("UPDATE case_document_slots") && sql.includes("extraction_state='failed'")){
      const [updatedAt,docId,caseId]=args;
      const row=this.documents.get(docId);
      if(row && row.case_id===caseId){ row.extraction_state="failed"; row.updated_at=updatedAt; }
      return {success:true};
    }
    if(sql.startsWith("UPDATE case_workspaces") && sql.includes("professional_use_locked=1")){
      const [updatedAt,caseId]=args;
      const row=this.workspaces.get(caseId);
      if(row){ row.professional_use_locked=1; row.updated_at=updatedAt; }
      return {success:true};
    }
    if(sql.startsWith("DELETE FROM case_document_slots")){
      const [docId,caseId]=args; const row=this.documents.get(docId); if(row && row.case_id===caseId) this.documents.delete(docId); return {success:true};
    }
    if(sql.startsWith("INSERT INTO case_audit_events")){ this.audits.push({sql,args}); return {success:true}; }
    return {success:true};
  }
}

function pdfBytes(text){ return new TextEncoder().encode("%PDF-1.4\n% SYNTHETIC TEST ONLY\n"+text+"\n%%EOF\n"); }
function extractionForPrompt(prompt){
  if(prompt.includes("dismissal-decision.pdf")) return {
    document_type:"Решение за отказ",summary:"Синтетичко решение за отказ.",
    entities:[{name:"Ана Тестова",role:"работник",page:1,locator:null},{name:"Синтетика ДООЕЛ",role:"работодавач",page:1,locator:null}],
    dates:[{date:"2026-09-01",text:"Решение од 01.09.2026",page:1,locator:null}],property_refs:[],contracts:[],
    facts:[{id:"F-DISMISSAL-1",text:"Синтетика ДООЕЛ донело решение за отказ за Ана Тестова на 01.09.2026.",fact_type:"dismissal",material:true,status:"source_confirmed",page:1,locator:null}],
    legal_issue_hints:["престанок на работен однос"],missing_context:[],extraction_warnings:[]
  };
  if(prompt.includes("employment-contract.pdf")) return {
    document_type:"Договор за вработување",summary:"Синтетички договор за вработување.",
    entities:[{name:"Ана Тестова",role:"работник",page:1,locator:null},{name:"Синтетика ДООЕЛ",role:"работодавач",page:1,locator:null}],
    dates:[{date:"2024-03-15",text:"Договор од 15.03.2024",page:1,locator:null}],property_refs:[],
    contracts:[{contract_type:"договор за вработување",parties:["Ана Тестова","Синтетика ДООЕЛ"],date:"2024-03-15",subject:"вработување",page:1,locator:null}],
    facts:[{id:"F-CONTRACT-1",text:"Ана Тестова и Синтетика ДООЕЛ склучиле договор за вработување на 15.03.2024.",fact_type:"employment_contract",material:true,status:"source_confirmed",page:1,locator:null}],
    legal_issue_hints:["постоење на работен однос"],missing_context:[],extraction_warnings:[]
  };
  if(prompt.includes("delivery-receipt.pdf")) return {
    document_type:"Доказ за врачување",summary:"Синтетичка повратница.",
    entities:[{name:"Ана Тестова",role:"примач",page:1,locator:null}],
    dates:[{date:"2026-09-03",text:"Прием на 03.09.2026",page:1,locator:null}],property_refs:[],contracts:[],
    facts:[{id:"F-DELIVERY-1",text:"Ана Тестова го примила решението на 03.09.2026.",fact_type:"delivery",material:true,status:"source_confirmed",page:1,locator:null}],
    legal_issue_hints:["врачување"],missing_context:[],extraction_warnings:[]
  };
  throw new Error("unexpected extraction prompt");
}

function wholeCaseAnalysis(prompt){
  const ids=[...new Set([...prompt.matchAll(/DOCUMENT (DOC-[A-Za-z0-9-]+)/g)].map(m=>m[1]))];
  if(ids.length!==3) throw new Error("whole-case prompt must contain three document IDs");
  return [
    "РАБОТНА АНАЛИЗА — ПОТРЕБНА Е ЧОВЕЧКА ПРОВЕРКА",
    "",
    "Пасош на предметот: синтетички работен спор меѓу Ана Тестова и Синтетика ДООЕЛ.",
    "Хронологија:",
    `1. На 15.03.2024 е наведен договор за вработување [${ids[1]}:F-CONTRACT-1], страница 1.`,
    `2. На 01.09.2026 е наведено решение за отказ [${ids[0]}:F-DISMISSAL-1], страница 1.`,
    `3. На 03.09.2026 е наведено врачување [${ids[2]}:F-DELIVERY-1], страница 1.`,
    "Материјалните факти се поврзани со конкретни документи и страници. Во тестираниот пакет нема меѓусебно мешање на изворите.",
    "Правни прашања: престанок на работен однос и врачување. CURRENT-LAW VERIFICATION REQUIRED.",
    "Недостасувачки докази: нема дополнителен доказ во овој ограничен синтетички тест.",
    "Процесна оценка: не се дава процент на успех. Секоја професионална употреба останува заклучена до Human Gate."
  ].join("\n");
}

function makeAI(){
  return {
    async toMarkdown(items){ const out=[]; for(const item of items) out.push({format:"text",data:await item.blob.text()}); return out; },
    async run(_model,options){
      const prompt=String(options?.messages?.[1]?.content||"");
      if(prompt.includes("DOCUMENT_ID:")) return {response:JSON.stringify(extractionForPrompt(prompt))};
      return {response:wholeCaseAnalysis(prompt)};
    }
  };
}
function makeEnv(){ return {CASE_WORKSPACE_ENABLED:"true",CASE_D1_FALLBACK_ENABLED:"false",FREE_CHAT_PROVIDER:"workers_ai",WORKERS_AI_MARKDOWN_ENABLED:"true",DB:new MemoryD1(),CASE_FILES:new MemoryR2(),AI:makeAI(),ASSETS:{fetch:async()=>new Response("not used")}}; }
function ctx(){ return {waitUntil(){}}; }
async function call(env,path,{method="GET",json=null,bytes=null,fileName=null,pageCount=null}={}){
  const headers=new Headers({"X-Membership-Key":MEMBER_KEY}); let body;
  if(json!==null){ headers.set("content-type","application/json"); body=JSON.stringify(json); }
  if(bytes!==null){ headers.set("content-type","application/pdf"); headers.set("X-File-Name",fileName); if(pageCount!==null) headers.set("X-Page-Count",String(pageCount)); body=bytes; }
  return worker.fetch(new Request("https://local.test"+path,{method,headers,body}),env,ctx());
}
async function createCase(env,title){ const res=await call(env,"/api/cases",{method:"POST",json:{title,clientReference:"SYN-A",legalArea:"labour_social"}}); assert.equal(res.status,201); return (await res.json()).case.id; }
async function uploadAndExtract(env,caseId,fileName,text,pages){
  const upload=await call(env,"/api/cases/"+caseId+"/documents/upload",{method:"POST",bytes:pdfBytes(text),fileName,pageCount:pages});
  assert.equal(upload.status,201); const doc=(await upload.json()).document;
  const extract=await call(env,"/api/cases/"+caseId+"/documents/"+doc.id+"/extract",{method:"POST",json:{}});
  assert.equal(extract.status,200); return doc;
}

test("CPDOC-03 whole-case analysis uses all extracted documents and remains Human-Gate locked",async()=>{
  const env=makeEnv();
  const caseId=await createCase(env,"Synthetic employment dispute A");
  const docs=[];
  docs.push(await uploadAndExtract(env,caseId,"dismissal-decision.pdf","РЕШЕНИЕ ЗА ОТКАЗ. Ана Тестова. Синтетика ДООЕЛ. 01.09.2026.",3));
  docs.push(await uploadAndExtract(env,caseId,"employment-contract.pdf","ДОГОВОР ЗА ВРАБОТУВАЊЕ. Ана Тестова. Синтетика ДООЕЛ. 15.03.2024.",7));
  docs.push(await uploadAndExtract(env,caseId,"delivery-receipt.pdf","ПОВРАТНИЦА. Ана Тестова. 03.09.2026.",1));

  const res=await call(env,"/api/cases/"+caseId+"/intelligence/analyze",{method:"POST",json:{}});
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.caseId,caseId);
  assert.equal(body.coverage.documentCoverage,100);
  assert.equal(body.coverage.materialFacts,3);
  assert.equal(body.coverage.sourceBackedMaterialFacts,3);
  assert.equal(body.coverage.evidenceCoverage,100);
  assert.equal(body.humanGate.professionalUseLocked,true);
  assert.equal(body.autonomousFiling,false);
  assert.match(body.analysis,/ПОТРЕБНА Е ЧОВЕЧКА ПРОВЕРКА/);
  assert.match(body.analysis,/CURRENT-LAW VERIFICATION REQUIRED/);
  for(const doc of docs) assert.match(body.analysis,new RegExp(doc.id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));

  const analysisKey="case-derived/v1/"+caseId+"/analysis/latest.md";
  const stored=env.CASE_FILES.objects.get(analysisKey);
  assert.ok(stored);
  assert.equal(stored.customMetadata.caseId,caseId);
  assert.equal(stored.customMetadata.kind,"case_intelligence_analysis_v1");
  const storedText=await stored.text();
  assert.equal(storedText,body.analysis);
  assert.equal(sha256Hex(stored.bytes),body.analysisSha256);
  assert.equal(env.DB.workspaces.get(caseId).professional_use_locked,1);
});
