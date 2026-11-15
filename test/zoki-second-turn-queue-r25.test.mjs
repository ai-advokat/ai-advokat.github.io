import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../assets/standalone-bot.js",import.meta.url),"utf8");

test("external bot composer remains editable while the first response is pending",()=>{
  assert.match(source,/\$\('question'\)\.disabled = false/);
  assert.match(source,/\$\('send'\)\.hidden = false/);
  assert.match(source,/let queuedNextTurn = null/);
});

test("second turn is queued and submitted in the same session instead of silently dropped",()=>{
  assert.match(source,/if \(pending\) \{\s*\/\/ Never drop the second question/);
  assert.match(source,/queuedNextTurn = q/);
  assert.match(source,/queuedNextTurn = null; history = \[\]; sessionId = crypto\.randomUUID\(\)/);
  assert.match(source,/if \(epoch === generation && !pending\) \$\('composer'\)\.requestSubmit\(\)/);
});

test("follow-up still flows through privacy routing and bounded history",()=>{
  assert.match(source,/const privacy=detectConfidentialCasePrompt\(q\)/);
  assert.match(source,/history:history\.slice\(-8\)/);
  assert.match(source,/queueMicrotask\(\(\) => \{/);
  assert.match(source,/if \(epoch === generation && !pending\)/);
});
