import fs from "node:fs";
import crypto from "node:crypto";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const staging = args.has("--staging");
const file = process.argv.find(x => x.endsWith(".jsonl"));

if (!file) throw new Error("Provide a .jsonl export file.");
if (apply && !staging) throw new Error("Fail closed: --apply requires --staging.");

const forbidden = [
  /password/i,/secret/i,/api[_-]?key/i,/access[_-]?token/i,/refresh[_-]?token/i,
  /session[_-]?id/i,/zenodo\.org\/uploads\//i
];

const lines = fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean);
let accepted=0;
for (let i=0;i<lines.length;i++) {
  const row=JSON.parse(lines[i]);
  const serialized=JSON.stringify(row);
  if (forbidden.some(rx=>rx.test(serialized))) {
    throw new Error(`Forbidden sensitive material at line ${i+1}`);
  }
  if (!row.title || !row.document_type) {
    throw new Error(`Missing title/document_type at line ${i+1}`);
  }
  if (!["public","restricted","private"].includes(row.visibility ?? "public")) {
    throw new Error(`Invalid visibility at line ${i+1}`);
  }
  row.source_sha256 ??= crypto.createHash("sha256").update(String(row.text_content ?? serialized)).digest("hex");
  accepted++;
}
console.log(JSON.stringify({ok:true,mode:apply?"staging-apply-ready":"dry-run",records:accepted},null,2));
if (apply) {
  console.log("Validated for staging. Database write is intentionally delegated to a guarded workflow.");
}
