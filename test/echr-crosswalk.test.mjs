import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("echr-crosswalk.html","utf8");
const gold=fs.readFileSync("gold-set-review-gate.html","utf8");

test("F0-FAST-27 preserves the three source crosswalk records and canonical provenance",()=>{
  assert.match(page,/F0-FAST-27/);
  assert.equal((page.match(/class="record"/g)||[]).length,3);
  for(const id of ["B16","B20","B25"]) assert.match(page,new RegExp('data-id="'+id+'"'));
  assert.match(page,/3169baf559f9f372b1f7de543c19ee63fddfd83d900138a18c5198f4d3ad5aba/);
  assert.match(page,/LEGAL VERIFIED 0\/30/);
  assert.match(page,/PRODUCTION NO-GO/);
  assert.match(page,/3\/3 HOLD/);
});

test("Crosswalk retains the supplied HUDOC mappings without promoting them to reviewed authority",()=>{
  for(const hudoc of ["001-250744","001-157279","001-114781"]) assert.match(page,new RegExp(hudoc));
  for(const name of ["Taleski and Others","Andonoski","Naumoski"]) assert.match(page,new RegExp(name));
  assert.match(page,/истражувачки crosswalk и AI-преднацрт/);
  assert.match(page,/не е reviewed authority/);
  assert.match(page,/Human Gate required/);
});

test("Every crosswalk record stays HOLD and deep-links to the matching Gold record",()=>{
  assert.equal((page.match(/class="state">HOLD/g)||[]).length,3);
  for(const id of ["B16","B20","B25"]){
    assert.match(page,new RegExp('gold-set-review-gate\\.html\\?record='+id+'&from=echr-crosswalk'));
  }
  assert.match(gold,/new URLSearchParams\(location\.search\)\.get\('record'\)/);
  assert.match(gold,/endsWith\('-'\+requested\)/);
});

test("Crosswalk is offline-first and does not silently retrieve or persist legal material",()=>{
  assert.doesNotMatch(page,/fetch\(/);
  assert.doesNotMatch(page,/localStorage/);
  assert.match(page,/HUDOC линковите бараат интернет/);
  assert.match(page,/noindex,nofollow/);
});

test("Crosswalk search JavaScript is syntactically valid",()=>{
  const match=page.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match,"inline script missing");
  assert.doesNotThrow(()=>new Function(match[1]));
});
