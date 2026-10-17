#!/usr/bin/env node
import fs from "node:fs";
import { createHmac } from "node:crypto";

const outPath=process.argv[2];
const key=String(process.env.OWNER_PROFESSIONAL_ACCESS_KEY||"");
const pepper=String(process.env.MEMBERSHIP_KEY_PEPPER||"");
const quota=Number(process.env.OWNER_PROFESSIONAL_MONTHLY_QUOTA||200);
const validityDays=Number(process.env.OWNER_PROFESSIONAL_VALIDITY_DAYS||180);

function fail(message){console.error(message);process.exit(1);}
if(!outPath) fail("Usage: node scripts/provision-owner-professional-access.mjs <output-sql-path>");
if(key.length<40) fail("OWNER_PROFESSIONAL_ACCESS_KEY must contain at least 40 characters.");
if(pepper.length<32) fail("MEMBERSHIP_KEY_PEPPER must contain at least 32 characters.");
if(!Number.isInteger(quota)||quota<10||quota>1000) fail("OWNER_PROFESSIONAL_MONTHLY_QUOTA must be 10..1000.");
if(!Number.isInteger(validityDays)||validityDays<30||validityDays>365) fail("OWNER_PROFESSIONAL_VALIDITY_DAYS must be 30..365.");

const digest=createHmac("sha256",pepper)
  .update("ai-advokat/membership-key/v2/"+key,"utf8")
  .digest("hex");
const fingerprint="hmac2:"+digest.slice(0,12);
const now=new Date();
const expires=new Date(now.getTime()+validityDays*86400000).toISOString();
const keyId="key-owner-professional-"+now.toISOString().slice(0,10).replaceAll("-","")+"-"+digest.slice(0,8);

function q(value){return "'"+String(value).replaceAll("'","''")+"'";}

const sql=`BEGIN TRANSACTION;

INSERT INTO membership_accounts (id,display_name,email,organization_name,status)
VALUES ('owner-professional','AI Advokat Owner',NULL,'AI Advokat','active')
ON CONFLICT(id) DO UPDATE SET
  display_name=excluded.display_name,
  organization_name=excluded.organization_name,
  status='active',
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO membership_entitlements
  (id,account_id,plan_code,status,billing_cycle,monthly_quota,seat_limit,price_mkd,starts_at,expires_at,updated_at)
VALUES
  ('ent-owner-professional','owner-professional','office','active','manual',${quota},3,0,CURRENT_TIMESTAMP,NULL,CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  plan_code='office',
  status='active',
  billing_cycle='manual',
  monthly_quota=${quota},
  seat_limit=3,
  price_mkd=0,
  expires_at=NULL,
  updated_at=CURRENT_TIMESTAMP;

UPDATE membership_access_keys
   SET status='revoked',
       expires_at=COALESCE(expires_at,CURRENT_TIMESTAMP),
       rotated_at=CURRENT_TIMESTAMP
 WHERE account_id='owner-professional'
   AND status='active';

INSERT INTO membership_access_keys
  (id,account_id,key_hash,key_prefix,label,status,expires_at,key_hash_scheme,key_fingerprint,rotated_at)
VALUES
  (${q(keyId)},'owner-professional',${q(digest)},${q(fingerprint)},'Owner professional access v2','active',${q(expires)},'hmac_sha256_v2',${q(fingerprint)},CURRENT_TIMESTAMP);

COMMIT;
`;

fs.writeFileSync(outPath,sql,{encoding:"utf8",mode:0o600});
console.log(JSON.stringify({
  ok:true,
  output:outPath,
  keyId,
  keyFingerprint:fingerprint,
  hashScheme:"hmac_sha256_v2",
  monthlyQuota:quota,
  expiresAt:expires,
  plaintextKeyLogged:false,
  pepperLogged:false
}));
