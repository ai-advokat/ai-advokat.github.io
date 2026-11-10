import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const root=fs.readFileSync("index.html","utf8");
const bot=fs.readFileSync("bot/index.html","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");

test("root header groups related functions instead of one flat catalogue",()=>{
  for(const label of ["Судови и пракса","Службени извори","AI алатки","Материјали","Публикации","Академија и портал"]){
    assert.ok(root.includes(label),label);
  }
  assert.match(root,/data-nav-folder="courts"/);
  assert.match(root,/data-nav-folder="official"/);
  assert.match(root,/data-nav-folder="ai"/);
  assert.match(root,/href="\/ai-contract\.html">AI Contract/);
});

test("internal AI workbench groups modules by legal job",()=>{
  for(const label of ["AI анализа и подготовка","Судови и предмети","Извори и документи","Работа и контрола"]){
    assert.ok(root.includes(label),label);
  }
  for(const module of ["assistant","analyzer","consolidator","predictor","justice-daily","cases","casepilot","sources","public-evidence","documents","library","workflows","professional-ecosystem","human-gate"]){
    assert.equal((root.match(new RegExp('data-ai-workbench="'+module+'"','g'))||[]).length>=1,true,module);
  }
});

test("external AI bot exposes the same courts official AI and materials taxonomy",()=>{
  for(const label of ["Судови","Службени","AI алатки","Материјали","Судови и судска пракса","Службени извори и e‑услуги","AI алатки и приватна работа","Библиотека, водичи и автор"]){
    assert.ok(bot.includes(label),label);
  }
  assert.match(bot,/href="\/ai-contract\.html"/);
  assert.match(bot,/href="\/judicial-practice\.html"/);
  assert.match(bot,/href="\/sluzben-vesnik\/"/);
});

test("internal language selector now applies to whole portal by reloading shared language preference",()=>{
  assert.match(chat,/const LANGUAGE_KEY="aiadvokat-language"/);
  const languageBlock=chat.slice(chat.indexOf("function bindLanguageSelector"),chat.indexOf("const INTERNAL_VOICE_CONVERSATION_VERSION"));
  assert.match(languageBlock,/location\.reload\(\)/);
  assert.match(languageBlock,/Целиот интерфејс/);
});

test("Hybrid 10 is itself grouped into related functional folders",()=>{
  for(const label of ["Прописи и верзии","Судови и проверка","Службени податоци и e‑услуги","Human workflow"]){
    assert.ok(root.includes(label),label);
  }
  for(const module of ["time","bylaws","cases","calendar","diff","opendata","services","handoff","gold","echr"]){
    assert.ok(root.includes("module="+module),module);
  }
});
