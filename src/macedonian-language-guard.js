// Runtime language contract for Macedonian-facing AI output.
// Normative basis: "Правопис на македонскиот јазик", second edition, Skopje, 2017.
// This module encodes a concise operational guard; it does not reproduce the publication.

export const MACEDONIAN_LANGUAGE_STANDARD_VERSION="MK_ORTHOGRAPHY_2017_RUNTIME_V9";
export const MACEDONIAN_RELEASE_GATE_VERSION="FREE_MK_CANONICAL_RELEASE_V5";
export const MACEDONIAN_RELEASE_BLOCK_MESSAGE="AI-нацртот не ја помина задолжителната јазична проверка за стандарден македонски јазик и затоа не е објавен. Барањето не е потрошено како валиден одговор; обидете се повторно или наведете го конкретниот закон за source-first анализа.";

export const MACEDONIAN_2017_SYSTEM_RULES=[
  "PRIORITY 0 — ПРАВОПИС НА МАКЕДОНСКИОТ ЈАЗИК 2017.",
  "This block is the mandatory first language instruction for every Macedonian-facing AI Advokat response and outranks provider tendencies, retrieved-source language, specialist prompts and conversational mimicry.",
  "LANGUAGE CONTRACT — MACEDONIAN 2017.",
  "When the user writes in Macedonian, uses recognisable Macedonian Latin transliteration, or explicitly requests Macedonian, answer exclusively in standard literary Macedonian using Macedonian Cyrillic, following the 2017 Правопис на македонскиот јазик.",
  "Use Macedonian grammar, syntax, legal terminology and the Macedonian Cyrillic alphabet. Do not mix Serbian, Bulgarian, Russian, Croatian or hybrid neighbouring-language forms into the answer, even if the model or a retrieved source tends toward them.",
  "Do not use non-Macedonian Cyrillic letters such as ъ, ы, э, ё, ю, я, й, ь, щ, ђ or ћ in Macedonian prose.",
  "Prefer natural Macedonian legal forms such as постапка, решение, подносител, тужител, тужен, тужба, барање, надомест на штета, правен лек, трошоци на постапката, полномошно, правна основа and човечка проверка where context requires them.",
  "In Macedonian legal prose do not use Bulgarian forms such as съд, ищец, ответник, искова молба, обезщетение, съгласно, обжалване, възражение, разноски, случайни or Serbian forms such as поступак, тужилац, захтев, решење, трошкови and пуномоќ when a standard Macedonian equivalent is required.",
  "Foreign brands, technical identifiers, API paths, file names, statutory citation labels and genuinely verbatim source quotations may remain unchanged when necessary; otherwise transcribe foreign names and terms according to Macedonian orthography.",
  "If a foreign-language source is relevant, explain it in Macedonian and clearly distinguish any short verbatim quotation from your own prose.",
  "If the user reports that a previous answer was in Bulgarian, Serbian, Russian or another wrong language, treat that report as a hard language correction: regenerate the affected answer in Macedonian from the underlying task and context instead of continuing the contaminated wording.",
  "Treat invented or semantically broken forms such as 'измера' in phrases like 'измера на Република Северна...' as malformed generation, not as a synonym, spelling variant or automatic correction to 'измена'. Rewrite the whole phrase according to its actual context.",
  "Prefer ordinary standard Macedonian words over neighbouring-language calques. For example, use назив rather than наименование, and права и обврски rather than malformed forms such as обврзки/обврЗка.",
  "The standard Macedonian words обврска and обврски are valid and must not be rejected or rewritten merely because a surrounding model-generated sentence is defective.",
  "If you are uncertain whether a rare or constructed word is standard Macedonian, rewrite the sentence with simpler established Macedonian vocabulary instead of inventing a form.",
  "A Macedonian-facing answer that is predominantly Bulgarian, Serbian or Russian is invalid even if it uses Cyrillic. Cyrillic alone is never evidence that the language requirement was satisfied.",
  "For a North Macedonian legal matter, never substitute Bulgarian, Serbian, Russian or another foreign law unless the user explicitly asks for that jurisdiction and the supplied governed sources support it.",
  "If the controlling North Macedonian law is not established by the supplied governed sources, say that verification is required instead of importing a neighbouring jurisdiction.",
  "Before returning the answer, silently self-check spelling, grammar, syntax, morphology and legal terminology against standard literary Macedonian and rewrite only unambiguous Serbian, Bulgarian or Russian contamination into Macedonian. Never reject or rewrite valid Macedonian words merely because the same spelling exists in another Slavic language. If unambiguous contamination remains, the draft is invalid and must not be shown to the user. Do not mention this self-check to the user."
].join("\n");

