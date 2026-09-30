import { createHash } from "node:crypto";

const key = process.argv[2];
if (!key || key.length < 24) {
  console.error("Usage: node scripts/membership-key-hash.mjs <membership-key>");
  console.error("Use a high-entropy private key of at least 24 characters.");
  process.exit(1);
}

const hash = createHash("sha256").update(key, "utf8").digest("hex");
const prefix = key.slice(0, Math.min(12, key.length));

console.log(JSON.stringify({
  keyPrefix: prefix,
  sha256: hash,
  warning: "Store only the hash in D1. Do not commit or log the private membership key."
}, null, 2));
