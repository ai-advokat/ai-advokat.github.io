import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const internal=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const external=fs.readFileSync("assets/standalone-bot.js","utf8");

test("internal bot receives and preserves a second question while the first is in flight",()=>{
  assert.match(internal,/let queuedConversationTurn=null/);
  assert.match(internal,/if\(abortController\)\{[\s\S]{0,550}queuedConversationTurn=\{question:q,chatThreadId:currentId\}/);
  assert.match(internal,/next\.chatThreadId===currentId/);
  assert.match(internal,/if\(!abortController && currentId===next\.chatThreadId\) send\(next\.question\)/);
});

test("internal chat has a bounded timeout and never auto-retries after a failed answer",()=>{
  assert.match(internal,/setTimeout\(\(\)=>\{\s*requestTimedOut=true;\s*controller\.abort\(\);\s*\},90000\)/);
  assert.match(internal,/clearTimeout\(timeoutId\)/);
  assert.match(internal,/if\(modelReplyReceived\)\{/);
  assert.match(internal,/Претходниот одговор не успеа/);
  assert.match(internal,/if\(abortController===controller\) abortController=null/);
});

test("model receives only conversation content, not service errors or private-case handoff",()=>{
  assert.match(internal,/Service-status text and privacy handoffs are not model answers/);
  assert.match(internal,/privacy-protected\|privacy-redacted/);
  assert.match(internal,/localConfidentialCasePrompt\(q\)/);
  assert.match(internal,/history:historyForApi/);
});

test("external bot preserves pending second turn but does not auto-send after provider error",()=>{
  assert.match(external,/let queuedNextTurn = null/);
  assert.match(external,/queuedNextTurn = q/);
  assert.match(external,/let timedOut=false/);
  assert.match(external,/let successfulAnswer=false/);
  assert.match(external,/if\(successfulAnswer\)\{/);
  assert.match(external,/Тековниот одговор не успеа\. Следното прашање е зачувано/);
  assert.match(external,/const privacy=detectConfidentialCasePrompt\(q\)/);
});

test("both UIs preserve human-controlled stop and bounded provider calls",()=>{
  assert.match(internal,/stopBtn\.addEventListener\("click",\(\)=>abortController\?\.abort\(\)\)/);
  assert.match(external,/\$\('stop'\)\.onclick = \(\) => pending\?\.abort\(\)/);
  assert.match(external,/setTimeout\(\(\) => \{timedOut=true;controller\.abort\(\);\},90000\)/);
});