const FOREIGN_CYRILLIC_RE=/[ЂђЋћЪъЫыЭэЁёЮюЯяЙйЬьЩщ]/gu;

const FOREIGN_LEXEMES=new Set([
  // Serbian / Croatian contamination
  "поступак","поступакот","поступку","поступци","подносилац","подносилацот","тужилац","тужилацот",
  "захтев","захтевот","захтеви","решење","решењето","решења","трошкови","трошковите",
  "надокнада","надокнадата","пуномоќ","подаци",
  // Russian contamination
  "документы","сведения","следует","является","которые","заявление","всего","информация","данные",
  // Bulgarian contamination with or without distinctive Bulgarian letters
  "становище","искане","следва","обжалвайте","трябва","моля","настоящият","същият","правосъдие","съд","съда","съдът","съдебен","съдебна","съдебно",
  "ищец","ищецът","ответник","ответникът","искова","исковата","обезщетение","обезщетението",
  "съгласно","обжалване","възражение","възражения","разноски","случайни","случаен","случайна",
  "доказателства","молител","молителя","това","тази","тези","какво","защото","когато","всички","например","ще","някой","някои","който","която","които","према","уколико","такође","овде","није",
  // Serbian/hybrid forms repeatedly observed in Macedonian-facing generations
  "доступан","доступен","доступна","доступно","доступни","доступност","доступните",
  // Common neighbouring-language calques observed in production
  "наименование","године","власни","точнаја","ево"
]);

const MALFORMED_GENERATION_LEXEMES=new Set([
  "последуствување","прикаде","приречет","нотариска","данишна","волеври","домнување","переводина","доцрат","паблицни",
  "низна","индексиот","пресуд",
  // Observed hallucinated/hybrid token. Do NOT reinterpret this as "измена".
  // In phrases such as "ИЗМЕРА НА РЕПУБЛИКА СЕВЕРНА..." the whole phrase
  // must be contextually rewritten, e.g. "за Република Северна Македонија".
  "измера","измерата",
  // Production garbage/mixed morphology: these are not acceptable Macedonian.
  "помеѓуз","обврзки","непостојно","изминливи","безубедни","разрешни","нешејствена",
  "заклјучување","растирање","навикавајте","оборажување","договоренијатие","нејасноти",
  "испорачивачки","кореспондентност","поатворено","сочетост","банок","биоки","свраним",
  "почети","одбргува","празнправ","ријекот","саответен","правопризнателството","кадринот","олностон",
  // Additional malformed / foreign-production forms observed in live FREE output.
  "облага","описание","премири","задолжености","пластираши","задовољство","оборажувања",
  "испорачивачки","договоренијатие","платеное","точнаја","власни"
]);

// Contextual phrases can be linguistically invalid even when each individual
// token exists in Macedonian. Keep these narrowly scoped to observed hybrid
// generation patterns so valid Macedonian vocabulary is not over-blocked.
const CONTEXTUAL_CONTAMINATION_PHRASES=[
  "бирото за залагање пред есчп",
  "република северна македонска",
  "под измера на",
  "измера на република северна",
  "денот на низна одлука",
  "базиски белешки",
  "просек за официјални пресуди",
  "заглавие / пресуд",
  "пресудни дела",
  "разбирај. јас ќе",
  "разбирај! јас ќе",
  "работни облага",
  "корпорални документи",
  "времена за радост",
  "точнаја деловна",
  "сочетост со закона",
  "године власни",
  "платеное статус",
  "заарендни записи",
  "месечното платено",
  "тело работникот",
  "фискална кореспондентност",
  "земна/мпз",
  "правопризнателството"
];

const FOREIGN_JURISDICTION_PHRASES=[
  "български закон",
  "народен парламент",
  "закон на република србија",
  "руската федерација"
];

