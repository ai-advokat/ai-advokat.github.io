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
  const expected=[
    ["402",/одбивателна\s+пресуда/iu],
    ["403",/ослободителна\s+пресуда/iu],
    ["404",/осудителна\s+пресуда/iu]
  ];
  if(!byNumber.has("401")) return null;
  for(const [number,re] of expected){
    const heading=headingOf(byNumber.get(number));
    if(!heading||!re.test(heading)) return null;
  }

  const labels=expected.map(([number])=>({
    number,
    heading:headingOf(byNumber.get(number))
  }));
  const title=String(instrument?.title||"Законот за кривичната постапка");
  return [
    "Според "+title+", законските видови пресуди се:",
    "",
    ...labels.map((row,index)=>(index+1)+". "+row.heading+" — член "+row.number+"."),
    "",
    "Член 401 („Видови пресуди“) ја поставува поделбата: со пресудата обвинението се одбива, обвинетиот се ослободува од обвинението или се огласува за виновен.",
    "",
    "Изворна основа: членови 401–404 од governed ZKP corpus. Ова е source-first приказ без измислување дополнителни категории.",
    "Human Gate: пред професионално потпирање проверете ја применливата верзија на ЗКП и официјалниот извор."
  ].join("\n");
}
