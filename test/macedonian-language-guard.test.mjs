import test from "node:test";
import assert from "node:assert/strict";
import {
  MACEDONIAN_LANGUAGE_STANDARD_VERSION,
  MACEDONIAN_RELEASE_GATE_VERSION,
  MACEDONIAN_2017_SYSTEM_RULES,
  shouldEnforceMacedonianOutput,
  assessMacedonianOutput,
  macedonianReleaseVerdict,
  macedonianDeliveryVerdict,
  buildMacedonianRepairMessages,
  normaliseMacedonianGeneratedText
} from "../src/macedonian-language-guard.js";

test("runtime contract is explicitly anchored to the 2017 Macedonian orthography",()=>{
  assert.match(MACEDONIAN_LANGUAGE_STANDARD_VERSION,/2017/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/2017/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/standard literary Macedonian/i);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/PRIORITY 0/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/must not suppress an otherwise useful legal answer/);
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


test("Bulgarian prose without distinctive letters is still rejected",()=>{
  const bad="Това е пример какво треба да направите, когато имате спор. Всички документи треба да се проверят.";
  const check=assessMacedonianOutput(bad,{userText:"Одговори ми на македонски."});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.reasons.includes("foreign_lexical_contamination"));
  assert.ok(check.foreignLexemes.some(x=>["това","какво","когато","всички"].includes(x)));
});

test("wrong-language user correction is explicit in the Macedonian runtime contract",()=>{
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/hard language correction/i);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/Cyrillic alone is never evidence/i);
});


test("reported malformed inheritance-answer vocabulary is rejected",()=>{
  const bad="Анализа и препораки за последуствување. Во документот има прикаде, приречет и данишна ставка.";
  const check=assessMacedonianOutput(bad,{userText:"Анализирај го оставинскиот предмет на македонски."});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.reasons.includes("malformed_macedonian_generation"));
  assert.ok(check.malformedGeneration.some(x=>["последуствување","прикаде","приречет","данишна"].includes(x)));
});


test("real production hybrid ECHR answer is rejected and repaired",()=>{
  const bad="ПРОСЕК ЗА ОФИЦИЈАЛНИ ПРЕСУДИ И ОДЛУКИ НА ЕСЧП ПОД ИЗМЕРА НА РЕПУБЛИКА СЕВЕРНА МАКЕДОНСКА. Сите цифри се исто така доступни во индексиот на Бирото за залагање пред ЕСЧП. Датумот е денот на низна одлука. Базиски белешки.";
  const check=assessMacedonianOutput(bad,{userText:"Пребарај ги официјалните македонски пресуди и одлуки на ЕСЧП за Северна Македонија."});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.reasons.includes("foreign_lexical_contamination") || check.reasons.includes("contextual_language_contamination"));
  const clean=normaliseMacedonianGeneratedText(bad);
  const repaired=assessMacedonianOutput(clean,{userText:"Одговори на литературен македонски."});
  assert.equal(repaired.ok,true,JSON.stringify({clean,repaired}));
  assert.match(clean,/Преглед на официјални пресуди/iu);
  assert.match(clean,/Република Северна Македонија/u);
  assert.match(clean,/достапни/u);
  assert.match(clean,/индексот/u);
  assert.match(clean,/Бирото за застапување пред ЕСЧП/u);
  assert.match(clean,/датумот на одлуката/u);
  assert.match(clean,/Основни белешки/u);
});

test("exact invalid phrase 'ИЗМЕРА НА РЕПУБЛИКА СЕВЕРНА' is blocked",()=>{
  const bad="ИЗМЕРА НА РЕПУБЛИКА СЕВЕРНА МАКЕДОНСКА. Податоците се доступни во индексот.";
  const check=assessMacedonianOutput(bad,{userText:"Одговори на македонски."});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.reasons.includes("contextual_language_contamination") || check.reasons.includes("foreign_lexical_contamination"));
  const clean=normaliseMacedonianGeneratedText(bad);
  assert.doesNotMatch(clean,/ИЗМЕРА НА РЕПУБЛИКА СЕВЕРНА/iu);
  assert.doesNotMatch(clean,/доступни/iu);
  assert.match(clean,/Република Северна Македонија/u);
  assert.match(clean,/достапни/u);
});


