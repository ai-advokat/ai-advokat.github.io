import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("governance.html","utf8");
const index=fs.readFileSync("index.html","utf8");

describe("Legal Governance Dashboard",()=>{
  test("LGD1 dashboard is linked from the portal",()=>{
    assert.match(index,/href="\/governance\.html"/);
  });

  test("LGD2 dashboard consumes controlled read-only registries",()=>{
    assert.match(page,/fetch\("\/data\/legal-evidence-cards\.json"/);
    assert.match(page,/fetch\("\/data\/audit-trail-decision-history\.json"/);
    assert.match(page,/Информативен приказ/);
  });

  test("LGD3 dashboard contains no mutation or approval controls",()=>{
    assert.doesNotMatch(page,/<form\b/i);
    assert.doesNotMatch(page,/<button\b/i);
    assert.doesNotMatch(page,/fetch\([^\n]+method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)/i);
  });

  test("LGD4 all downstream gates are presented independently",()=>{
    for(const label of ["Јавна објава","AI/RAG","GitHub спојување","Продукциско запишување"]){
      assert.ok(page.includes(label));
    }
  });

  test("LGD5 evidence architecture is visibly complete",()=>{
    for(const label of [
      "Извор / потекло",
      "Картичка за правен доказ",
      "Мотор за цитати и авторитет",
      "Проверувач на правни тврдења",
      "Потекло на одговорот",
      "Регистар на човечка контрола",
      "Ревизорска трага / историја на одлуки"
    ]) assert.ok(page.includes(label));
  });

  test("LGD6 missing data fails closed",()=>{
    assert.match(page,/Ниту еден статус не се претпоставува/);
  });

  test("LGD7 LIOE operational evidence is visible but read-only",()=>{
    assert.match(page,/LIOE \/ Реални записи од правни извршувања/);
    assert.match(page,/\/data\/legal-runs\/index\.json/);
    assert.match(page,/\/data\/legal-intelligence-metrics-baseline\.json/);
  });
});
