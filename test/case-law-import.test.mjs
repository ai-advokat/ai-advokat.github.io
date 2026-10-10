import test from "node:test";
import assert from "node:assert/strict";
import { generateCaseLawImportSql } from "../scripts/case-law-ndjson-to-sql.mjs";

function manifest(overrides={}){
  return {
    type:"case_law_manifest",
    run_id:"test-run-2026-10-10",
    source_class:"official_public",
    source_provider:"Official court",
    authorized_export:false,
    license_or_access_basis:"public_official",
    ...overrides
  };
}
function caseRow(overrides={}){
  return {
    type:"case_law_case",
    case_key:"mk:test:1",
    case_title:"Синтетичка пресуда",
    court:"Врховен суд",
    case_number:"TEST-1/2026",
    jurisdiction:"MK",
    legal_area:"кривична постапка",
    decision_date:"2026-10-10",
    outcome_summary:"Синтетички исход.",
    reasoning_summary:"Синтетичко образложение.",
    source_url:"https://www.vrhoven.sud.mk/test",
    source_sha256:"a".repeat(64),
    finality_status:"final",
    authority:{
      court_level:"supreme",
      decision_type:"decision",
      precedential_weight:"strong_persuasive",
      outcome_side:"neutral",
      legal_issue_keys:"притвор жалба"
    },
    holdings:[
      {holding_type:"principle",proposition:"Синтетички правен принцип.",source_locator:"§ 1"}
    ],
    ...overrides
  };
}
function ndjson(rows){return rows.map(x=>JSON.stringify(x)).join("\n")+"\n";}

test("CLI1 official-public import remains staged pending Human Gate",()=>{
  const out=generateCaseLawImportSql(ndjson([manifest(),caseRow()]));
  assert.equal(out.caseCount,1);
  assert.equal(out.holdingCount,1);
  assert.equal(out.sourceClass,"official_public");
  assert.match(out.sql,/'official'/);
  assert.match(out.sql,/case_law_import test-run-2026-10-10/);
  assert.match(out.sql,/human_review_status\) VALUES/);
  assert.match(out.sql,/'pending'/);
  assert.match(out.sql,/INSERT OR IGNORE INTO case_law_authority/);
  assert.match(out.sql,/INSERT INTO case_law_holdings/);
  assert.doesNotMatch(out.sql,/'reviewed'|'approved'/);
});

test("CLI2 licensed Paragraf export needs explicit lawful export basis and stays secondary pending",()=>{
  const m=manifest({
    source_class:"licensed_secondary_export",
    source_provider:"Paragraf.mk",
    authorized_export:true,
    license_or_access_basis:"Export lawfully supplied by licensed user for AI Advokat ingestion"
  });
  const row=caseRow({
    source_url:"https://paragraf.mk/export/case-1",
    source_sha256:"b".repeat(64)
  });
  const out=generateCaseLawImportSql(ndjson([m,row]));
  assert.equal(out.sourceClass,"licensed_secondary_export");
  assert.match(out.sql,/licensed_case_law_export/);
  assert.match(out.sql,/'verified'/);
  assert.match(out.sql,/'pending'/);
  assert.doesNotMatch(out.sql,/'official'.*licensed_case_law_export/);
});

test("CLI3 licensed secondary import fails closed without authorization or license basis",()=>{
  const row=caseRow({source_url:"https://paragraf.mk/export/case-2"});
  assert.throws(
    ()=>generateCaseLawImportSql(ndjson([
      manifest({source_class:"licensed_secondary_export",source_provider:"Paragraf.mk",authorized_export:false,license_or_access_basis:"licensed"}),
      row
    ])),
    /authorized_export=true/
  );
  assert.throws(
    ()=>generateCaseLawImportSql(ndjson([
      manifest({source_class:"licensed_secondary_export",source_provider:"Paragraf.mk",authorized_export:true,license_or_access_basis:""}),
      row
    ])),
    /license_or_access_basis/
  );
});

