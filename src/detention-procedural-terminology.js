export const DETENTION_PROCEDURAL_TERMINOLOGY_VERSION="AI_ADVOCAT_DETENTION_PROCEDURAL_TERMINOLOGY_V2";

export const ZKP_JUDGMENT_TYPE_TAXONOMY=Object.freeze([
  Object.freeze({label:"одбивателна пресуда",disposition:"обвинението се одбива",article:"402"}),
  Object.freeze({label:"ослободителна пресуда",disposition:"обвинетиот се ослободува од обвинението",article:"403"}),
  Object.freeze({label:"осудителна пресуда",disposition:"обвинетиот се огласува за виновен",article:"404"})
]);

export const DETENTION_PROCEDURAL_TERMINOLOGY_EVIDENCE=Object.freeze({
  instrument:"Закон за кривичната постапка",
  officialGazette:"Службен весник на Република Македонија бр. 150/2010",
  ldbisLawId:20679,
  verifiedOn:"2026-11-05",
  sourceStatus:"official_source_verified",
  judgmentTypesArticle:"401",
  judgmentTypes:ZKP_JUDGMENT_TYPE_TAXONOMY,
  provisions:Object.freeze([
    Object.freeze({article:"169",rule:"решение за притвор / решение со кое се определува притвор"}),
    Object.freeze({article:"172",rule:"решение за определување, продолжување или укинување на притвор"}),
    Object.freeze({article:"173",rule:"притворот се укинува со решение"}),
    Object.freeze({article:"174",rule:"посебно решение за определување, продолжување или укинување на притвор по објавување на пресудата"})
  ]),
  boundary:"Во домашната кривична постапка законските видови пресуди се одбивателна, ослободителна и осудителна пресуда. Во притворскиот контекст пресудата може да биде релевантна како посебен процесен акт или процесна фаза, но актот со кој се определува, продолжува или укинува притвор е решение."
});

function norm(v){
  return String(v||"").normalize("NFKC");
}

export function isDetentionContext(userText){
  const q=norm(userText).toLocaleLowerCase("mk");
  return /(?:притвор|куќен притвор|лишување од слобода)/u.test(q);
}

const CYRILLIC_WORD_START="(?<![\\p{L}\\p{N}_])";
const CYRILLIC_WORD_END="(?=$|[^\\p{L}\\p{N}_])";

const DIRECT_REPLACEMENTS=Object.freeze([
  [new RegExp("(^|\\n)(\\s*(?:\\d+\\.?\\s*)?)поддржувачки пресуди"+CYRILLIC_WORD_END,"giu"),"$1$2Поддржувачка судска практика"],
  [new RegExp("(^|\\n)(\\s*(?:\\d+\\.?\\s*)?)(?:спротивни|неповолни|непретерани) пресуди"+CYRILLIC_WORD_END,"giu"),"$1$2Спротивна судска практика"],
  [new RegExp(CYRILLIC_WORD_START+"пресуда за определување(?: на)? притвор(?:от)?"+CYRILLIC_WORD_END,"giu"),"решение за определување притвор"],
  [new RegExp(CYRILLIC_WORD_START+"пресуда за продолжување(?: на)? притвор(?:от)?"+CYRILLIC_WORD_END,"giu"),"решение за продолжување на притворот"],
  [new RegExp(CYRILLIC_WORD_START+"пресуда за укинување(?: на)? притвор(?:от)?"+CYRILLIC_WORD_END,"giu"),"решение за укинување на притворот"],
  [new RegExp(CYRILLIC_WORD_START+"пресуди за определување(?: на)? притвор(?:от)?"+CYRILLIC_WORD_END,"giu"),"решенија за определување притвор"],
  [new RegExp(CYRILLIC_WORD_START+"пресуди за продолжување(?: на)? притвор(?:от)?"+CYRILLIC_WORD_END,"giu"),"решенија за продолжување на притворот"],
  [new RegExp(CYRILLIC_WORD_START+"пресуди за укинување(?: на)? притвор(?:от)?"+CYRILLIC_WORD_END,"giu"),"решенија за укинување на притворот"],
  [new RegExp(CYRILLIC_WORD_START+"жалба против пресудата за притвор"+CYRILLIC_WORD_END,"giu"),"жалба против решението за притвор"],
  [new RegExp(CYRILLIC_WORD_START+"пресудата со која се (определува|продолжува|укинува) притвор(?:от)?"+CYRILLIC_WORD_END,"giu"),(_m,verb)=>"решението со кое се "+verb+" притворот"],
  [new RegExp(CYRILLIC_WORD_START+"пресуда со која се (определува|продолжува|укинува) притвор(?:от)?"+CYRILLIC_WORD_END,"giu"),(_m,verb)=>"решение со кое се "+verb+" притворот"]
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
  new RegExp(CYRILLIC_WORD_START+"пресуда за (?:определување|продолжување|укинување)(?: на)? притвор(?:от)?"+CYRILLIC_WORD_END,"iu"),
  new RegExp(CYRILLIC_WORD_START+"пресуди за (?:определување|продолжување|укинување)(?: на)? притвор(?:от)?"+CYRILLIC_WORD_END,"iu"),
  new RegExp(CYRILLIC_WORD_START+"пресуд(?:а|ата) со која се (?:определува|продолжува|укинува) притвор(?:от)?"+CYRILLIC_WORD_END,"iu"),
  new RegExp(CYRILLIC_WORD_START+"жалба против пресудата за притвор"+CYRILLIC_WORD_END,"iu"),
  new RegExp("(^|\\n)\\s*(?:\\d+\\.?\\s*)?(?:поддржувачки|спротивни|неповолни|непретерани) пресуди"+CYRILLIC_WORD_END,"imu")
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
