import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('standalone bot vNext exposes unified professional workspace without replacing governed backend',()=>{
  const html=fs.readFileSync('bot/index.html','utf8');
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  const css=fs.readFileSync('assets/standalone-bot-vnext.css','utf8');
  assert.match(html,/standalone-bot-vnext\.css/);
  assert.match(html,/standalone-bot-vnext\.js/);
  assert.match(source,/await import\('\.\/standalone-bot\.js\?v=20261031-runtime-r3'\)/);
  assert.match(source,/\/api\\\/bot/);
  assert.match(source,/body\.history=thread\.history\.slice\(-12\)/);
  assert.match(source,/Правен асистент/);
  assert.match(source,/Правни извори/);
  assert.match(source,/Судска практика/);
  assert.match(source,/CasePilot/);
  assert.match(source,/Документи/);
  assert.match(source,/Workflows/);
  assert.match(source,/Human Gate/);
  assert.match(source,/data-vnext-action="analyzer"/);
  assert.match(source,/data-vnext-action="consolidator"/);
  assert.match(source,/data-vnext-action="predictor"/);
  assert.match(source,/professional-tools\.html#analyzer/);
  assert.match(source,/official consolidated/);
  assert.match(source,/editorial consolidated/);
  assert.match(source,/working consolidation/);
  assert.match(source,/PREDICTOR MODE/);
  assert.match(source,/Не давај процент на успех/);
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


test('Zoki core trio keeps predictor and consolidation inside governance boundaries',()=>{
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  const analyzer=fs.readFileSync('src/legal-analyzer.js','utf8');
  const caseIntelligence=fs.readFileSync('src/case-intelligence.js','utf8');
  assert.match(analyzer,/LEGAL_ANALYZER_VERSION = "1\.0\.1"/);
  assert.match(analyzer,/risk_assessment/);
  assert.match(caseIntelligence,/strategy_synthesis/);
  assert.match(source,/HUMAN GATE REQUIRED/);
  assert.match(source,/Не давај процент на успех/);
  assert.doesNotMatch(source,/\b\d{1,3}%\s*(успех|шанса|веројатност)/i);
});


test('vNext deduplicates identical in-flight user turns',()=>{
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  assert.ok(source.includes("const last=thread.history.at(-1)"));
  assert.ok(source.includes("last?.role==='user'"));
  assert.ok(source.includes("String(last.text||'').trim()===q"));
});


test('vNext message actions provide copy, edit/reuse, repeat and source access',()=>{
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  const css=fs.readFileSync('assets/standalone-bot-vnext.css','utf8');
  assert.match(source,/function ensureMessageActions\(article\)/);
  assert.match(source,/⧉ Копирај/);
  assert.match(source,/✎ Уреди/);
  assert.match(source,/↺ Повтори/);
  assert.match(source,/▤ Извори/);
  assert.match(source,/navigator\.clipboard\.writeText/);
  assert.match(source,/setComposerText/);
  assert.match(css,/\.vnext-message-actions/);
  assert.match(css,/\.vnext-message-action/);
});

test('vNext gives visible symbols to right-side tabs, actions and global tools',()=>{
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  assert.match(source,/▤<\/span> Извори/);
  assert.match(source,/◫<\/span> Контекст/);
  assert.match(source,/✓<\/span> Human Gate/);
  assert.match(source,/◇<\/span> Артефакт/);
  assert.match(source,/▣ Отвори CasePilot/);
  assert.match(source,/⇩ Извези DOCX/);
  assert.match(source,/⌁ Анализатор/);
  assert.match(source,/◎ Предиктор/);
});

test('vNext privacy copy keeps local redaction as default and workspace as necessity-based',()=>{
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  assert.match(source,/Идентификаторите се маскираат локално/);
  assert.match(source,/оригиналниот документ или точниот идентитет/);
  assert.match(source,/Препознатливите лични идентификатори се маскираат локално/);
});