test("CLI4 credentials, cookies, sessions and tokens are rejected anywhere in the import",()=>{
  for(const [key,value] of [
    ["password","secret"],
    ["cookie","session=abc"],
    ["access_token","abc"],
    ["authorization","Bearer abc"],
    ["session_id","abc"],
    ["api_key","abc"]
  ]){
    const bad=caseRow();
    bad.import_meta={[key]:value};
    assert.throws(
      ()=>generateCaseLawImportSql(ndjson([manifest(),bad])),
      /Credential\/session field is forbidden/,
      key
    );
  }
});

test("CLI5 source class and host must agree; no subscriber URL may masquerade as official",()=>{
  assert.throws(
    ()=>generateCaseLawImportSql(ndjson([
      manifest({source_class:"official_public"}),
      caseRow({source_url:"https://paragraf.mk/private/case"})
    ])),
    /outside the approved official host set/
  );
  assert.throws(
    ()=>generateCaseLawImportSql(ndjson([
      manifest({source_class:"licensed_secondary_export",source_provider:"Paragraf.mk",authorized_export:true,license_or_access_basis:"licensed"}),
      caseRow({source_url:"https://example.com/case"})
    ])),
    /outside the approved licensed host set/
  );
});

test("CLI6 non-HTTPS and invalid source fingerprint fail closed",()=>{
  assert.throws(
    ()=>generateCaseLawImportSql(ndjson([manifest(),caseRow({source_url:"http://www.vrhoven.sud.mk/test"})])),
    /must use https/
  );
  assert.throws(
    ()=>generateCaseLawImportSql(ndjson([manifest(),caseRow({source_sha256:"bad"})])),
    /Invalid source_sha256/
  );
});

test("CLI7 generated SQL is rerun-resistant and never REPLACE-promotes case authority",()=>{
  const out=generateCaseLawImportSql(ndjson([manifest(),caseRow()]));
  assert.match(out.sql,/WHERE NOT EXISTS \(SELECT 1 FROM case_law WHERE/);
  assert.match(out.sql,/INSERT OR IGNORE INTO case_law_authority/);
  assert.doesNotMatch(out.sql,/INSERT OR REPLACE INTO case_law/);
  assert.doesNotMatch(out.sql,/UPDATE case_law SET human_review_status='reviewed'/);
  assert.doesNotMatch(out.sql,/UPDATE case_law_authority SET human_review_status='reviewed'/);
});


test("CLI8 external identifiers and source provenance are preserved without auto-review",()=>{
  const row=caseRow({
    source_url:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62026CJ0001",
    jurisdiction:"EU",
    source_product:"EUR-Lex",
    source_record_id:"62026CJ0001",
    external_ids:{ecli:"ECLI:EU:C:2026:1",celex:"62026CJ0001"}
  });
  const out=generateCaseLawImportSql(ndjson([
    manifest({source_provider:"EUR-Lex",license_or_access_basis:"public_official"}),
    row
  ]));
  assert.match(out.sql,/INSERT INTO case_law_provenance/);
  assert.match(out.sql,/official_primary/);
  assert.match(out.sql,/INSERT OR IGNORE INTO case_law_external_ids/);
  assert.match(out.sql,/ECLI:EU:C:2026:1/);
  assert.match(out.sql,/62026CJ0001/);
  assert.doesNotMatch(out.sql,/human_review_status[^\n]*reviewed/i);
});

test("CLI9 licensed Paragraf Lex Nova LexAI lineage remains discovery-only until official binding",()=>{
  for(const product of ["Lex","Nova","LexAI"]){
    const out=generateCaseLawImportSql(ndjson([
      manifest({
        source_class:"licensed_secondary_export",
        source_provider:"Paragraf.mk",
        source_product:product,
        authorized_export:true,
        license_or_access_basis:"Lawfully supplied export"
      }),
      caseRow({
        source_url:"https://paragraf.mk/export/"+product.toLowerCase()+"-case",
        source_sha256:"c".repeat(64),
        external_ids:{paragraf_legacy_id:"P-"+product+"-1"}
      })
    ]));
    assert.match(out.sql,/licensed_secondary/);
    assert.match(out.sql,/,1,0,/);
    assert.match(out.sql,new RegExp(product));
    assert.match(out.sql,/paragraf_legacy_id/);
  }
});
