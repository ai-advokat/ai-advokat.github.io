import test from "node:test";
import assert from "node:assert/strict";
import {parseLegalText,splitArticles} from "../scripts/parse-mk-legal-text.mjs";
import {classifyDocumentForIngest} from "../src/document-ingest-router.js";

const META_BASE=Object.freeze({
  instrument_key:"regression",
  instrument_title:"Regression legal instrument",
  version_id:"supplied-source-regression",
  source_url:"https://example.invalid/regression-source",
  source_sha256:"a".repeat(64),
  human_review_status:"pending"
});

const ZKP_EXCERPT=`
ЗАКОН ЗА КРИВИЧНАТА ПОСТАПКА

ОДДЕЛ А. НАЧЕЛА И ЗАКОНСКИ ИЗРАЗИ

Глава I
ОСНОВНИ НАЧЕЛА

Член 1
Цел на Законот
Овој закон ги утврдува правилата со кои се овозможува правично водење на
кривичната постапка, така што никој невин да не биде осуден, а на сторителот на
кривичното дело да му се изрече кривична санкција под условите предвидени во
Кривичниот законик и врз основа на законито спроведена постапка.

Член 2
Пресумпција на невиност
(1) Лицето обвинето за кривично дело ќе се смета за невино сè додека неговата
вина не биде утврдена со правосилна судска пресуда.
(2) Државните органи, средствата за јавно информирање и другите субјекти се
должни да се придржуваат до правилото од ставот (1) на овој член.

Член 3
Начело на законитост и пропорционалност
(1) Пред да се донесе правосилна пресуда, слободите и правата на обвинетиот и
другите лица можат да бидат ограничени само во мера која е нужна и под услови
што ги предвидуваат законските правила.
`;

const KZ_LETTERED_EXCERPT=`
КРИВИЧЕН ЗАКОНИК
(Неофицијален пречистен текст)

Член 6-а
(1) Кривичниот законик не се применува спрема малолетник кој во време на
извршување на делото не наполнил четиринаесет години.

Член 28-а
(1) Во случаите определени со закон, правното лице е одговорно за кривичното
дело сторено од одговорно лице во правното лице.

Член 38-б
(1) Судот може на сторителот на кој му изрекол казна затвор или условна осуда
да му забрани вршење определена професија или дејност.
`;

const KZ_CONSTITUTIONAL_STATUS_EXCERPT=`
КРИВИЧЕН ЗАКОНИК
(Неофицијален пречистен текст)

Член 38-г
Протерување странец од земјата
(1) Судот може на сторителот кој не е државјанин на Република Македонија да му
изрече казна протерување од земјата.
Се поништува член 38 - д од Кривичниот законик со одлука на Уставниот суд на
Република Македонија У.бр. 228/2005

Член 39
Општи правила за одмерување на казната
(1) Судот ќе му одмери казна на сторителот на кривично дело во границите што
се пропишани со закон за тоа дело.
`;

test("real supplied ZKP formatting routes to the legal-instrument lane and parses Articles 1-3",()=>{
  const route=classifyDocumentForIngest(ZKP_EXCERPT);
  assert.equal(route.route,"legal_instrument");
  assert.equal(route.currentLawVerified,false);
  assert.equal(route.humanGateRequired,true);

  const parsed=parseLegalText(ZKP_EXCERPT,{
    ...META_BASE,
    instrument_key:"zkp-supplied-regression",
    instrument_title:"Закон за кривичната постапка"
  });
  assert.equal(parsed.article_count,3);
  assert.equal(parsed.first_article,"1");
  assert.equal(parsed.last_article,"3");
  assert.deepEqual(parsed.gaps,[]);
  assert.deepEqual(parsed.records.map(x=>x.article_number_normalized),["1","2","3"]);
});

test("real supplied Criminal Code title is recognized as a legal instrument and keeps unofficial status explicit",()=>{
  const route=classifyDocumentForIngest(KZ_LETTERED_EXCERPT);
  assert.equal(route.route,"legal_instrument");
  assert.equal(route.sourceStatusHint,"unofficial_consolidated_text");
  assert.equal(route.currentLawVerified,false);
  assert.equal(route.humanGateRequired,true);
});

test("real supplied Criminal Code lettered article headers are preserved as Macedonian article identifiers",()=>{
  const articles=splitArticles(KZ_LETTERED_EXCERPT);
  assert.deepEqual(articles.map(x=>x.number),["6-а","28-а","38-б"]);
  assert.deepEqual(articles.map(x=>x.suffix),["а","а","б"]);
});

test("Constitutional Court annulment note is a stop finding and never silently rewrites article status",()=>{
  const parsed=parseLegalText(KZ_CONSTITUTIONAL_STATUS_EXCERPT,{
    ...META_BASE,
    instrument_key:"kz-unofficial-supplied-regression",
    instrument_title:"Кривичен законик",
    status:"source_text"
  });
  const finding=parsed.warnings.find(x=>x.code==="constitutional_court_status_note");
  assert.ok(finding);
  assert.equal(finding.severity,"stop");
  assert.equal(finding.article,"38-д");
  assert.match(finding.detail,/official lineage/i);
  assert.ok(parsed.records.every(x=>x.status==="source_text"));
  assert.equal(parsed.human_review_status,undefined);
});
