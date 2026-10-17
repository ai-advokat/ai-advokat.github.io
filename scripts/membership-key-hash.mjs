import { createHmac } from "node:crypto";

const key=process.argv[2];
const pepper=String(process.env.MEMBERSHIP_KEY_PEPPER||"");

if(!key || key.length<24){
  console.error("Usage: MEMBERSHIP_KEY_PEPPER=... node scripts/membership-key-hash.mjs <membership-key>");
  console.error("Use a high-entropy private key of at least 24 characters.");
  process.exit(1);
}
if(pepper.length<32){
  console.error("MEMBERSHIP_KEY_PEPPER must be configured with at least 32 characters.");
  process.exit(1);
}

const digest=createHmac("sha256",pepper)
  .update("ai-advokat/membership-key/v2/"+key,"utf8")
  .digest("hex");
const fingerprint="hmac2:"+digest.slice(0,12);

console.log(JSON.stringify({
  keyFingerprint:fingerprint,
  hmacSha256:digest,
  hashScheme:"hmac_sha256_v2",
  warning:"Store only the HMAC digest/fingerprint in D1. Never commit/log the private key or pepper."
},null,2));
