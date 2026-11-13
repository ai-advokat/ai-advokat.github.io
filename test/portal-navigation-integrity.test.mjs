import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root=process.cwd();
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");

function cleanLocalRef(value){
  const raw=String(value||"").trim();
  if(!raw.startsWith("/") || raw.startsWith("//")) return null;
  const pathname=raw.split(/[?#]/,1)[0];
  if(pathname==="/") return null;
  return decodeURIComponent(pathname.replace(/^\//,""));
}

function targetExists(ref){
  if(!ref) return true;
  const direct=path.join(root,ref);
  return fs.existsSync(direct)
    || fs.existsSync(path.join(direct,"index.html"))
    || (ref.endsWith("/") && fs.existsSync(path.join(root,ref,"index.html")));
}

test("every internal home-page href resolves to a repository target",()=>{
  const refs=[...html.matchAll(/href=["']([^"'#]+)["']/g)]
    .map(m=>cleanLocalRef(m[1]))
    .filter(Boolean);
  const missing=[...new Set(refs)].filter(ref=>!targetExists(ref));
  assert.deepEqual(missing,[],`Broken internal href targets: ${missing.join(", ")}`);
  assert.ok(new Set(refs).size>=35,"expected substantial portal navigation coverage");
});

test("every local script and stylesheet/icon asset referenced by home exists",()=>{
  const refs=[
    ...[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map(m=>m[1]),
    ...[...html.matchAll(/<link[^>]+href=["']([^"']+)["']/g)].map(m=>m[1])
  ].map(cleanLocalRef).filter(Boolean);
  const missing=[...new Set(refs)].filter(ref=>!targetExists(ref));
  assert.deepEqual(missing,[],`Missing local assets: ${missing.join(", ")}`);
});

test("core user journeys remain linked from the public portal",()=>{
  for(const required of [
    "/ai-contract.html",
    "/casepilot-workspace.html",
    "/hybrid-legal-intelligence.html",
    "/professional-tools.html",
    "/legal-ai-suite.html",
    "/judicial-practice.html"
  ]){
    assert.ok(html.includes(required),`Missing core portal route ${required}`);
  }
});
