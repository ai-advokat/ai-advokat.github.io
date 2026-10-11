import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inventoryBackup } from "../scripts/paragraf-hetzner-backup-inventory.mjs";

test("PHBI1 inventories legal/db/export files and quarantines secrets",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"phbi-"));
  fs.mkdirSync(path.join(dir,"uploads"));
  fs.writeFileSync(path.join(dir,"dump.sql"),"CREATE TABLE cases(id int);");
  fs.writeFileSync(path.join(dir,"uploads","presuda.pdf"),"fake-pdf");
  fs.writeFileSync(path.join(dir,"cases.json"),"[]");
  fs.writeFileSync(path.join(dir,".env"),"DB_PASSWORD=secret");
  const out=inventoryBackup(dir);
  const by=Object.fromEntries(out.files.map(x=>[x.relative_path,x]));
  assert.equal(by["dump.sql"].classification,"database_dump");
  assert.equal(by["uploads/presuda.pdf"].classification,"legal_document");
  assert.equal(by["cases.json"].classification,"structured_export");
  assert.equal(by[".env"].classification,"credential_or_secret");
  assert.equal(by[".env"].ingestion_action,"quarantine");
  assert.equal(out.contains_quarantined_material,true);
  assert.match(out.tree_sha256,/^[a-f0-9]{64}$/);
});

test("PHBI2 does not follow symlinks",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"phbi-"));
  fs.writeFileSync(path.join(dir,"a.txt"),"x");
  try{fs.symlinkSync(path.join(dir,"a.txt"),path.join(dir,"link.txt"));}catch{return;}
  const out=inventoryBackup(dir);
  assert.equal(out.symlink_count,1);
  assert.ok(out.files.some(x=>x.relative_path==="link.txt"&&x.type==="symlink"));
});
