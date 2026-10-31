import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('standalone bot vNext exposes unified professional workspace without replacing governed backend',()=>{
  const html=fs.readFileSync('bot/index.html','utf8');
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  const css=fs.readFileSync('assets/standalone-bot-vnext.css','utf8');
  assert.match(html,/standalone-bot-vnext\.css/);
  assert.match(html,/standalone-bot-vnext\.js/);
  assert.match(source,/await import\('\.\/standalone-bot\.js'\)/);
  assert.match(source,/\/api\\\/bot/);
  assert.match(source,/body\.history=thread\.history\.slice\(-12\)/);
  assert.match(source,/Правен асистент/);
  assert.match(source,/Правни извори/);
  assert.match(source,/Судска практика/);
  assert.match(source,/CasePilot/);
  assert.match(source,/Документи/);
  assert.match(source,/Workflows/);
  assert.match(source,/Human Gate/);
  assert.match(source,/Global Search/);
  assert.match(source,/vnext-legal-ref/);
  assert.match(source,/casepilot-workspace\.html/);
  assert.match(source,/Потребна е професионална човечка проверка/);
  assert.match(css,/grid-template-columns:260px minmax\(0,1fr\) 340px/);
});

test('vNext keeps session thread content out of persistent browser storage',()=>{
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  assert.doesNotMatch(source,/localStorage\.setItem\([^,]*(thread|history|conversation)/i);
  assert.match(source,/const THEME_KEY=/);
});