test("'измера' is treated as malformed generation, never as 'измена'",()=>{
  const bad="ИЗМЕРА НА РЕПУБЛИКА СЕВЕРНА МАКЕДОНИЈА";
  const check=assessMacedonianOutput(bad,{userText:"Одговори на македонски."});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.reasons.includes("malformed_macedonian_generation") || check.reasons.includes("contextual_language_contamination"));
  assert.ok(check.malformedGeneration.includes("измера"));
  const clean=normaliseMacedonianGeneratedText(bad);
  assert.doesNotMatch(clean,/измера/iu);
  assert.doesNotMatch(clean,/измена/iu);
  assert.match(clean,/за Република Северна Македонија/iu);
});


test("real employment-definition garbage answer is rejected root-and-branch",()=>{
  const bad=[
    "Наименование — Договорот опишува договорените услови помеѓуз работникот и работодавачот за ажурирање на рани работни облага.",
    "Времетраење — Фиксно или непостојно, со можни изминливи датум.",
    "Начинот на исплата е нпр. по банска сметка.",
    "Точнаја деловна обврЗка треба да се извлече од деловните написи.",
    "Договорот мора да е саответен закон и да е оценет за правопризнателството."
  ].join(" ");
  const check=assessMacedonianOutput(bad,{userText:"Што е договор за вработување?"});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.reasons.includes("foreign_lexical_contamination") || check.reasons.includes("malformed_macedonian_generation"));
  assert.ok(check.reasons.includes("malformed_token_shape"),JSON.stringify(check));
  assert.ok(check.foreignLexemes.includes("наименование"));
  assert.ok(check.structuralAnomalies.some(x=>/обврЗка/u.test(x)));
});

test("unambiguous production calques get deterministic cleanup before any AI repair",()=>{
  const clean=normaliseMacedonianGeneratedText("Наименование: права и обврзки; исплата по банска сметка; саответен услов.");
  assert.match(clean,/Назив/u);
  assert.match(clean,/обврски/u);
  assert.match(clean,/банкарска сметка/u);
  assert.match(clean,/соодветен/u);
  const check=assessMacedonianOutput(clean,{userText:"Одговори на македонски."});
  assert.equal(check.ok,true,JSON.stringify({clean,check}));
});

test("language runtime is V9 after canonical root hardening",()=>{
  assert.equal(MACEDONIAN_LANGUAGE_STANDARD_VERSION,"MK_ORTHOGRAPHY_2017_RUNTIME_V9");
});


test("live Serbian 'Ево' contamination is rejected and deterministically cleaned",()=>{
  const bad="Ево на примерен нацрт на тужба за надомест на штета.";
  const check=assessMacedonianOutput(bad,{userText:"Изработи тужба на македонски."});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.foreignLexemes.includes("ево"),JSON.stringify(check));
  const clean=normaliseMacedonianGeneratedText(bad);
  assert.doesNotMatch(clean,/\bево\b/iu);
  assert.match(clean,/Еве примерен нацрт/u);
});

test("awkward wrong-language correction phrase is normalised without changing substance",()=>{
  const bad="Разбирај. Јас ќе ви одговорам исклучиво на стандарден македонски јазик.";
  const check=assessMacedonianOutput(bad,{userText:"Претходниот одговор беше на бугарски. Одговори на македонски."});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.reasons.includes("contextual_language_contamination"));
  const clean=normaliseMacedonianGeneratedText(bad);
  assert.match(clean,/Разбирам\. Ќе ви одговорам/u);
});


test("canonical release verdict blocks the real employment-definition garbage before another model call",()=>{
  const bad=[
    "Наименование — Договорот опишува договорените услови помеѓуз работникот и работодавачот за ажурирање на рани работни облага.",
    "Времетраење — Фиксно или непостојно, со можни изминливи датум.",
    "Начинот на исплата е нпр. по банска сметка.",
    "Точнаја деловна обврЗка треба да се извлече од деловните написи.",
    "Договорот мора да е саответен закон и да е оценет за правопризнателството."
  ].join(" ");
  const verdict=macedonianReleaseVerdict(bad,{userText:"Што е договор за вработување?"});
  assert.equal(verdict.verdict,"BLOCK",JSON.stringify(verdict));
  assert.equal(verdict.severity,"severe");
  assert.equal(verdict.gateVersion,MACEDONIAN_RELEASE_GATE_VERSION);
});

