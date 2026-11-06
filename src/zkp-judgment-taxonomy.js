export const ZKP_JUDGMENT_TAXONOMY_VERSION="AI_ADVOCAT_ZKP_JUDGMENT_TAXONOMY_V1";
export const ZKP_JUDGMENT_TAXONOMY_ARTICLES=Object.freeze(["401","402","403","404"]);

function norm(value){
  return String(value||"").normalize("NFKC").toLocaleLowerCase("mk").replace(/\s+/g," ").trim();
}

function numberOf(article){
  return norm(article?.articleNumberNormalized||article?.articleNumber||article?.article_number_normalized||article?.article_number||"")
    .replace(/^член\s*/u,"")
    .replace(/\s+/g,"");
}

function headingOf(article){
  return String(article?.heading||article?.article_heading||"").normalize("NFKC").trim();
}

function textOf(article){
  return String(article?.text||article?.article_text||"").normalize("NFKC").replace(/\s+/g," ").trim();
}

const JUDGMENT_DEFINITIONS=Object.freeze([
  Object.freeze({
    number:"402",
    label:"Одбивателна пресуда",
    evidence:/(?:одбивателна\s+пресуда|пресуда\s+со\s+која\s+се\s+одбива\s+обвинението)/iu
  }),
  Object.freeze({
    number:"403",
    label:"Ослободителна пресуда",
    evidence:/(?:ослободителна\s+пресуда|пресуда\s+со\s+која\s+обвинетиот\s+се\s+ослободува\s+од\s+обвинението)/iu
  }),
  Object.freeze({
    number:"404",
    label:"Осудителна пресуда",
    evidence:/(?:осудителна\s+пресуда|во\s+пресудата\s+во\s+која\s+обвинетиот\s+се\s+огласува\s+за\s+виновен)/iu
  })
]);

function statutoryEvidenceOf(article){
  return [headingOf(article),textOf(article)].filter(Boolean).join(" ");
}

export function isZkpJudgmentTaxonomyRequest(query){
  const q=norm(query);
  if(!q) return false;
  const judgment=/(?:пресуд|judgment)/u.test(q);
  const taxonomy=/(?:видов|категори|одбивателн|ослободителн|осудителн|обвинението\s+се\s+одбива|се\s+огласува\s+за\s+виновен)/u.test(q);
  return judgment&&taxonomy;
}

export function formatZkpJudgmentTaxonomyAnswer(instrument,articles){
  const rows=Array.isArray(articles)?articles:[];
  const byNumber=new Map(rows.map(a=>[numberOf(a),a]));
  const article401=byNumber.get("401");
  if(!article401) return null;

  const evidence401=statutoryEvidenceOf(article401);
  const article401Ok=/(?:видови\s+пресуди|со\s+пресудата\s+обвинението\s+се\s+одбива.*обвинетиот\s+се\s+ослободува.*се\s+огласува\s+за\s+виновен)/isu.test(evidence401);
  if(!article401Ok) return null;

  for(const definition of JUDGMENT_DEFINITIONS){
    const article=byNumber.get(definition.number);
    if(!article || !definition.evidence.test(statutoryEvidenceOf(article))) return null;
  }

  const title=String(instrument?.title||"Законот за кривичната постапка");
  return [
    "Според "+title+", законските видови пресуди се:",
    "",
    ...JUDGMENT_DEFINITIONS.map((row,index)=>(index+1)+". "+row.label+" — член "+row.number+"."),
    "",
    "Член 401 („Видови пресуди“) ја поставува поделбата: со пресудата обвинението се одбива, обвинетиот се ослободува од обвинението или се огласува за виновен.",
    "",
    "Изворна основа: членови 401–404 од governed ZKP corpus. Називите се пуштаат само ако bounded source rows содржат соодветна statutory body/heading evidence.",
    "Human Gate: пред професионално потпирање проверете ја применливата верзија на ЗКП и официјалниот извор."
  ].join("\n");
}
