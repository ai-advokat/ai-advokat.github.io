export const LEGAL_RETRIEVAL_ROUTER_VERSION="AI_ADVOCAT_LEGAL_RETRIEVAL_ROUTER_R15";

function norm(value){
  return String(value||"").normalize("NFKC").toLocaleLowerCase("mk").replace(/\s+/g," ").trim();
}

export function legalRetrievalPlan(query,{guideIds=[]}={}){
  const q=norm(query);
  const exactCase=/(?:^|[^\p{L}\p{N}])([\p{L}]{1,10}[-\s]?[0-9]{2,8}\/[0-9]{2,4})(?=$|[^\p{L}\p{N}])/iu.test(String(query||""));
  const taxonomy=/(?:видов|категори).*?пресуд|пресуд.*?(?:видов|категори)/iu.test(q)
    && /(?:зкп|кривичн(?:ата|а)\s+постапк)/iu.test(q);
  const caseLaw=!taxonomy && (
    exactCase
    || /(?:судск(?:а|и)\s+практик|case\s*law|правен\s+став|прецедент|апелацион|врховен\s+суд|уставен\s+суд|конкретн(?:а|и)\s+пресуд|конкретн(?:а|и)\s+решени|спротивн(?:а|и).*?(?:практик|одлук)|поддржувачк(?:а|и).*?(?:практик|одлук))/iu.test(q)
  );
  const gazette=/(?:службен\s+весник|gazette|број\s*\d+\s*(?:\/|од)\s*(?:19|20)\d{2}|измен(?:а|и)|дополнувањ|пречистен\s+текст|важечк(?:а|и|о)\s+верзи)/iu.test(q);
  const echr=/(?:есчп|echr|hudoc|стразбур|европски\s+суд.*?човекови\s+права|човекови\s+права.*?стразбур)/iu.test(q);
  const scholarly=/(?:науч(?:ен|на|ни)|академск|литератур|доктрин|doi|студиј|трудов|библиограф)/iu.test(q);
  const authorial=/(?:зоран\s+стојан|стојанки|авторск(?:и|а)\s+(?:труд|анализ|коментар)|публикаци.*?зоран)/iu.test(q);
  const guides=Array.isArray(guideIds)&&guideIds.length>0;
  return Object.freeze({
    article:true,
    caseLaw,
    gazette,
    echr,
    scholarly,
    authorial,
    guides,
    taxonomy,
    version:LEGAL_RETRIEVAL_ROUTER_VERSION
  });
}
