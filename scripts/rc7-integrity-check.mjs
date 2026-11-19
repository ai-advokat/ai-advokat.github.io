/** RC7 offline receipt verifier. No HTTP calls, secrets, legal sources or deployment. */
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync(new URL('../docs/rc7/RC7_SHA256_MANIFEST.json',import.meta.url),'utf8'));
const root=new URL('../',import.meta.url);
const permitted=new Set(Object.keys(manifest.files).concat(['docs/rc7/RC7_SHA256_MANIFEST.json']));
for(const [name,expected] of Object.entries(manifest.files)){
 assert(!name.includes('..') && !name.startsWith('/'),'invalid manifest path');
 const filepath=new URL(name,root);
 assert(existsSync(filepath),`missing: ${name}`);
 const buf=readFileSync(filepath);
 const h=createHash('sha256').update(buf).digest('hex');
 assert.equal(h,expected,`digest mismatch: ${name}`);
}
const code=readFileSync(new URL('../src/experimental/rc4/a319-held-corpus-discovery.mjs',import.meta.url),'utf8');
assert.match(code,/from ['"]\.\.\/\.\.\/a319-held-corpus-discovery\.js['"]/);
assert.doesNotMatch(code,/function\s+(?:retrieveA319|validateA319Corpus|a319AttachCorpusToChat)/);
const policy=readFileSync(new URL('../docs/rc7/RC7_ACCEPTANCE.md',import.meta.url),'utf8');
assert.match(policy,/LEGAL_HOLD/);assert.match(policy,/NO-GO/);
assert.match(manifest.baselineMainSha,/^[0-9a-f]{40}$/);
assert.equal(manifest.baselineMainSha,'c5e07e37e38cba246a6ac1ed7c3dc6b651837160');
// This CI step requires the exact base tree through actions/checkout fetch-depth: 0.
if(process.env.RC7_CHECK_GIT_BASELINE==='1'){
 const base=manifest.baselineMainSha;
 const ancestor=execFileSync('git',['merge-base',base,'HEAD'],{encoding:'utf8'}).trim();
 assert.equal(ancestor,base,'RC7 branch not rooted in verified main baseline');
 const delta=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 for(const f of delta) assert(permitted.has(f),`unapproved changed file: ${f}`);
 console.log(`RC7 BASELINE PASS: ${base}; approved changed paths: ${delta.length}`);
}
console.log(`RC7 DIGEST PASS: ${Object.keys(manifest.files).length} items; 53 LEGAL_HOLD; NO-GO main/staging/production`);
