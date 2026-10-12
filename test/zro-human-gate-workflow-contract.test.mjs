import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const wf=fs.readFileSync(".github/workflows/zro-human-gate-review-packets.yml","utf8");

test("ZRO-WF1 Human Gate packet builder runs from main or manual dispatch",()=>{
  assert.match(wf,/branches:\s*\n\s*- main/);
  assert.match(wf,/workflow_dispatch:/);
});

test("ZRO-WF2 workflow reads staging only and never targets production D1 for SQL execution",()=>{
  const execLines=wf.split("\n").filter(x=>/wrangler d1 execute/.test(x));
  assert.ok(execLines.length>=3);
  for(const line of execLines){
    assert.match(line,/d1 execute PREVIEW_DB /,line);
    assert.doesNotMatch(line,/d1 execute ai-advokat-db /,line);
  }
});

test("ZRO-WF3 workflow contains no migration file application or SQL mutations",()=>{
  assert.doesNotMatch(wf,/--file\s+migrations\//);
  assert.doesNotMatch(wf,/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i);
});

test("ZRO-WF4 packet builder fails closed on exact article/event topology",()=>{
  assert.match(wf,/assert len\(articles\)==26/);
  assert.match(wf,/assert len\(events\)==32/);
  assert.match(wf,/assert len\(packet_list\)==27/);
  assert.match(wf,/current_consolidated/);
  assert.match(wf,/HUMAN GATE PACKET BUILD: PASS/);
});
