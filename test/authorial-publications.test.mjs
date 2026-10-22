import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  flattenAuthorialPublicationRegistry,
  findAuthorialPublicationRecords,
  authorialPublicationContextItems,
  authorialPublicationSearchItems
} from "../src/authorial-publications.js";
import { enforceCanonicalContextProvenance } from "../src/canonical-provenance-gate.js";

const registry=JSON.parse(fs.readFileSync("data/zoran-stojankic-publications.json","utf8"));

test("authorial registry exposes exactly six published-open Zoran works",()=>{
  const records=flattenAuthorialPublicationRegistry(registry);
  const published=records.filter(x=>x.status==="published_open");
  assert.equal(published.length,6);
  for(const item of published){
    assert.ok(item.doi,item.id);
    assert.ok(item.landingUrl,item.id);
  }
});

test("Laskarci query retrieves the published Laskarci working paper",()=>{
  const records=findAuthorialPublicationRecords(registry,"кажете ми нешто за сообраќајната несреќа кај Ласкарци",{limit:5});
  assert.ok(records.length>0);
  assert.equal(records[0].id,"laskarci-2026");
  assert.equal(records[0].doi,"10.5281/zenodo.23467865");
});

test("digital earnings query retrieves today's Version 3.0 preprint",()=>{
  const records=findAuthorialPublicationRecords(registry,"данок на дигиталната заработка и двојно оданочување",{limit:5});
  assert.ok(records.length>0);
  assert.equal(records[0].id,"digital-earnings-2026");
  assert.equal(records[0].version,"3.0");
  assert.equal(records[0].doi,"10.5281/zenodo.23557648");
});

test("published authorial works pass canonical provenance only as secondary non-authority",()=>{
  const records=findAuthorialPublicationRecords(registry,"Ласкарци",{limit:2});
  const gate=enforceCanonicalContextProvenance(authorialPublicationContextItems(records));
  assert.equal(gate.blocked.length,0,JSON.stringify(gate.blocked));
  assert.ok(gate.context.length>0);
  for(const item of gate.context){
    assert.equal(item.provenance.kind,"authorial_publication");
    assert.equal(item.provenance.legalAuthority,false);
    assert.equal(item.provenance.currentLawClaim,false);
    assert.equal(item.provenance.releaseRole,"secondary_only");
  }
});

test("restricted professional manual remains metadata-only and marked restricted",()=>{
  const hits=authorialPublicationSearchItems(registry,"Прирачник за адвокати во кривични предмети",{limit:5});
  const manual=hits.find(x=>x.id==="authorial:criminal-procedure-manual-2026");
  assert.ok(manual);
  assert.equal(manual.access,"restricted");
  assert.equal(manual.legalAuthority,false);
});

test("draft Kocani record is never represented as a verified published work",()=>{
  const hits=authorialPublicationSearchItems(registry,"Кочани Пулс",{limit:5});
  const draft=hits.find(x=>x.id==="authorial:kocani-puls-2026");
  if(draft){
    assert.equal(draft.status,"pending");
    assert.notEqual(draft.rawStatus,"published_open");
  }
});
