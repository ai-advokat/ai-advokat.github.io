// AI Advokat · ZOKI RC84 review intake (local-only, non-authoritative).
// The submitted JSON stays in this browser tab. No server, AI or D1 calls.
export const RC84_ARCHIVE_SHA256="a449afe67c9eb1d6493d06f23998068a2849a0a1f3b7d27b744784771037dbcc";
export const RC84_MODEL_COUNTS=Object.freeze({nda:2,cooperation:7,services:6,lease:6,loan:3,debt:4});
const MODELS=Object.freeze(Object.keys(RC84_MODEL_COUNTS));
const SHA256=/^[a-f0-9]{64}$/;
const ID=/^(nda:N\d{2}|cooperation:C\d{2}|services:S\d{2}|lease:L\d{2}|loan:L\d{2}|debt:D\d{2})$/;
const FORBIDDEN=/^(draft_clause|clause_text|contract_text|full_text|replacement_text|source_text|original_document|client_document|attachment|private_key|api_key)$/i;
const err=code=>{throw new Error(code);};
function label(value,max=600){
  if(typeof value!=="string" || value.trim().length<1 || value.length>max) err("invalid_review_metadata");
  return value.trim();
}
export function validateRC84Intake(raw){
  if(!raw || typeof raw!=="object" || Array.isArray(raw)) err("invalid_review_json");
  if(raw.schema!=="ai-advokat.rc84.review-intake.v1" || raw.status!=="REVIEW_ONLY_HOLD") err("wrong_rc84_schema_or_status");
  if(raw.source?.archive_sha256!==RC84_ARCHIVE_SHA256) err("unrecognized_archive_sha256");
  if(raw.source?.ownership_and_republication_permission!=="REQUIRES_OWNER_CONFIRMATION") err("source_rights_gate_missing");
  if(raw.safety?.human_gate!=="HOLD" || raw.safety?.production!=="NO_GO"
    || raw.safety?.all_legal_approvals!==0 || raw.safety?.raw_clauses_included!==false
    || raw.safety?.auto_import_clauses!==false || raw.safety?.auto_sign!==false
    || raw.safety?.auto_law_claim!==false || raw.safety?.live_provider_calls!==false) err("unsafe_approval_or_runtime_state");
  if(raw.integration_gate?.legal_clause_activation!=="BLOCKED"
    || raw.integration_gate?.per_clause_review!=="REQUIRED"
    || raw.integration_gate?.separate_publication_human_gate!=="REQUIRED") err("human_gate_contract_missing");
  if(raw.review?.count!==28 || raw.review?.severity?.CRITICAL!==8
    || raw.review?.severity?.HIGH!==20 || raw.review?.independent_lawyer_signoff!==false
    || raw.review?.source_text_independently_verified!==false
    || raw.review?.draft_sha256_crosscheck!=="28/28 PASS") err("unverified_review_counts");
  if(!Array.isArray(raw.items) || raw.items.length!==28) err("expected_28_items");
  for(const model of MODELS){
    if(raw.review?.model_counts?.[model]!==RC84_MODEL_COUNTS[model]) err("model_count_mismatch");
  }
  const ids=new Set(), counts={nda:0,cooperation:0,services:0,lease:0,loan:0,debt:0};
  let critical=0,high=0;
  const records=raw.items.map(item=>{
    if(!item || typeof item!=="object" || Array.isArray(item)) err("invalid_item");
    for(const key of Object.keys(item)) if(FORBIDDEN.test(key)) err("draft_content_not_allowed");
    if(typeof item.id!=="string" || !ID.test(item.id) || ids.has(item.id)) err("invalid_or_duplicate_id");
    ids.add(item.id);
    if(item.model!==item.id.split(":")[0] || !MODELS.includes(item.model)) err("model_identity_mismatch");
    counts[item.model]++;
    if(item.severity==="CRITICAL") critical++;else if(item.severity==="HIGH") high++;else err("unexpected_severity");
    if(item.human_gate!=="HOLD" || item.legal_approved!==false
      || item.may_integrate!==false || item.readiness!=="BLOCKED_FACTS_AND_LAW"
      || item.legal_source_status!=="NOT_INDEPENDENTLY_VERIFIED_FOR_INTEGRATION") err("item_approval_gate_failed");
    if(typeof item.draft_sha256!=="string" || !SHA256.test(item.draft_sha256)) err("invalid_clause_fingerprint");
    if(!Array.isArray(item.missing_factual_fields) || item.missing_factual_fields.length>25) err("invalid_required_facts");
    const facts=item.missing_factual_fields.map(s=>label(s,160));
    return Object.freeze({
      id:item.id,model:item.model,severity:item.severity,
      topic:label(item.topic,450),missingFacts:Object.freeze(facts),
      requiredCheck:label(item.verification_required,1600),
      status:"LEGAL HOLD · NOT APPROVED"
    });
  });
  if(critical!==8 || high!==20 || MODELS.some(model=>counts[model]!==RC84_MODEL_COUNTS[model])) err("actual_counts_mismatch");
  return Object.freeze({count:28,critical,high,records:Object.freeze(records)});
}
function startLocalViewer(){
  const file=document.getElementById("rc84File");
  const status=document.getElementById("rc84Status");
  const rows=document.getElementById("rc84Rows");
  const search=document.getElementById("rc84Search");
  const severity=document.getElementById("rc84Severity");
  if(!file||!status||!rows||!search||!severity) return;
  let data=null;
  const setStatus=(message,tone="")=>{status.textContent=message;status.dataset.tone=tone;};
  const clear=()=>{data=null;rows.replaceChildren();search.disabled=true;severity.disabled=true;search.value="";severity.value="all";};
  const add=(el,tag,text,className)=>{
    const child=document.createElement(tag);child.textContent=text;
    if(className)child.className=className;el.appendChild(child);return child;
  };
  function render(){
    rows.replaceChildren();
    if(!data)return;
    const q=search.value.trim().toLocaleLowerCase("mk");
    const sev=severity.value;
    const matching=data.records.filter(item=>(sev==="all"||item.severity===sev)
      && (!q||(item.id+" "+item.topic+" "+item.missingFacts.join(" ")).toLocaleLowerCase("mk").includes(q)));
    for(const item of matching){
      const article=document.createElement("article");article.className="review-item";
      add(article,"h3",item.id+" · "+item.severity,"review-heading");
      add(article,"p",item.topic);
      add(article,"p","Недостасувачки факти: "+(item.missingFacts.length?item.missingFacts.join("; "):"Нема наведени во архивата"),"muted");
      add(article,"p","За проверка: "+item.requiredCheck,"muted");
      add(article,"strong",item.status,"hold");
      rows.appendChild(article);
    }
    setStatus("Локално прикажани "+matching.length+" од 28 архивски HOLD записи. Ништо не е одобрено или испратено.","ok");
  }
  search.addEventListener("input",render);
  severity.addEventListener("change",render);
  file.addEventListener("change",async()=>{
    clear();
    const chosen=file.files?.[0];
    if(!chosen){setStatus("Нема избрана датотека.");return;}
    if(chosen.size<100 || chosen.size>300000 || !chosen.name.toLowerCase().endsWith(".json")){
      setStatus("Прифатен е само прегледен JSON до 300 KB.","error");return;
    }
    try{
      const raw=JSON.parse(await chosen.text());
      data=validateRC84Intake(raw);
      search.disabled=false;severity.disabled=false;render();
    }catch{
      clear();setStatus("Датотеката не ги задоволува RC84 HOLD и provenance проверките. Ништо не е увезено.","error");
    }
  });
}
if(typeof document!=="undefined")startLocalViewer();
