import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import worker from "../src/index.js";

const MEMBER_KEY="SYNTHETIC-PRO-KEY-2026";
const ACCOUNT_ID="ACC-SYNTHETIC-OWNER";

function sha256Hex(text){
  return crypto.createHash("sha256").update(text).digest("hex");
}

class MemoryR2Object {
  constructor(bytes,meta={}){
    this.bytes=bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes||[]);
    this.size=this.bytes.byteLength;
    this.httpMetadata=meta.httpMetadata||{};
    this.customMetadata=meta.customMetadata||{};
    this.body=this.bytes;
  }
  async arrayBuffer(){ return this.bytes.buffer.slice(this.bytes.byteOffset,this.bytes.byteOffset+this.bytes.byteLength); }
}

class MemoryR2 {
  constructor(){ this.objects=new Map(); }
  async put(key,bytes,meta={}){ this.objects.set(key,new MemoryR2Object(new Uint8Array(bytes),meta)); }
  async get(key){ return this.objects.get(key)||null; }
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
  async batch(statements){
    const out=[];
    for(const statement of statements) out.push(await statement.run());
    return out;
  }
  async first(sql,args){
    if(sql==="SELECT 1 AS ok") return {ok:1};
    if(sql.includes("SELECT version FROM schema_migrations")) return {version:"0045_case_private_d1_object_store"};
    if(sql.includes("FROM sqlite_master") && sql.includes("case_workspaces")) return {n:4};
    if(sql.includes("FROM membership_access_keys k")){
      if(args[0]!==this.membershipHash) return null;
      return {
        account_id:ACCOUNT_ID,
        key_status:"active",
        plan_code:"pro",
        entitlement_status:"active",
        monthly_quota:1000,
        seat_limit:1,
        account_status:"active"
      };
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
      return {results:[...this.documents.values()]
        .filter(x=>x.case_id===caseId && x.storage_state!=="deleted")
        .sort((a,b)=>a.slot_number-b.slot_number)
        .map(x=>({slot_number:x.slot_number}))};
    }
    if(sql.includes("FROM case_document_slots") && sql.includes("WHERE case_id=?") && sql.includes("ORDER BY slot_number")){
      const caseId=args[0];
      return {results:[...this.documents.values()]
        .filter(x=>x.case_id===caseId)
        .sort((a,b)=>a.slot_number-b.slot_number)
        .map(x=>({...x}))};
    }
    if(sql.includes("FROM case_workspaces w") && sql.includes("WHERE a.account_id=?")){
      const accountId=args[0];
      return {results:this.access
        .filter(x=>x.account_id===accountId && x.status==="active")
        .map(x=>this.workspaces.get(x.case_id))
        .filter(Boolean)
        .filter(x=>x.status!=="deleted")
        .map(x=>({...x,role:"owner"}))};
    }
    return {results:[]};
  }
  async run(sql,args){
    if(sql.startsWith("INSERT INTO case_workspaces")){
      const [id,owner,title,clientReference,legalArea,retentionUntil,createdAt,updatedAt]=args;
      this.workspaces.set(id,{
        id,
        owner_account_id:owner,
        title,
        client_reference:clientReference,
        legal_area:legalArea,
        status:"active",
        confidentiality_class:"private_legal",
        document_limit:20,
        professional_use_locked:1,
        retention_until:retentionUntil,
        created_at:createdAt,
        updated_at:updatedAt
      });
      return {success:true};
    }
    if(sql.startsWith("INSERT INTO case_workspace_access")){
      const [caseId,accountId,grantedAt]=args;
      this.access.push({case_id:caseId,account_id:accountId,role:"owner",status:"active",granted_at:grantedAt});
      return {success:true};
    }
    if(sql.startsWith("INSERT INTO case_document_slots")){
      const [id,caseId,slotNumber,originalName,mimeType,sha256,pageCount,storageKey,createdAt,updatedAt]=args;
      this.documents.set(id,{
        id,
        case_id:caseId,
        slot_number:slotNumber,
        original_name:originalName,
        mime_type:mimeType,
        sha256,
        page_count:pageCount,
        storage_key:storageKey,
        storage_state:"reserved",
        extraction_state:"not_started",
        provenance_required:1,
        created_at:createdAt,
        updated_at:updatedAt
      });
      return {success:true};
    }
    if(sql.startsWith("UPDATE case_document_slots") && sql.includes("storage_state='uploaded'")){
      const [updatedAt,docId,caseId]=args;
      const row=this.documents.get(docId);
      if(row && row.case_id===caseId && row.storage_state==="reserved"){
        row.storage_state="uploaded";
        row.updated_at=updatedAt;
      }
      return {success:true};
    }
    if(sql.startsWith("UPDATE case_workspaces") && sql.includes("professional_use_locked=1")){
      const [updatedAt,caseId]=args;
      const row=this.workspaces.get(caseId);
      if(row){
        row.professional_use_locked=1;
        row.updated_at=updatedAt;
      }
      return {success:true};
    }
    if(sql.startsWith("DELETE FROM case_document_slots")){
      const [docId,caseId]=args;
      const row=this.documents.get(docId);
      if(row && row.case_id===caseId) this.documents.delete(docId);
      return {success:true};
    }
    if(sql.startsWith("INSERT INTO case_audit_events")){
      this.audits.push({sql,args});
      return {success:true};
    }
    return {success:true};
  }
}

