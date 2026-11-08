import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const html=fs.readFileSync("bot/index.html","utf8");
const js=fs.readFileSync("assets/standalone-bot-r7.js","utf8");
const css=fs.readFileSync("assets/standalone-bot-r7.css","utf8");
const pages=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");

test("external bot activates Professional Workbench R7 without changing core R15 semantics",()=>{
  assert.match(html,/name="ai-advokat-release" content="core-r15"/);
  assert.match(html,/name="ai-advokat-ui-release" content="professional-r7"/);
  assert.match(html,/standalone-bot-r7\.css\?v=20261108-professional-r7/);
  assert.match(html,/standalone-bot-r7\.js\?v=20261108-professional-r7/);
  assert.ok(html.indexOf("standalone-bot-vnext.js") < html.indexOf("standalone-bot-r7.js"));
});

test("R7 uses the premium three-column Legal Pulse workbench architecture",()=>{
  assert.match(css,/grid-template-columns:286px minmax\(560px,1fr\) 360px/);
  assert.match(css,/--r7-gold:#e3b75e/);
  assert.match(css,/--r7-violet:#8e4ff4/);
  assert.match(css,/\.r7-engine-strip/);
  assert.match(css,/\.r7-process-card/);
  assert.match(css,/\.r7-orbit/);
  assert.match(css,/\.r7-composer-actions/);
  assert.match(css,/body>section\[aria-label\^="Hybrid Legal Intelligence"\]/);
});

test("R7 header preserves the concept-1 professional engine strip",()=>{
  assert.match(js,/AIAdvokat4/);
  assert.match(js,/LexNova UX/);
  assert.match(js,/CONSOLIDATOR/);
  assert.match(js,/ANALYZER/);
  assert.match(js,/PREDICTOR/);
  assert.match(js,/CasePilot/);
  assert.match(js,/Sources/);
  assert.match(js,/Human Gate/);
});

test("R7 process orbit follows the governed bot request lifecycle",()=>{
  assert.match(js,/\/api\\\/bot/);
  assert.match(js,/renderPhase\("running"\)/);
  assert.match(js,/response\.ok\?"complete":"error"/);
  assert.match(js,/REVIEW/);
  assert.match(js,/HUMAN<br>GATE/);
  assert.doesNotMatch(js,/Math\.random\(\).*success|fake.*source|mock.*source/i);
});

test("R7 quick actions are functional prompts rather than decorative controls",()=>{
  assert.match(js,/data-r7-prompt="legal-test"/);
  assert.match(js,/data-r7-prompt="sources"/);
  assert.match(js,/data-r7-prompt="scenario"/);
  assert.match(js,/data-r7-prompt="case-law"/);
  assert.match(js,/Discovery.*Reviewed Authority/);
  assert.match(js,/Без проценти и гаранции/);
  assert.match(js,/querySelector\("summary"\)\?\.click/);
});

test("R7 remains responsive and respects reduced motion",()=>{
  assert.match(css,/@media\(max-width:1180px\)/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("Pages curated sync publishes and parity-checks both R7 assets",()=>{
  for(const f of ["assets/standalone-bot-r7.js","assets/standalone-bot-r7.css"]){
    assert.ok(pages.includes(f),f);
  }
  assert.match(pages,/node --check assets\/standalone-bot-r7\.js/);
  assert.match(pages,/Professional Workbench R7/);
});


test("R7 hover and focus states preserve readable contrast",()=>{
  assert.match(css,/html\.professional-r7 #menu nav button:hover/);
  assert.match(css,/color:#fff3c7!important/);
  assert.match(css,/background:#123652!important/);
  assert.match(css,/html\.professional-r7 \.vnext-workflow-grid button:hover/);
  assert.doesNotMatch(css,/html\.professional-r7 #menu nav (?:button|a):hover[^}]*background:\s*#fff/i);
});
