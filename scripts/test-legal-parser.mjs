import test from "node:test";
import assert from "node:assert/strict";
import {parseLegalText, splitArticles} from "./parse-mk-legal-text.mjs";

const source=`ЗАКОН ЗА ТЕСТ
Член 1
(1) Ова е првиот став.
(2) Ова е вториот став.
1) Прва точка
2) Втора точка

Член 2
Наслов на член
(1) Текст на членот.

Член 25-а
(1) Посебен член.
а) алинеја еден
б) алинеја два
`;

const meta={
  instrument_id:1,
  instrument_title:"Закон за тест",
  version_id:"2026-09-29",
  source_url:"https://example.invalid/test.pdf",
  source_sha256:"a".repeat(64),
  source_issue_number:"1/2026",
  source_issue_date:"2026-09-29"
};

test("detects Macedonian article headers including suffix",()=>{
  const a=splitArticles(source);
  assert.equal(a.length,3);
  assert.equal(a[2].number,"25-а");
});

test("parses article, paragraph and item hierarchy",()=>{
  const p=parseLegalText(source,meta);
  assert.equal(p.article_count,3);
  assert.equal(p.records[0].paragraphs.length,2);
  assert.equal(p.records[0].paragraphs[1].items.length,2);
  assert.equal(p.records[1].article_heading,"Наслов на член");
  assert.equal(p.records[2].article_number_normalized,"25-а");
  assert.equal(p.records[2].paragraphs[0].items.length,2);
});

test("fails closed without source checksum",()=>{
  assert.throws(()=>parseLegalText(source,{...meta,source_sha256:""}),/Missing required metadata/);
});
