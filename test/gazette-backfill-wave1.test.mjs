import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const script=fs.readFileSync("scripts/gazette_backfill_wave1.py","utf8");
const workflow=fs.readFileSync(".github/workflows/gazette-backfill-wave1-1991-2025.yml","utf8");
const contentsWorkflow=fs.readFileSync(".github/workflows/gazette-issue-contents-1991-2025-production-activation.yml","utf8");

test("GB1 wave one targets 1991-2025 official registers",()=>{
  assert.match(script,/REGISTER_PAGE=/);
  assert.match(script,/FREE_ACCESS_PAGE=/);
  assert.match(workflow,/--from-year 1991/);
  assert.match(workflow,/--to-year 2025/);
});

test("GB2 extracted acts remain pending Human Gate",()=>{
  assert.match(script,/"human_review_status":"pending"/);
  assert.match(workflow,/pending reconciliation and Human Gate/);
});

test("GB3 workflow is paced and auditable",()=>{
  assert.match(workflow,/--delay 0\.8/);
  assert.match(workflow,/actions\/upload-artifact@v4/);
  assert.match(script,/register_source_sha256/);
});


test("GB4 machine-text registers use MuPDF with bounded Poppler fallback",()=>{
  assert.match(script,/def mutool_text\(/);
  assert.match(script,/\["mutool","draw","-F","txt"/);
  assert.match(script,/extractor="mupdf_txt"/);
  assert.match(script,/extractor="poppler_layout_fallback"/);
  assert.match(script,/normalize_columns=False/);
  assert.match(workflow,/mupdf-tools/);
  assert.match(contentsWorkflow,/mupdf-tools/);
});

test("GB5 date-leading wrapped titles are not misread as new register ordinals",()=>{
  const py=String.raw`
import importlib.util, json
spec=importlib.util.spec_from_file_location("g","scripts/gazette_backfill_wave1.py")
g=importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
sample="""1. Обрасци од 1 до 6 на Државната из-
борна комисија
1/1
219. Одлука за давање согласност на Извештајот за работењето за период од
01.01.2003 до 31.12.2003 година
12/7
1153. Одлука за давање согласност на Одлуката за изменување и дополнување на Ценовникот бр. 02-2022/17 од
22.12.2003 година и бр. 02-1401/5 од 26.07.2004 година
86/7
"""
entries, unresolved=g.parse_register_text(sample,2005,"https://example.invalid/register.pdf","a"*64,normalize_columns=False)
print(json.dumps({"entries":entries,"unresolved":unresolved},ensure_ascii=False))
`;
  const result=JSON.parse(execFileSync("python3",["-c",py],{encoding:"utf8"}));
  assert.equal(result.unresolved.length,0,JSON.stringify(result));
  assert.equal(result.entries.length,3,JSON.stringify(result));
  assert.deepEqual(result.entries.map(x=>[x.ordinal,x.issue_number,x.page_start]),[
    [1,"1",1],[219,"12",7],[1153,"86",7]
  ]);
  assert.equal(result.entries[0].title,"Обрасци од 1 до 6 на Државната изборна комисија");
});

test("GB6 title joining removes only line-break hyphenation before lowercase continuations",()=>{
  assert.match(script,/def join_register_parts\(/);
  assert.match(script,/cleaned\[-1\]\.endswith\("-"\) and part\[:1\]\.islower\(\)/);
  assert.match(script,/date_prefix_re=re\.compile/);
});
