import test from "node:test";
import assert from "node:assert/strict";
import {parseAmendmentText} from "./parse-mk-amendment-text.mjs";

const meta={
  instrument_key:"mk:zro",
  instrument_id:1,
  instrument_title:"Закон за работните односи",
  amendment_title:"Закон за изменување на Законот за работните односи",
  source_url:"https://example.invalid/amendment.pdf",
  source_sha256:"b".repeat(64),
  source_issue_number:"124/2025",
  source_issue_date:"2025-06-19",
  effective_date:"2025-06-19",
  application_date:"2025-06-19"
};

test("detects replace target from 'Во член X'",()=>{
  const src=`Член 1
Во член 88 зборовите „еден месец“ се заменуваат со зборовите „два месеци“.`;
  const p=parseAmendmentText(src,meta);
  assert.equal(p.event_count,1);
  assert.equal(p.events[0].target_article_number,"88");
  assert.equal(p.events[0].event_type,"replace");
});

test("detects insertion after article",()=>{
  const src=`Член 1
По член 25-а се додава нов член 25-б кој гласи: ...`;
  const p=parseAmendmentText(src,meta);
  assert.equal(p.event_count,1);
  assert.equal(p.events[0].target_article_number,"25-а");
  assert.equal(p.events[0].event_type,"insert");
});

test("detects deletion target",()=>{
  const src=`Член 1
Член 44 се брише.`;
  const p=parseAmendmentText(src,meta);
  assert.equal(p.event_count,1);
  assert.equal(p.events[0].target_article_number,"44");
  assert.equal(p.events[0].event_type,"delete");
});

test("keeps unresolved amendment act article pending",()=>{
  const src=`Член 1
Овој закон влегува во сила со денот на објавувањето.`;
  const p=parseAmendmentText(src,meta);
  assert.equal(p.event_count,1);
  assert.equal(p.warning_count,1);
  assert.equal(p.events[0].target_article_number,null);
  assert.equal(p.events[0].human_review_status,"pending");
});


test("handles членот form and inserted base-law article without splitting amendment act",()=>{
  const src=`Член 1
Во членот 104 зборот „друг“ се брише.

Член 2
По членот 104 се додава нов наслов и нов член 104-а, кои гласат:
„Продолжување на работен однос
Член 104-а
(1) Текст на новиот член.

Член 3
Преодна одредба за лицата од членот 2 од овој закон.

Член 4
Овој закон влегува во сила со денот на објавувањето.`;
  const p=parseAmendmentText(src,meta);
  assert.equal(p.amendment_article_count,4);
  assert.equal(p.events[0].target_article_number,"104");
  const insert=p.events.find(e=>e.amendment_article_number==="2");
  assert.ok(insert);
  assert.equal(insert.target_article_number,"104");
  assert.deepEqual(insert.inserted_article_numbers,["104-а"]);
  assert.equal(insert.event_type,"insert");
});


test("detects heading change and direct article replacement",()=>{
  const src=`Член 1
Насловот на член 12 се менува и гласи: „Нов наслов“.

Член 2
Членот 258-б се менува и гласи:
„Нов текст“.

Член 3
Овој закон влегува во сила осмиот ден од денот на објавувањето.`;
  const p=parseAmendmentText(src,meta);
  const e1=p.events.find(e=>e.amendment_article_number==="1");
  const e2=p.events.find(e=>e.amendment_article_number==="2");
  assert.equal(e1.target_article_number,"12");
  assert.equal(e2.target_article_number,"258-б");
  assert.equal(e1.event_type,"amend");
  assert.equal(e2.event_type,"amend");
  assert.equal(p.warning_count,1);
});
