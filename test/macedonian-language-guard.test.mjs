import test from "node:test";
import assert from "node:assert/strict";
import {
  MACEDONIAN_LANGUAGE_STANDARD_VERSION,
  MACEDONIAN_2017_SYSTEM_RULES,
  shouldEnforceMacedonianOutput,
  assessMacedonianOutput,
  buildMacedonianRepairMessages,
  normaliseMacedonianGeneratedText
} from "../src/macedonian-language-guard.js";

test("runtime contract is explicitly anchored to the 2017 Macedonian orthography",()=>{
  assert.match(MACEDONIAN_LANGUAGE_STANDARD_VERSION,/2017/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/2017/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/standard literary Macedonian/i);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/PRIORITY 0/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/must not be shown to the user/);
});

test("Macedonian questions activate the language gate",()=>{
  assert.equal(shouldEnforceMacedonianOutput("Замолувам да ми направиш правна анализа на македонски."),true);
  assert.equal(shouldEnforceMacedonianOutput("Што предвидува законот?"),true);
  assert.equal(shouldEnforceMacedonianOutput("izraboti mi tuzba za nadomest na steta so izmisleni podatoci"),true);
  assert.equal(shouldEnforceMacedonianOutput("Please answer in English."),false);
});

test("clean literary Macedonian passes",()=>{
  const out="Краток преглед на фактите. Потребно е да се проверат наследниците, полномошното и важечкиот правен извор во Северна Македонија.";
  const check=assessMacedonianOutput(out,{userText:"Направи анализа на македонски."});
  assert.equal(check.ok,true,JSON.stringify(check));
});

test("Serbian Bulgarian Russian hybrid regression is rejected",()=>{
  const bad="Краток преглед на информация. Догађајот бара поступак, а треба да се проверат документы и становище. Трябва да се обжалвайте.";
  const check=assessMacedonianOutput(bad,{userText:"Направи анализа на македонски."});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes("foreign_cyrillic_letters"));
  assert.ok(check.reasons.includes("foreign_lexical_contamination"));
});

test("Bulgarian legal-drafting contamination from the reported lawsuit example is rejected",()=>{
  const bad="Ищецът подава искова молба срещу ответникот и бара обезщетение. Случайни детали и разноски ќе ги утврди съдът.";
  const check=assessMacedonianOutput(bad,{userText:"Изработи тужба за надомест на штета со измислени податоци."});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes("foreign_cyrillic_letters"));
  assert.ok(check.reasons.includes("foreign_lexical_contamination"));
  assert.ok(check.foreignLexemes.some(x=>["искова","обезщетение","случайни","разноски"].includes(x)));
});

test("unrequested foreign-law substitution is rejected",()=>{
  const bad="Применете Български закон за наследство и проверете во Народен парламент.";
  const check=assessMacedonianOutput(bad,{userText:"Анализирај наследување во Северна Македонија."});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes("foreign_jurisdiction_substitution"));
});

test("repair pass is source-preserving and non-expansive by contract",()=>{
  const messages=buildMacedonianRepairMessages({text:"Догађај",userText:"Анализа"});
  assert.equal(messages.length,2);
  assert.match(messages[0].content,/Do not add new facts, laws, citations, deadlines, legal effects or recommendations/);
  assert.match(messages[0].content,/Return only the corrected answer/);
});


test("repair system prompt explicitly forbids neighbouring-language legal forms",()=>{
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/съд, ищец, ответник/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/надомест на штета/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/Macedonian Latin transliteration/);
});


test("deterministic last-mile cleanup converts reported Bulgarian and Serbian legal contamination",()=>{
  const bad="Ищецът подава искова молба пред съдът и бара обезщетение и разноски. Поступакот има захтев.";
  const clean=normaliseMacedonianGeneratedText(bad);
  assert.match(clean,/Тужителот/u);
  assert.match(clean,/тужба/u);
  assert.match(clean,/судот/u);
  assert.match(clean,/надомест на штета/u);
  assert.match(clean,/трошоци/u);
  assert.match(clean,/постапка/iu);
  assert.match(clean,/барање/u);
  const check=assessMacedonianOutput(clean,{userText:"Изработи тужба на македонски."});
  assert.equal(check.ok,true,JSON.stringify({clean,check}));
});

test("deterministic cleanup removes remaining non-Macedonian Cyrillic letters",()=>{
  const clean=normaliseMacedonianGeneratedText("Трябва да се провери съдът и ответникът.");
  assert.doesNotMatch(clean,/[ЂђЋћЪъЫыЭэЁёЮюЯяЙйЬьЩщ]/u);
});


test("expanded Bulgarian and Russian contamination is rejected and normalised",()=>{
  const bad="Моля, настоящият документ съдържа информация и трябва да се провери. Данные следует да се приложат.";
  const check=assessMacedonianOutput(bad,{userText:"Одговори на литературен македонски."});
  assert.equal(check.ok,false);
  const clean=normaliseMacedonianGeneratedText(bad);
  assert.doesNotMatch(clean,/\b(моля|настоящият|информация|трябва|данные|следует)\b/iu);
});

test("valid Macedonian legal vocabulary never trips the neighbouring-language guard",()=>{
  const good="Судот е должен да ги земе предвид сите релевантни информации, а странката е должна да ги достави доказите навреме.";
  const check=assessMacedonianOutput(good,{userText:"Направи правна анализа на литературен македонски."});
  assert.equal(check.ok,true,JSON.stringify(check));
  assert.equal(normaliseMacedonianGeneratedText(good),good);
});


test("repair prompt contains Macedonian-native quality instructions",()=>{
  const messages=buildMacedonianRepairMessages({
    text:"пријстак приетување притбор",
    userText:"Направи потсетник на македонски."
  });
  assert.match(messages[0].content,/МАКЕДОНСКА ЈАЗИЧНА РЕДАКЦИЈА/);
  assert.match(messages[0].content,/не создавај непостоечки македонски зборови/i);
  assert.match(messages[0].content,/постапка, поднесување, барање, решение, притвор/);
  assert.match(messages[0].content,/немакедонски кирилични букви/i);
  assert.match(messages[0].content,/замени го целиот збор со правилен македонски еквивалент/i);
});
