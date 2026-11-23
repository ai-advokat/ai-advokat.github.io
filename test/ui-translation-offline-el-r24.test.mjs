import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('index.html','utf8');
const context={window:{}};
for(let n=1;n<=4;n++){
  const p=`assets/ui-locale-el-r24-${n}.js`;
  assert.ok(html.includes(`<script src="/${p}"></script>`),`load ordered static pack ${n}`);
  vm.runInNewContext(fs.readFileSync(p,'utf8'),context,{filename:p});
}
const el=context.window.AIADVOKAT_STATIC_LOCALES?.el;
test('R24 Greek offline catalogue contains 381 actual Macedonian source strings',()=>{
  assert.equal(Object.keys(el||{}).length,381);
  assert.equal(el['Правни извори'],'Νομικές πηγές');
  assert.match(el['Правото, организирано. AI, под човечка контрола.'],/δίκαιο/iu);
  assert.match(el['Преводот е привремено недостапен'],/μετάφραση/iu);
  assert.equal(el['© 2026 AI Advokat. Сите права задржани.'].includes('© 2026 AI Advokat'),true);
});
test('R24 source route uses offline pack before any paid or Workers AI requests',()=>{
  const start=html.indexOf('async function translateGlobalInterface(){');
  const end=html.indexOf('const units=collectUiTranslationUnits();',start);
  assert.ok(start>0&&end>start);
  const earlier=html.slice(start,end);
  assert.match(earlier,/window\.AIADVOKAT_STATIC_LOCALES\?\.\[siteLanguage\]/);
  assert.match(earlier,/translationScope="offline_locale_draft"/);
  assert.match(earlier,/translationBatches="0"/);
  assert.match(earlier,/dataset\.translationState="partial"/);
  assert.match(earlier,/showUiTranslationStatus/);
  assert.doesNotMatch(earlier,/fetch\(/);
  assert.match(html,/AI преводот на другите јазици зависи од достапноста/);
});
