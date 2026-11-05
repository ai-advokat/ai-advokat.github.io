export const DETENTION_PROCEDURAL_TERMINOLOGY_VERSION="AI_ADVOCAT_DETENTION_PROCEDURAL_TERMINOLOGY_V1";

export const DETENTION_PROCEDURAL_TERMINOLOGY_EVIDENCE=Object.freeze({
  instrument:"Закон за кривичната постапка",
  officialGazette:"Службен весник на Република Македонија бр. 150/2010",
  ldbisLawId:20679,
  verifiedOn:"2026-11-05",
  sourceStatus:"official_source_verified",
  provisions:Object.freeze([
    Object.freeze({article:"169",rule:"решение за притвор / решение со кое се определува притвор"}),
    Object.freeze({article:"172",rule:"решение за определување, продолжување или укинување на притвор"}),
    Object.freeze({article:"173",rule:"притворот се укинува со решение"}),
    Object.freeze({article:"174",rule:"посебно решение за определување, продолжување или укинување на притвор по објавување на пресудата"})
  ]),
  boundary:"Пресудата е посебен процесен акт. Во притворскиот контекст таа може да биде релевантна како процесна фаза (на пример по објавување на пресудата), но актот со кој се определува, продолжува или укинува притвор е решение."
});

function norm(v){
  return String(v||"").normalize("NFKC");
}

export function isDetentionContext(userText){
  const q=norm(userText).toLocaleLowerCase("mk");
  return /(?:притвор|куќен притвор|лишување од слобода)/u.test(q);
}

const DIRECT_REPLACEMENTS=Object.freeze([
  [/(^|\n)(\s*(?:\d+\.?\s*)?)поддржувачки пресуди\b/giu,"$1$2Поддржувачка судска практика"],
  [/(^|\n)(\s*(?:\d+\.?\s*)?)(?:спротивни|неповолни|непретерани) пресуди\b/giu,"$1$2Спротивна судска практика"],
  [/\bпресуда за определување(?: на)? притвор(?:от)?\b/giu,"решение за определување притвор"],
  [/\bпресуда за продолжување(?: на)? притвор(?:от)?\b/giu,"решение за продолжување на притворот"],
  [/\bпресуда за укинување(?: на)? притвор(?:от)?\b/giu,"решение за укинување на притворот"],
  [/\bпресуди за определување(?: на)? притвор(?:от)?\b/giu,"решенија за определување притвор"],
  [/\bпресуди за продолжување(?: на)? притвор(?:от)?\b/giu,"решенија за продолжување на притворот"],
  [/\bпресуди за укинување(?: на)? притвор(?:от)?\b/giu,"решенија за укинување на притворот"],
  [/\bжалба против пресудата за притвор\b/giu,"жалба против решението за притвор"],
  [/\bпресудата со која се (определува|продолжува|укинува) притвор(?:от)?\b/giu,(_m,verb)=>"решението со кое се "+verb+" притворот"],
  [/\bпресуда со која се (определува|продолжува|укинува) притвор(?:от)?\b/giu,(_m,verb)=>"решение со кое се "+verb+" притворот"]
]);

export function normaliseDetentionProceduralTerminology(text,{userText=""}={}){
  let out=norm(text);
  if(!isDetentionContext(userText)) return out;
  for(const [pattern,replacement] of DIRECT_REPLACEMENTS){
    out=out.replace(pattern,replacement);
  }
  return out;
}

const FORBIDDEN_PATTERNS=Object.freeze([
  /\bпресуда за (?:определување|продолжување|укинување)(?: на)? притвор(?:от)?\b/iu,
  /\bпресуди за (?:определување|продолжување|укинување)(?: на)? притвор(?:от)?\b/iu,
  /\bпресуд(?:а|ата) со која се (?:определува|продолжува|укинува) притвор(?:от)?\b/iu,
  /\bжалба против пресудата за притвор\b/iu,
  /(^|\n)\s*(?:\d+\.?\s*)?(?:поддржувачки|спротивни|неповолни|непретерани) пресуди\b/imu
]);

export function assessDetentionProceduralTerminology(text,{userText=""}={}){
  if(!isDetentionContext(userText)){
    return Object.freeze({
      ok:true,
      version:DETENTION_PROCEDURAL_TERMINOLOGY_VERSION,
      detentionContext:false,
      issues:Object.freeze([])
    });
  }
  const value=norm(text);
  const issues=[];
  for(const pattern of FORBIDDEN_PATTERNS){
    const match=value.match(pattern);
    if(match) issues.push(String(match[0]).trim().slice(0,180));
  }
  return Object.freeze({
    ok:issues.length===0,
    version:DETENTION_PROCEDURAL_TERMINOLOGY_VERSION,
    detentionContext:true,
    issues:Object.freeze([...new Set(issues)].slice(0,8))
  });
}
