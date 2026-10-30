import fs from "node:fs";

const file=process.argv[2]||"evidence/private-zoki-staging-uat-evidence.json";
const doc=JSON.parse(fs.readFileSync(file,"utf8"));
const fail=m=>{console.error("PRIVATE ZOKI STAGING EVIDENCE FAIL:",m);process.exit(1);};

const EXPECTED={
  accountId:"0fee10e2bd9a2183d16eb0d73f13dfce",
  worker:"ai-advokat-staging",
  databaseName:"ai-advokat-staging-db",
  databaseId:"309f72b8-8711-47fc-bea7-fbd1d649561d"
};

if(doc.schema!=="ai-advokat-private-zoki-staging-evidence/v1") fail("unexpected schema");
if(doc.humanGate!=="APPROVE_PRIVATE_ZOKI_STAGING_UAT") fail("Human Gate mismatch");
if(doc.stagingAccountId!==EXPECTED.accountId) fail("staging account mismatch");
if(doc.workerName!==EXPECTED.worker) fail("worker mismatch");
if(doc.databaseName!==EXPECTED.databaseName) fail("database name mismatch");
if(doc.databaseId!==EXPECTED.databaseId) fail("database id mismatch");
if(doc.productionTouched!==false) fail("productionTouched must be false");
if(doc.publicExposure!==false) fail("publicExposure must be false");
if(doc.aiProvider?.secretPresent!==true) fail("staging AI provider secret not confirmed");
if(doc.aiProvider?.scope!=="dedicated_staging_only") fail("AI provider scope is not staging-only");
if(doc.privateAccess?.enabled!==true) fail("private access is not enabled");
if(doc.privateAccess?.publiclyReachable!==false) fail("staging surface must not be public");
if(doc.temporaryMembership?.accountId?.startsWith("UAT-ZOKI-")!==true) fail("temporary UAT membership account id invalid");
if(Number(doc.temporaryMembership?.monthlyQuota||0)<20) fail("temporary UAT quota below 20");
if(doc.temporaryMembership?.persistentZokiEntitlementUsed!==false) fail("persistent Zoki entitlement must not be used");

const startsAt=Date.parse(doc.temporaryMembership?.startsAt||"");
const expiresAt=Date.parse(doc.temporaryMembership?.expiresAt||"");
if(!Number.isFinite(startsAt)) fail("temporary membership startsAt must be valid ISO date");
if(!Number.isFinite(expiresAt)) fail("temporary membership expiresAt must be valid ISO date");
if(expiresAt<=startsAt) fail("temporary membership expiry must be after start");
if(expiresAt-startsAt>4*60*60*1000) fail("temporary membership lifetime exceeds four hours");

if(doc.cleanupPlan?.prepared!==true) fail("cleanup plan missing");
if(doc.cleanupPlan?.temporaryMembershipDeleteSqlPrepared!==true) fail("temporary membership cleanup SQL not prepared");

console.log("PRIVATE ZOKI STAGING ACTIVATION EVIDENCE: PASS");
