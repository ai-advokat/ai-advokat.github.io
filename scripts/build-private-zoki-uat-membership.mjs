import { createHash, randomBytes } from "node:crypto";

const gate=String(process.env.UAT_HUMAN_GATE||"");
if(gate!=="APPROVE_PRIVATE_ZOKI_STAGING_UAT"){
  console.error("UAT ACTIVATION CAPSULE FAIL: missing exact Human Gate");
  process.exit(2);
}

const accountId="UAT-ZOKI-"+new Date().toISOString().slice(0,10).replaceAll("-","");
const entitlementId="UAT-ENT-"+randomBytes(8).toString("hex");
const keyId="UAT-KEY-"+randomBytes(8).toString("hex");
const privateKey="AIADV-UAT-"+randomBytes(32).toString("base64url");
const keyHash=createHash("sha256").update(privateKey,"utf8").digest("hex");
const keyPrefix=privateKey.slice(0,12);
const starts=new Date();
const expires=new Date(starts.getTime()+4*60*60*1000);
const esc=s=>String(s).replaceAll("'","''");

const sql=[
  "BEGIN TRANSACTION;",
  `INSERT INTO membership_accounts (id,display_name,email,organization_name,status) VALUES ('${esc(accountId)}','Private Zoki UAT',NULL,'AI ADVOKAT 4 staging UAT','active');`,
  `INSERT INTO membership_entitlements (id,account_id,plan_code,status,billing_cycle,monthly_quota,seat_limit,price_mkd,starts_at,expires_at) VALUES ('${esc(entitlementId)}','${esc(accountId)}','office','active','manual',40,1,0,'${starts.toISOString()}','${expires.toISOString()}');`,
  `INSERT INTO membership_access_keys (id,account_id,key_hash,key_prefix,label,status,expires_at) VALUES ('${esc(keyId)}','${esc(accountId)}','${keyHash}','${esc(keyPrefix)}','Private Zoki UAT temporary key','active','${expires.toISOString()}');`,
  "COMMIT;"
].join("\n");

const cleanup=[
  "BEGIN TRANSACTION;",
  `DELETE FROM membership_usage_monthly WHERE subject_key='account:${esc(accountId)}';`,
  `DELETE FROM membership_access_keys WHERE account_id='${esc(accountId)}';`,
  `DELETE FROM membership_entitlements WHERE account_id='${esc(accountId)}';`,
  `DELETE FROM membership_accounts WHERE id='${esc(accountId)}';`,
  "COMMIT;"
].join("\n");

console.log(JSON.stringify({
  status:"READY_FOR_STAGING_OPERATOR",
  accountId,
  entitlementId,
  keyId,
  keyPrefix,
  privateMembershipKey:privateKey,
  expiresAt:expires.toISOString(),
  quota:40,
  provisioningSql:sql,
  cleanupSql:cleanup,
  warning:"Handle privateMembershipKey only in the operator session. Never commit, paste into issues, logs or chat."
},null,2));
