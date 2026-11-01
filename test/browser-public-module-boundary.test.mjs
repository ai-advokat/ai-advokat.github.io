import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const PUBLIC_SHARED=new Set([
  "src/chat-privacy.js",
  "src/case-export.js",
  "src/legal-analyzer.js",
  "src/case-law-metadata-processor.js",
  "src/echr-findings.js",
  "src/document-ingest-router.js",
  "src/international-legal-classifier.js",
  "src/official-source-binder.js"
]);

const PUBLIC_CLIENT_FILES=[
  "assets/ai-advokat-chat.js",
  "assets/case-law-metadata.js",
  "assets/casepilot-export.js",
  "assets/document-router.js",
  "assets/professional-tools.js",
  "assets/standalone-bot-vnext.js",
  "assets/standalone-bot.js"
];

function browserSrcTargets(source){
  const out=new Set();
  const re=/(?:["\'])((?:\.\.\/|\/)src\/[^"\'?]+\.js)(?:\?[^"\']*)?(?:["\'])/g;
  for(const match of source.matchAll(re)){
    let p=match[1];
    if(p.startsWith("../")) p=p.slice(3);
    if(p.startsWith("/")) p=p.slice(1);
    out.add(p);
  }
  return [...out];
}

test("all browser-to-src imports are explicitly allowlisted public shared modules",()=>{
  const seen=new Set();
  for(const path of PUBLIC_CLIENT_FILES){
    const source=fs.readFileSync(path,"utf8");
    for(const target of browserSrcTargets(source)){
      seen.add(target);
      assert.ok(PUBLIC_SHARED.has(target),path+" imports non-public server module "+target);
    }
  }
  assert.ok(seen.size>=6,"expected browser shared-runtime imports to be detected");
});

test("every public shared module is deliberately re-included by .assetsignore",()=>{
  const ignore=fs.readFileSync(".assetsignore","utf8");
  assert.match(ignore,/^src\/\*\*$/m);
  for(const path of PUBLIC_SHARED){
    assert.ok(ignore.split(/\r?\n/).includes("!"+path),"missing public allowlist entry for "+path);
  }
});

test("public shared modules contain no privileged runtime dependencies",()=>{
  for(const path of PUBLIC_SHARED){
    const source=fs.readFileSync(path,"utf8");
    assert.doesNotMatch(source,/\bprocess\.env\b/,path);
    assert.doesNotMatch(source,/\benv\.[A-Z_]/,path);
    assert.doesNotMatch(source,/\bAuthorization\b/,path);
    assert.doesNotMatch(source,/\bOPENAI_/i,path);
    assert.doesNotMatch(source,/\bD1\b/,path);
    assert.doesNotMatch(source,/\bfetch\s*\(/,path);
  }
});
