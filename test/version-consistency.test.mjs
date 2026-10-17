import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const versionSource=fs.readFileSync("src/version.js","utf8");
const packageJson=JSON.parse(fs.readFileSync("package.json","utf8"));
const readme=fs.readFileSync("README.md","utf8");
const worker=fs.readFileSync("src/index.js","utf8");

const match=versionSource.match(/AI_ADVOCAT_VERSION\s*=\s*"([^"]+)"/);
if(!match) throw new Error("AI_ADVOCAT_VERSION missing");
const version=match[1];

test("product version is consistent across runtime metadata and documentation",()=>{
  assert.equal(packageJson.version,version);
  assert.match(readme,new RegExp("v"+version.replaceAll(".","\\.")));
  assert.ok(
    worker.includes('const VERSION = "'+version+'";') ||
    (worker.includes('from "./version.js"') && worker.includes("const VERSION = AI_ADVOCAT_VERSION")),
    "Worker VERSION must match or import the canonical version"
  );
});

test("package is explicit ESM to avoid MODULE_TYPELESS warnings",()=>{
  assert.equal(packageJson.type,"module");
});