function pdfBytes(label){
  return new TextEncoder().encode("%PDF-1.4\n% Synthetic CasePilot document\n1 0 obj\n<< /Type /Catalog >>\nendobj\n% "+label+"\n%%EOF\n");
}

function makeEnv(){
  return {
    CASE_WORKSPACE_ENABLED:"true",
    CASE_D1_FALLBACK_ENABLED:"false",
    DB:new MemoryD1(),
    CASE_FILES:new MemoryR2(),
    ASSETS:{fetch:async()=>new Response("not used")}
  };
}

function ctx(){ return {waitUntil(){}}; }

async function call(env,path,{method="GET",json=null,bytes=null,fileName=null,pageCount=null}={}){
  const headers=new Headers({"X-Membership-Key":MEMBER_KEY});
  let body;
  if(json!==null){
    headers.set("content-type","application/json");
    body=JSON.stringify(json);
  }
  if(bytes!==null){
    headers.set("content-type","application/pdf");
    headers.set("X-File-Name",fileName);
    if(pageCount!==null) headers.set("X-Page-Count",String(pageCount));
    body=bytes;
  }
  return worker.fetch(new Request("https://local.test"+path,{method,headers,body}),env,ctx());
}

test("CPDOC-01 two synthetic matters keep uploaded documents strictly case-scoped",async()=>{
  const env=makeEnv();

  const aRes=await call(env,"/api/cases",{method:"POST",json:{title:"Synthetic employment dispute A",clientReference:"SYN-A",legalArea:"labour_social"}});
  assert.equal(aRes.status,201);
  const caseA=(await aRes.json()).case.id;

  const bRes=await call(env,"/api/cases",{method:"POST",json:{title:"Synthetic employment dispute B",clientReference:"SYN-B",legalArea:"labour_social"}});
  assert.equal(bRes.status,201);
  const caseB=(await bRes.json()).case.id;
  assert.notEqual(caseA,caseB);

  const docs=[
    ["dismissal-decision.pdf","dismissal decision",3],
    ["employment-contract.pdf","employment contract",7],
    ["delivery-receipt.pdf","delivery receipt",1]
  ];
  const uploaded=[];
  for(const [fileName,label,pages] of docs){
    const bytes=pdfBytes(label);
    const res=await call(env,"/api/cases/"+caseA+"/documents/upload",{method:"POST",bytes,fileName,pageCount:pages});
    assert.equal(res.status,201,fileName);
    const body=await res.json();
    assert.equal(body.caseId,caseA);
    assert.equal(body.document.originalName,fileName);
    assert.equal(body.document.storageState,"uploaded");
    assert.equal(body.humanGate.professionalUseLocked,true);
    assert.equal(body.ingestion,"stored_private_not_ingested");
    uploaded.push({body,bytes});
  }

  const bUpload=await call(env,"/api/cases/"+caseB+"/documents/upload",{
    method:"POST",
    bytes:pdfBytes("other matter document"),
    fileName:"other-matter.pdf",
    pageCount:1
  });
  assert.equal(bUpload.status,201);
  const bDoc=(await bUpload.json()).document;

  const listA=await (await call(env,"/api/cases/"+caseA+"/documents")).json();
  const listB=await (await call(env,"/api/cases/"+caseB+"/documents")).json();
  assert.equal(listA.documents.length,3);
  assert.equal(listB.documents.length,1);
  assert.deepEqual(listA.documents.map(x=>x.original_name),docs.map(x=>x[0]));
  assert.equal(listB.documents[0].original_name,"other-matter.pdf");
  assert.ok(!listA.documents.some(x=>x.id===bDoc.id));

  const first=uploaded[0];
  const docId=first.body.document.id;
  const storedRow=env.DB.documents.get(docId);
  assert.equal(storedRow.case_id,caseA);
  assert.ok(storedRow.storage_key.startsWith("case-files/v1/"+caseA+"/"));
  const storedObject=env.CASE_FILES.objects.get(storedRow.storage_key);
  assert.ok(storedObject);
  assert.equal(storedObject.customMetadata.caseId,caseA);
  assert.equal(storedObject.customMetadata.documentId,docId);

  const goodDownload=await call(env,"/api/cases/"+caseA+"/documents/"+docId+"/download");
  assert.equal(goodDownload.status,200);
  assert.equal(goodDownload.headers.get("cache-control"),"private, no-store, max-age=0");
  assert.deepEqual(new Uint8Array(await goodDownload.arrayBuffer()),first.bytes);

  const crossCase=await call(env,"/api/cases/"+caseB+"/documents/"+docId+"/download");
  assert.equal(crossCase.status,404);
  assert.equal((await crossCase.json()).error,"case_document_not_found");

  assert.equal(env.DB.workspaces.get(caseA).professional_use_locked,1);
  assert.equal(env.DB.workspaces.get(caseB).professional_use_locked,1);
});