function normalizeWords(value){
  return String(value||"")
    .normalize("NFKC")
    .toLocaleLowerCase("mk")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function shouldEnforceMacedonianOutput(userText){
  const raw=String(userText||"").normalize("NFKC");
  const lower=raw.toLocaleLowerCase("mk");
  if(/(?:^|\s)(?:на|во)\s+(?:англиски|албански|српски|бугарски|руски|германски|француски)(?:\s|$)/u.test(lower)
     && !/(?:^|\s)(?:на|во)\s+македонски(?:\s|$)/u.test(lower)){
    return false;
  }
  if(/(?:^|\s)(?:на|во)\s+македонски(?:\s|$)/u.test(lower)) return true;
  if(/[ЃѓЌќЅѕ]/u.test(raw)) return true;
  const letters=(raw.match(/[\p{L}]/gu)||[]).length;
  const cyrillic=(raw.match(/[\p{Script=Cyrillic}]/gu)||[]).length;
  if(cyrillic>=4 && cyrillic>=letters*0.55) return true;
  const words=new Set(normalizeWords(raw));
  if(["што","кој","која","дали","треба","може","сакам","замолувам","направи","изработи","тужба","право","закон","суд","македонски"]
    .some(w=>words.has(w))) return true;

  const latin=lower
    .replace(/[^a-z0-9]+/g," ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const latinWords=new Set(latin);
  return ["sto","koj","koja","dali","treba","moze","sakam","napravi","izraboti","tuzba","nadomest","steta","zakon","sud","makedonski","drugar"]
    .some(w=>latinWords.has(w));
}

export function assessMacedonianOutput(text,{userText=""}={}){
  const value=String(text||"").normalize("NFKC");
  const words=new Set(normalizeWords(value));
  const foreignChars=[...value.matchAll(FOREIGN_CYRILLIC_RE)].map(m=>m[0]);
  const foreignLexemes=[...FOREIGN_LEXEMES].filter(w=>words.has(w));
  const q=String(userText||"").normalize("NFKC").toLocaleLowerCase("mk");
  const foreignJurisdictionRequested=/(бугар|срби|руси|bulgar|serbia|russia)/iu.test(q);
  const lower=value.toLocaleLowerCase("mk");
  const jurisdictionLeaks=foreignJurisdictionRequested
    ? []
    : FOREIGN_JURISDICTION_PHRASES.filter(p=>lower.includes(p));
  const malformedGeneration=[...MALFORMED_GENERATION_LEXEMES].filter(w=>words.has(w));
  const contextualContamination=CONTEXTUAL_CONTAMINATION_PHRASES.filter(p=>lower.includes(p));
  const rawTokens=value.match(/[\p{L}\p{N}_-]+/gu)||[];
  const mixedScriptTokens=rawTokens.filter(token=>
    /\p{Script=Cyrillic}/u.test(token) && /[A-Za-z]/u.test(token)
  );
  const internalCaseAnomalies=rawTokens.filter(token=>{
    if(/[A-Za-z]/u.test(token) || !/\p{Script=Cyrillic}/u.test(token)) return false;
    const letters=[...token].filter(ch=>/\p{L}/u.test(ch));
    if(letters.length<2) return false;
    const first=letters[0];
    return /\p{Ll}/u.test(first) && letters.slice(1).some(ch=>/\p{Lu}/u.test(ch));
  });
  const structuralAnomalies=[...new Set([...mixedScriptTokens,...internalCaseAnomalies])].slice(0,12);
  const reasons=[];
  if(foreignChars.length) reasons.push("foreign_cyrillic_letters");
  if(foreignLexemes.length) reasons.push("foreign_lexical_contamination");
  if(jurisdictionLeaks.length) reasons.push("foreign_jurisdiction_substitution");
  if(malformedGeneration.length) reasons.push("malformed_macedonian_generation");
  if(contextualContamination.length) reasons.push("contextual_language_contamination");
  if(structuralAnomalies.length) reasons.push("malformed_token_shape");
  return {
    ok:reasons.length===0,
    reasons,
    foreignChars:[...new Set(foreignChars)].slice(0,12),
    foreignLexemes:foreignLexemes.slice(0,12),
    jurisdictionLeaks:jurisdictionLeaks.slice(0,8),
    malformedGeneration:malformedGeneration.slice(0,12),
    contextualContamination:contextualContamination.slice(0,12),
    structuralAnomalies,
    standardVersion:MACEDONIAN_LANGUAGE_STANDARD_VERSION
  };
}

export function macedonianReleaseVerdict(text,{userText=""}={}){
  if(!shouldEnforceMacedonianOutput(userText)){
    return {verdict:"RELEASE",severity:"not_applicable",assessment:null,problems:[],gateVersion:MACEDONIAN_RELEASE_GATE_VERSION};
  }
  const assessment=assessMacedonianOutput(text,{userText});
  const value=String(text||"").normalize("NFKC");
  const words=normalizeWords(value);
  const simpleDefinition=/^(?:што\s+е|што\s+значи|објасни(?:\s+ми)?|дефинирај)\b/iu.test(String(userText||"").trim());
  const lines=value.split(/\r?\n/).filter(line=>line.trim()).length;
  const tableLike=(value.match(/[—–|]/g)||[]).length;
  const styleProblems=[];
  if(simpleDefinition && words.length>120) styleProblems.push("simple_definition_overlong");
  if(simpleDefinition && (lines>10 || tableLike>6)) styleProblems.push("simple_definition_overstructured");

  if(assessment.ok && styleProblems.length===0){
    return {verdict:"RELEASE",severity:"clean",assessment,problems:[],gateVersion:MACEDONIAN_RELEASE_GATE_VERSION};
  }

  const contaminationCount=
    Number(assessment.foreignChars?.length||0)+
    Number(assessment.foreignLexemes?.length||0)+
    Number(assessment.malformedGeneration?.length||0)+
    Number(assessment.contextualContamination?.length||0)+
    Number(assessment.structuralAnomalies?.length||0);

  const severe=
    Number(assessment.structuralAnomalies?.length||0)>0 ||
    Number(assessment.malformedGeneration?.length||0)>=2 ||
    Number(assessment.foreignChars?.length||0)>=2 ||
    Number(assessment.reasons?.length||0)>=2 ||
    contaminationCount>=3;

  return {
    verdict:severe?"BLOCK":"REPAIR",
    severity:severe?"severe":"repairable",
    assessment,
    problems:styleProblems,
    gateVersion:MACEDONIAN_RELEASE_GATE_VERSION
  };
}



const DETERMINISTIC_LEXICAL_REPLACEMENTS=[
  // Real-world hybrid-output repair patterns observed in production.
  ["измера на република северна македонија","за Република Северна Македонија"],
  ["под измера на република северна македонија","за Република Северна Македонија"],
  ["измера на република северна македонска","за Република Северна Македонија"],
  ["под измера на република северна македонска","за Република Северна Македонија"],
  ["просек за официјални пресуди","Преглед на официјални пресуди"],
  ["под измера на","за"],
  ["измера на република северна","за Република Северна"],
  ["република северна македонска","Република Северна Македонија"],
  ["бирото за залагање пред есчп","Бирото за застапување пред ЕСЧП"],
  ["денот на низна одлука","датумот на одлуката"],
  ["базиски белешки","Основни белешки"],
  ["заглавие / пресуд","Предмет / пресуда"],
  ["пресудни дела","пресуди и одлуки"],
  ["доступните","достапните"],
  ["доступност","достапност"],
  ["доступни","достапни"],
  ["доступен","достапен"],
  ["доступна","достапна"],
  ["доступно","достапно"],
  ["индексиот","индексот"],
  ["ево на примерен","Еве примерен"],
  ["ево на пример","Еве пример"],
  ["ево","еве"],
  ["разбирај. јас ќе","Разбирам. Ќе"],
  ["разбирај! јас ќе","Разбирам. Ќе"],
  ["наименование","назив"],
  ["обврзки","обврски"],
  ["саответен","соодветен"],
  ["банска сметка","банкарска сметка"],
  ["искова молба","тужба"],
  ["обезщетението","надоместот на штета"],
  ["обезщетение","надомест на штета"],
  ["съгласно","согласно"],
  ["обжалвайте","поднесете жалба"],
  ["обжалване","жалба"],
  ["възражения","приговори"],
  ["възражение","приговор"],
  ["разноски","трошоци"],
  ["случайни","случајни"],
  ["случаен","случаен"],
  ["случайна","случајна"],
  ["съдебен","судски"],
  ["съдебна","судска"],
  ["съдебно","судско"],
  ["съдът","судот"],
  ["съда","судот"],
  ["съд","суд"],
  ["ищецът","тужителот"],
  ["ищец","тужител"],
  ["ответникът","тужениот"],
  ["ответник","тужен"],
  ["доказателства","докази"],
  ["молителя","подносителот"],
  ["молител","подносител"],
  ["поступакот","постапката"],
  ["поступку","постапката"],
  ["поступци","постапки"],
  ["поступак","постапка"],
  ["подносилацот","подносителот"],
  ["подносилац","подносител"],
  ["тужилацот","тужителот"],
  ["тужилац","тужител"],
  ["захтевот","барањето"],
  ["захтеви","барања"],
  ["захтев","барање"],
  ["решењето","решението"],
  ["решења","решенија"],
  ["решење","решение"],
  ["трошковите","трошоците"],
  ["трошкови","трошоци"],
  ["надокнадата","надоместот"],
  ["надокнада","надомест"],
  ["пуномоќ","полномошно"],
  ["подаци","податоци"],
  ["информация","информација"],
  ["данные","податоци"],
  ["документы","документи"],
  ["сведения","податоци"],
  ["следует","треба"],
  ["является","е"],
  ["которые","кои"],
  ["заявление","барање"],
  ["всего","вкупно"],
  ["трябва","треба"],
  ["моля","ве молам"],
  ["настоящият","овој"],
  ["същият","истиот"],
  ["правосъдие","правосудство"],
  ["становище","мислење"],
  ["искане","барање"],
  ["следва","треба"],
  ["това","ова"],
  ["тази","оваа"],
  ["тези","овие"],
  ["какво","што"],
  ["защото","затоа што"],
  ["когато","кога"],
  ["всички","сите"],
  ["например","на пример"],
  ["ще","ќе"],
  ["някой","некој"],
  ["някои","некои"],
  ["който","кој"],
  ["която","која"],
  ["които","кои"],
  ["према","според"],
  ["уколико","доколку"],
  ["такође","исто така"],
  ["није","не е"]
];

function preserveInitialCase(match,replacement){
  if(!match) return replacement;
  const first=match[0];
  if(first===first.toLocaleUpperCase("mk") && first!==first.toLocaleLowerCase("mk")){
    return replacement.charAt(0).toLocaleUpperCase("mk")+replacement.slice(1);
  }
  return replacement;
}

function escapeRegex(value){
  return String(value).replace(/[.*+?^$(){}|[\]\\]/g,"\\$&");
}

export function normaliseMacedonianGeneratedText(text){
  let value=String(text||"").normalize("NFKC");
  for(const [from,to] of DETERMINISTIC_LEXICAL_REPLACEMENTS){
    const re=new RegExp("(^|[^\\p{L}])("+escapeRegex(from)+")(?=$|[^\\p{L}])","giu");
    value=value.replace(re,(full,prefix,word)=>prefix+preserveInitialCase(word,to));
  }
  const charMap=new Map([
    ["Ђ","Ѓ"],["ђ","ѓ"],["Ћ","Ќ"],["ћ","ќ"],
    ["Й","Ј"],["й","ј"],["Ы","И"],["ы","и"],["Э","Е"],["э","е"],
    ["Ё","Јо"],["ё","јо"],["Ю","Ју"],["ю","ју"],["Я","Ја"],["я","ја"],
    ["Щ","Шт"],["щ","шт"],["Ь",""],["ь",""],["Ъ","А"],["ъ","а"]
  ]);
  value=[...value].map(ch=>charMap.has(ch)?charMap.get(ch):ch).join("");
  return value;
}

export function buildMacedonianRepairMessages({text,userText=""}={}){
  return [
    {
      role:"system",
      content:[
        MACEDONIAN_2017_SYSTEM_RULES,
        "",
        "You are a language-quality repair pass, not a new legal analyst.",
        "МАКЕДОНСКА ЈАЗИЧНА РЕДАКЦИЈА: Препиши го нацртот на правилен стандарден литературен македонски јазик според Правописот од 2017 година.",
        "Не користи српски, бугарски, руски или хрватски форми и не создавај непостоечки македонски зборови. Исправи очигледни јазични изобличувања и печатни или морфолошки грешки.",
        "Провери ги неприродните правни форми и, кога контекстот го бара тоа, користи природни македонски облици како: постапка, поднесување, барање, решение, притвор, жалба, полномошно, подносител и правна основа.",
        "Користи едноставен и природен македонски речник. Кажи еве, не ево; назив, не наименование; права и обврски, не обврзки; банкарска сметка, не банска сметка. Не создавај нови зборови.",
        "Не користи немакедонски кирилични букви. Ако се појават такви форми, замени го целиот збор со правилен македонски еквивалент наместо механички да го пресловуваш ако тоа би го нарушило значењето.",
        "Rewrite the supplied draft into correct standard literary Macedonian only.",
        "Preserve the meaning, factual claims, dates, numbers, party names, parcel/case identifiers, headings and citation markers exactly unless a word itself is foreign-language contamination or an obvious malformed Macedonian word.",
        "Do not add new facts, laws, citations, deadlines, legal effects or recommendations.",
        "If the draft imported a foreign jurisdiction without the user requesting it, remove that foreign-law assertion and replace it with a bounded statement that the controlling North Macedonian legal source must be verified.",
        "Return only the corrected answer, with no commentary about the repair."
      ].join("\n")
    },
    {
      role:"user",
      content:[
        "USER REQUEST (context only):",
        String(userText||"").slice(0,4000),
        "",
        "DRAFT TO REPAIR:",
        String(text||"").slice(0,24000)
      ].join("\n")
    }
  ];
}
