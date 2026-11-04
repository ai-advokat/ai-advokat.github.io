import test from "node:test";
import assert from "node:assert/strict";
import { JUDICIAL_DISCOVERY_CORPUS_VERSION, judicialDiscoveryContext, judicialDiscoverySources } from "../src/judicial-discovery-source-registry.js";

test("judicial discovery registry exposes national court layers without legal-authority promotion",()=>{
  const all=judicialDiscoverySources();
  assert.ok(all.length>=7);
  for(const id of [
    "mk-supreme-master-archive",
    "mk-constitutional-collections-2003-2017",
    "mk-appellate-skopje-bulletins",
    "mk-appellate-bitola-publications",
    "mk-appellate-gostivar-bulletin-2014",
    "mk-appellate-stip-bulletin-1997"
  ]) assert.ok(all.some(x=>x.id===id),id);
});

test("Supreme Court query returns discovery-only governed context",()=>{
  const out=judicialDiscoveryContext("начелни правни мислења Врховен суд",{limit:4});
  assert.equal(out.version,JUDICIAL_DISCOVERY_CORPUS_VERSION);
  assert.equal(out.state,"discovery_match");
  assert.ok(out.context.length>0);
  const p=out.context[0].provenance;
  assert.equal(p.kind,"official_source_record");
  assert.equal(p.releaseRole,"source_registry");
  assert.equal(p.legalAuthority,false);
  assert.equal(p.currentLawClaim,false);
  assert.match(out.context[0].text,/Do not state a holding/);
});

test("appellate query preserves court-level distinction",()=>{
  const out=judicialDiscoveryContext("Апелационен суд Гостивар 2014");
  assert.ok(out.sources.some(x=>x.id==="mk-appellate-gostivar-bulletin-2014"));
  assert.ok(out.context.every(x=>x.provenance.legalAuthority===false));
});
