import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest=JSON.parse(fs.readFileSync("data/gazette-annual-registers-1991-2025.json","utf8"));
const script=fs.readFileSync("scripts/gazette_backfill_wave1.py","utf8");

test("GAR1 provenance manifest covers every year 1991-2025 exactly once",()=>{
  assert.deepEqual(manifest.scope,{from_year:1991,to_year:2025,year_count:35});
  assert.equal(manifest.years.length,35);
  assert.deepEqual(manifest.years.map(x=>x.year),Array.from({length:35},(_,i)=>1991+i));
});

test("GAR2 1991-2002 are scan-image-primary and never current-law authority",()=>{
  const old=manifest.years.filter(x=>x.year<=2002);
  assert.equal(old.length,12);
  for(const row of old){
    assert.equal(row.extraction_profile,"scan_image_primary");
    assert.equal(row.searchable_text_status,"not_established");
    assert.equal(row.current_law_authority,false);
    assert.equal(row.human_gate_required,true);
  }
});

test("GAR3 2003-2025 may enter staging parsing but still require reconciliation",()=>{
  const modern=manifest.years.filter(x=>x.year>=2003);
  assert.equal(modern.length,23);
  for(const row of modern){
    assert.equal(row.extraction_profile,"machine_text_expected");
    assert.equal(row.searchable_text_status,"candidate_pending_reconciliation");
    assert.equal(row.current_law_authority,false);
  }
});

test("GAR4 backfill script enforces manifest extraction profile",()=>{
  assert.match(script,/gazette-annual-registers-1991-2025\.json/);
  assert.match(script,/scan_image_primary/);
  assert.match(script,/profile_for_year/);
  assert.match(script,/needs_ocr_or_manual_extraction/);
});
