import worker from "../src/index.js";
import { createD1 } from "./d1-shim.mjs";
import { caseResponseDocument, caseResponseHash, createCaseResponseSnapshot } from "../src/case-response-sources.js";

export const caseId="CASE-123e4567-e89b-42d3-a456-426614174000";
export const otherCaseId="CASE-123e4567-e89b-42d3-a456-426614174001";
export const docId="DOC-123e4567-e89b-42d3-a456-426614174010";
export const draftId="DRAFT-123e4567-e89b-42d3-a456-426614174011";
export const authKey="p02-LOCAL-SYNTHETIC-ONLY";
export const revisionPath=`/api/cases/${caseId}/intelligence/response-revisions`;
export const edited="ОДГОВОР НА ЖАЛБА\n\nСинтетички текст за прием. Адвокатска доработка.";

export async function makeRevisionFixture({r2=false,transactionalBatch=false}={}){
  const {raw,d1}=createD1({transactionalBatch});
  const accountId="p02-test-account";
  const documentSha="a".repeat(64);
  const packet=JSON.stringify({caseId,documentId:docId,sourceSha256:documentSha,
    extraction:{document_type:"appeal",facts:[{id:"F1",page:1,locator:"paragraph 2",status:"source_indication",text:"Жалителот тврди уплата од 12.000 денари."}]}
  });
  const source=await createCaseResponseSnapshot({
    caseId,analysisSha256:await caseResponseHash("Синтетичка анализа"),
    documents:[caseResponseDocument({id:docId,caseId,sha256:documentSha},JSON.parse(packet),await caseResponseHash(packet))],
    legalContext:[{
      source:"Синтетички тестен извор",text:"Тестен извор за проверка.",locator:"Член 1",
      provenance:{
        kind:"legal_article",sourceIdentity:"Синтетички тестен извор",authorityClass:"primary_official",
        locator:"Член 1",releaseRole:"legal_authority",legalAuthority:true,humanReviewStatus:"approved",
        versionHumanReviewStatus:"approved",instrumentKey:"mk:synthetic",articleNumber:"1",
        versionLabel:"test-only",sourceIssueNumber:"1/2026",sourceIssueDate:"2026-01-01",
        sourceUrl:"https://example.invalid/test-only",sourceSha256:"b".repeat(64),currentLawClaim:true
      }
    }]
  });
  raw.prepare("INSERT INTO membership_accounts(id,display_name,email,status) VALUES (?,?,?,'active')")
    .run(accountId,"Синтетички адвокат","p02@example.invalid");
  raw.prepare(`INSERT INTO membership_entitlements(id,account_id,plan_code,status,billing_cycle,monthly_quota)
    VALUES (?,?, 'pro','active','monthly',100)`).run("p02-test-plan",accountId);
  raw.prepare("INSERT INTO membership_access_keys(id,account_id,key_hash,key_prefix,status) VALUES (?,?,?,?,'active')")
    .run("p02-test-key",accountId,await caseResponseHash(authKey),"p02");
  for(const id of [caseId,otherCaseId]){
    raw.prepare("INSERT INTO case_workspaces (id,owner_account_id,title) VALUES (?,?,?)")
      .run(id,accountId,"Синтетички приемен предмет");
    raw.prepare("INSERT INTO case_workspace_access (case_id,account_id,role,status) VALUES (?,?,'lawyer','active')")
      .run(id,accountId);
  }
  raw.prepare(`INSERT INTO case_document_slots
      (id,case_id,slot_number,original_name,mime_type,sha256,page_count,storage_state,extraction_state)
      VALUES (?,?,1,'Жалба.pdf','application/pdf',?,1,'uploaded','complete')`).run(docId,caseId,documentSha);
  const draft="ОДГОВОР НА ЖАЛБА\n\nСинтетички почетен одговор на жалба.";
  const audit={
    draftSha256:await caseResponseHash(draft),analysisSha256:await caseResponseHash("Синтетичка анализа"),
    responseSourcesSha256:source.sha256
  };
  raw.prepare(`INSERT INTO case_audit_events(id,case_id,actor_account_id,event_type,object_type,object_id,metadata_json)
      VALUES ('audit-p02',?,?,'analysis_requested','case_draft',?,?)`).run(caseId,accountId,draftId,JSON.stringify(audit));
  const objects=new Map();
  const conditions=[];
  const bucket={
    async get(key){
      if(!objects.has(key)) return null;
      const value=objects.get(key);
      const bytes=new TextEncoder().encode(value);
      return {size:bytes.byteLength,text:async()=>value,arrayBuffer:async()=>bytes.buffer};
    },
    async put(key,bytes,options){
      conditions.push(options?.onlyIf?.get("if-none-match"));
      if(options?.onlyIf?.get("if-none-match")==="*" && objects.has(key)) return null;
      objects.set(key,new TextDecoder().decode(bytes));
      return { key };
    },
    async delete(key){objects.delete(key);},
    async list({prefix,cursor}){
      const keys=[...objects.keys()].filter(key=>key.startsWith(prefix)).sort();
      const start=cursor?Number(cursor):0;
      const next=start+7;
      return {objects:keys.slice(start,next).map(key=>({key})),truncated:next<keys.length,cursor:String(next)};
    }
  };
  function seedObject(key,text){
    if(r2) objects.set(key,text);
    else raw.prepare(`INSERT INTO case_private_object_chunks (object_key,chunk_index,chunk_b64,byte_length)
         VALUES (?,0,?,?) ON CONFLICT(object_key,chunk_index) DO UPDATE
         SET chunk_b64=excluded.chunk_b64,byte_length=excluded.byte_length`)
      .run(key,Buffer.from(text).toString("base64"),Buffer.byteLength(text));
  }
  const prefix=`case-derived/v1/${caseId}/`;
  seedObject(prefix+"drafts/"+draftId+".md",draft);
  seedObject(prefix+"drafts/"+draftId+".sources.json",source.bytes);
  seedObject(prefix+docId+"/extraction.json",packet);
  const env={DB:d1,CASE_WORKSPACE_ENABLED:"true",
    ...(r2?{CASE_FILES:bucket}:{CASE_D1_FALLBACK_ENABLED:"true"})};
  const input=(base=null,text=edited)=>({base,draftId,text:text.startsWith("ОДГОВОР НА ЖАЛБА\n")?text:"ОДГОВОР НА ЖАЛБА\n\n"+text,note:"Синтетичка забелешка",requestId:crypto.randomUUID()});
  const fetchWorker=request=>worker.fetch(request,env);
  function request(path=revisionPath,body,key=authKey){
    return fetchWorker(new Request("https://worker.invalid"+path,{
      method:body?"POST":"GET",
      headers:{...(key?{"X-Membership-Key":key}:{}),...(body?{"content-type":"application/json"}:{})},
      body:body?JSON.stringify(body):undefined
    }));
  }
  return {raw,d1,env,input,request,fetchWorker,source,audit,conditions,seedObject,
    packet,extractionKey:prefix+docId+"/extraction.json"};
}
