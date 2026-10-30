import fs from "node:fs";

const file="uat/private-zoki-uat-scenarios.json";
const doc=JSON.parse(fs.readFileSync(file,"utf8"));
const fail=(m)=>{console.error("PRIVATE ZOKI UAT PACK FAIL:",m);process.exit(1);};

if(doc.schema!=="ai-advokat-private-zoki-uat/v2") fail("unexpected schema");
if(doc.product!=="AI ADVOKAT 4") fail("unexpected product");
if(doc.mode!=="PRIVATE PROFESSIONAL UAT") fail("unexpected mode");
if(doc.cycles_required!==2) fail("exactly two cycles are required");
if(doc.endpoint!=="/api/bot") fail("UAT endpoint must be /api/bot");
if(doc.default_method!=="POST") fail("UAT method must be POST");
if(doc.production_authorization!==false) fail("production authorization must remain false");
if(!Array.isArray(doc.scenarios)||doc.scenarios.length!==10) fail("exactly 10 scenarios are required");

const allowedAuth=new Set(["membership","none"]);
const allowedOps=new Set(["eq","nonempty_string"]);
const allowedPaths=new Set([
  "ok","provider","answer","error",
  "legalGovernance.humanReviewRequired",
  "legalGovernance.executionAuthorization",
  "languageQualityState",
  "languageReleaseGate.verdict",
  "privacy.providerCalled"
]);

const ids=new Set();
for(const s of doc.scenarios){
  if(!/^\d{2}_[a-z0-9_]+$/.test(s.id||"")) fail("invalid scenario id");
  if(ids.has(s.id)) fail("duplicate scenario id: "+s.id);
  ids.add(s.id);
  if(!allowedAuth.has(s.auth)) fail("invalid auth mode: "+s.id);
  if(!Number.isInteger(s.expect_status)||s.expect_status<100||s.expect_status>599) fail("invalid expected status: "+s.id);
  if(!s.request || typeof s.request!=="object" || Array.isArray(s.request)) fail("missing request object: "+s.id);
  if(typeof s.request.q!=="string" || s.request.q.trim().length<2) fail("missing prompt: "+s.id);
  if(!Array.isArray(s.assertions)||s.assertions.length===0) fail("missing assertions: "+s.id);
  for(const a of s.assertions){
    if(!a || typeof a!=="object" || Array.isArray(a)) fail("invalid assertion object: "+s.id);
    if(!allowedPaths.has(a.path)) fail("unsupported assertion path "+a.path+" in "+s.id);
    if(!allowedOps.has(a.op)) fail("unsupported assertion operator "+a.op+" in "+s.id);
    if(a.op==="eq" && !Object.prototype.hasOwnProperty.call(a,"value")) fail("eq assertion missing value: "+s.id);
    if(a.op==="nonempty_string" && Object.prototype.hasOwnProperty.call(a,"value")) fail("nonempty_string must not carry value: "+s.id);
  }
}

const scenario=id=>doc.scenarios.find(s=>s.id===id);
if(scenario("09_confidential_case")?.auth!=="membership") fail("confidential scenario must be authenticated");
if(scenario("10_anonymous_fail_closed")?.auth!=="none") fail("anonymous scenario must omit membership auth");

const requiredContracts=[
  ["05_formal_draft","languageReleaseGate.verdict","eq","RELEASE"],
  ["06_macedonian_language","languageQualityState","eq","verified_runtime"],
  ["06_macedonian_language","languageReleaseGate.verdict","eq","RELEASE"],
  ["08_human_gate","legalGovernance.humanReviewRequired","eq",true],
  ["08_human_gate","legalGovernance.executionAuthorization","eq","NO_EXTERNAL_ACTION"],
  ["09_confidential_case","privacy.providerCalled","eq",false],
  ["10_anonymous_fail_closed","error","eq","bot_membership_required"]
];
for(const [id,path,op,value] of requiredContracts){
  const s=scenario(id);
  if(!s) fail("required scenario missing: "+id);
  const ok=s.assertions.some(a=>a.path===path && a.op===op && (op!=="eq" || a.value===value));
  if(!ok) fail("required response contract missing: "+id+" -> "+path);
}

const text=fs.readFileSync(file,"utf8");
for(const forbidden of ["OPENAI_API_KEY","CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID","secrets.","wrangler deploy","--remote"]){
  if(text.includes(forbidden)) fail("forbidden remote/secret capability in UAT manifest: "+forbidden);
}

console.log("PRIVATE ZOKI UAT PREPARATION PACK: PASS");