test("single repairable contamination can be cleaned and then released",()=>{
  const bad="Податоците се доступни во официјалниот извор.";
  const first=macedonianReleaseVerdict(bad,{userText:"Одговори на македонски."});
  assert.equal(first.verdict,"REPAIR",JSON.stringify(first));
  const clean=normaliseMacedonianGeneratedText(bad);
  assert.match(clean,/достапни/u);
  const final=macedonianReleaseVerdict(clean,{userText:"Одговори на македонски."});
  assert.equal(final.verdict,"RELEASE",JSON.stringify(final));
});

test("clean concise Macedonian is released by V9 canonical gate",()=>{
  const clean="Договорот за вработување ги уредува правата и обврските на работникот и работодавачот. За тековните законски услови треба да се провери важечкиот Закон за работните односи.";
  const verdict=macedonianReleaseVerdict(clean,{userText:"Што е договор за вработување?"});
  assert.equal(verdict.verdict,"RELEASE",JSON.stringify(verdict));
  assert.equal(MACEDONIAN_RELEASE_GATE_VERSION,"FREE_MK_CANONICAL_RELEASE_V6");
});


test("valid standard Macedonian 'обврска/обврски' is not falsely rejected",()=>{
  const clean="Договорот создава права и обврски. Секоја договорна обврска треба да биде јасно определена.";
  const check=assessMacedonianOutput(clean,{userText:"Одговори на македонски."});
  assert.equal(check.ok,true,JSON.stringify(check));
  const verdict=macedonianReleaseVerdict(clean,{userText:"Што е договорна обврска?"});
  assert.equal(verdict.verdict,"RELEASE",JSON.stringify(verdict));
});

test("contextual garbage from the production employment answer is blocked even when individual words look Cyrillic",()=>{
  const bad="Работни облага, корпорални документи, времена за радост, сочетост со закона и године власни.";
  const check=assessMacedonianOutput(bad,{userText:"Што е договор за вработување?"});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.ok(check.reasons.includes("contextual_language_contamination"));
  const verdict=macedonianReleaseVerdict(bad,{userText:"Што е договор за вработување?"});
  assert.equal(verdict.verdict,"BLOCK",JSON.stringify(verdict));
});


test("canonical release blocks the full live FREE hybrid-language failure pattern",()=>{
  const bad=[
    "Наименование — договорени услови помеѓуз работникот и работодавачот за работни облага.",
    "Времетраење — фиксно или непостојно.",
    "Описание за заштита со безубедни финансиски инфу.",
    "Точнаја деловна обврЗка и платеное статус.",
    "Сочетост со закона и године власни."
  ].join("\n");
  const check=assessMacedonianOutput(bad,{userText:"Што е договор за вработување?"});
  const release=macedonianReleaseVerdict(bad,{userText:"Што е договор за вработување?"});
  assert.equal(check.ok,false,JSON.stringify(check));
  assert.equal(release.verdict,"BLOCK",JSON.stringify(release));
});

test("valid Macedonian 'обврска/обврски' remains valid",()=>{
  const good="Договорот ги уредува правата и обврските на работникот и работодавачот.";
  const check=assessMacedonianOutput(good,{userText:"Објасни ми на македонски."});
  assert.equal(check.ok,true,JSON.stringify(check));
  assert.equal(macedonianReleaseVerdict(good,{userText:"Објасни ми на македонски."}).verdict,"RELEASE");
});


test("language-only contamination is a QA warning, not a functional block",()=>{
  const bad="Ево на примерен нацрт на тужба со едно нецелосно наименование.";
  const delivery=macedonianDeliveryVerdict(bad,{userText:"Изработи тужба на македонски."});
  assert.equal(delivery.deliver,true,JSON.stringify(delivery));
  assert.equal(delivery.legalSafetyBlock,false);
  assert.ok(["verified_runtime","released_with_language_warning"].includes(delivery.state));
  assert.ok(delivery.text.length>0);
});

test("unrequested foreign-jurisdiction substitution remains a legal-safety block",()=>{
  const bad="Применете Български закон за наследство и проверете во Народен парламент.";
  const delivery=macedonianDeliveryVerdict(bad,{userText:"Анализирај наследување во Северна Македонија."});
  assert.equal(delivery.deliver,false,JSON.stringify(delivery));
  assert.equal(delivery.legalSafetyBlock,true);
  assert.equal(delivery.state,"blocked_foreign_jurisdiction");
});
