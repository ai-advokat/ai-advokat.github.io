// Runtime language contract for Macedonian-facing AI output.
// Normative basis: "Правопис на македонскиот јазик", second edition, Skopje, 2017.
// This module encodes a concise operational guard; it does not reproduce the publication.

export const MACEDONIAN_LANGUAGE_STANDARD_VERSION="MK_ORTHOGRAPHY_2017_RUNTIME_V1";

export const MACEDONIAN_2017_SYSTEM_RULES=[
  "LANGUAGE CONTRACT — MACEDONIAN 2017.",
  "When the user writes in Macedonian or explicitly requests Macedonian, answer exclusively in standard literary Macedonian, following the 2017 Правопис на македонскиот јазик.",
  "Use Macedonian grammar, syntax, legal terminology and the Macedonian Cyrillic alphabet. Do not mix Serbian, Bulgarian, Russian, Croatian or other neighbouring-language forms into the answer.",
  "Do not use non-Macedonian Cyrillic letters such as ъ, ы, э, ё, ю, я, й, ь, щ, ђ or ћ in Macedonian prose.",
  "Prefer natural Macedonian legal forms such as постапка, решение, подносител, барање, полномошно, правна основа and човечка проверка where context requires them.",
  "Foreign brands, technical identifiers, API paths, file names, statutory citation labels and genuinely verbatim source quotations may remain unchanged when necessary; otherwise transcribe foreign names and terms according to Macedonian orthography.",
  "If a foreign-language source is relevant, explain it in Macedonian and clearly distinguish any short verbatim quotation from your own prose.",
  "For a North Macedonian legal matter, never substitute Bulgarian, Serbian, Russian or another foreign law unless the user explicitly asks for that jurisdiction and the supplied governed sources support it.",
  "If the controlling North Macedonian law is not established by the supplied governed sources, say that verification is required instead of importing a neighbouring jurisdiction.",
  "Before returning the answer, silently self-check grammar, syntax and terminology and rewrite any Serbian, Bulgarian or Russian forms into standard literary Macedonian. Do not mention this self-check to the user."
].join("\n");

const FOREIGN_CYRILLIC_RE=/[ЂђЋћЪъЫыЭэЁёЮюЯяЙйЬьЩщ]/gu;

const FOREIGN_LEXEMES=new Set([
  "поступак","поступку","поступци","подносилац","тужилац","захтев","захтеви","решење","решења",
  "документы","сведения","следует","является","которые","заявление","всего",
  "становище","искане","следва","обжалвайте","пуномоќ"
]);

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
  return ["што","кој","која","дали","треба","може","сакам","замолувам","направи","право","закон","суд","македонски"]
    .some(w=>words.has(w));
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
  const reasons=[];
  if(foreignChars.length) reasons.push("foreign_cyrillic_letters");
  if(foreignLexemes.length) reasons.push("foreign_lexical_contamination");
  if(jurisdictionLeaks.length) reasons.push("foreign_jurisdiction_substitution");
  return {
    ok:reasons.length===0,
    reasons,
    foreignChars:[...new Set(foreignChars)].slice(0,12),
    foreignLexemes:foreignLexemes.slice(0,12),
    jurisdictionLeaks:jurisdictionLeaks.slice(0,8),
    standardVersion:MACEDONIAN_LANGUAGE_STANDARD_VERSION
  };
}

export function buildMacedonianRepairMessages({text,userText=""}={}){
  return [
    {
      role:"system",
      content:[
        MACEDONIAN_2017_SYSTEM_RULES,
        "",
        "You are a language-quality repair pass, not a new legal analyst.",
        "Rewrite the supplied draft into correct standard literary Macedonian only.",
        "Preserve the meaning, factual claims, dates, numbers, party names, parcel/case identifiers, headings and citation markers exactly unless a word itself is foreign-language contamination.",
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
