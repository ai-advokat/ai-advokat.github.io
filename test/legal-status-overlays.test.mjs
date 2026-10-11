import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  LEGAL_STATUS_OVERLAYS,
  LEGAL_STATUS_OVERLAYS_AS_OF,
  legalStatusOverlaysForArticle,
  legalStatusOverlaysForArticles,
  attachLegalStatusOverlays
} from "../src/legal-status-overlays.js";

const data=JSON.parse(fs.readFileSync("data/legal-status-overlays-2026.json","utf8"));

test("LSO1 Article 218 warning is source-bound and non-repeal",()=>{
  assert.equal(LEGAL_STATUS_OVERLAYS.length,1);
  const x=LEGAL_STATUS_OVERLAYS[0];
  assert.equal(x.instrumentKey,"mk:zi");
  assert.equal(x.articleNumber,"218");
  assert.equal(x.caseNumber,"U.br.86/2025");
  assert.equal(x.initiatedOn,"2026-01-21");
  assert.equal(x.legalEffect,"none_identified");
  assert.equal(x.humanGateRequired,true);
  assert.match(x.sourceUrl,/ustavensud\.mk/);
  assert.equal(LEGAL_STATUS_OVERLAYS_AS_OF,"2026-10-11");
});

test("LSO2 warning is not shown before constitutional proceedings began",()=>{
  assert.deepEqual(legalStatusOverlaysForArticle("mk:zi","218",{referenceDate:"2026-01-20"}),[]);
  assert.equal(legalStatusOverlaysForArticle("mk:zi","218",{referenceDate:"2026-01-21"}).length,1);
  assert.equal(legalStatusOverlaysForArticle("mk:zi","218").length,1);
});

test("LSO3 unrelated laws/articles never inherit the warning",()=>{
  assert.deepEqual(legalStatusOverlaysForArticle("mk:zro","218"),[]);
  assert.deepEqual(legalStatusOverlaysForArticle("mk:zi","217"),[]);
  assert.deepEqual(legalStatusOverlaysForArticle("mk:zi","218-а"),[]);
});

test("LSO4 future reference dates are visibly unverified, not guessed",()=>{
  const x=legalStatusOverlaysForArticle("mk:zi","218",{referenceDate:"2027-01-01"})[0];
  assert.equal(x.futureReferenceUnverified,true);
  assert.match(x.warningMk,/не е потврден/);
});

test("LSO5 article attachment and aggregation are deterministic",()=>{
  const article=attachLegalStatusOverlays("mk:zi",{articleNumber:"218",text:"x"});
  assert.equal(article.legalStatusOverlays.length,1);
  const overlays=legalStatusOverlaysForArticles("mk:zi",[
    {articleNumber:"218"},{articleNumberNormalized:"218"},{articleNumber:"217"}
  ]);
  assert.equal(overlays.length,1);
  assert.equal(overlays[0].articleNumber,"218");
});

test("LSO6 runtime registry matches governed data registry",()=>{
  assert.equal(data.as_of,LEGAL_STATUS_OVERLAYS_AS_OF);
  assert.equal(data.overlays.length,LEGAL_STATUS_OVERLAYS.length);
  const a=data.overlays[0], b=LEGAL_STATUS_OVERLAYS[0];
  assert.deepEqual(
    [a.id,a.instrument_key,a.article_number,a.case_number,a.initiated_on,a.source_url,a.legal_effect,a.human_gate_required],
    [b.id,b.instrumentKey,b.articleNumber,b.caseNumber,b.initiatedOn,b.sourceUrl,b.legalEffect,b.humanGateRequired]
  );
});
