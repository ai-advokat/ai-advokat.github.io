// AI Advokat — governed article-level legal-status overlays.
//
// These notices do not rewrite statutory text and do not infer legal effect.
// They surface separately verified procedural/legal-status facts that are
// material to professional reliance on a particular article.

export const LEGAL_STATUS_OVERLAYS_AS_OF = "2026-10-11";

export const LEGAL_STATUS_OVERLAYS = Object.freeze([
  Object.freeze({
    id: "mk:zi:art:218:constitutional-review:u-86-2025",
    instrumentKey: "mk:zi",
    articleNumber: "218",
    type: "pending_constitutional_review",
    caseNumber: "U.br.86/2025",
    initiatedOn: "2026-01-21",
    asOf: LEGAL_STATUS_OVERLAYS_AS_OF,
    sourceUrl: "https://ustavensud.mk/2026/01/%D1%83-%D0%B1%D1%80-86-2025/",
    legalEffect: "none_identified",
    humanGateRequired: true,
    warningMk: "Член 218 е предмет на поведена постапка пред Уставниот суд (У.бр.86/2025, 21.01.2026). До 11.10.2026 не е идентификувана конечна одлука со која одредбата е укината или поништена. Проверете го најновиот официјален статус пред професионално потпирање.",
    warningEn: "Article 218 is under pending Constitutional Court review (U.br.86/2025, initiated 21 January 2026). As of 11 October 2026, no final decision repealing or annulling the provision has been identified. Verify the latest official status before professional reliance."
  })
]);

function normalizeArticleNumber(value){
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("mk")
    .replace(/[–—−‑]/g,"-")
    .replace(/\s+/g,"");
}

function publicOverlay(overlay,{referenceDate=null}={}){
  const futureReference=Boolean(referenceDate && referenceDate>overlay.asOf);
  return {
    id:overlay.id,
    type:overlay.type,
    caseNumber:overlay.caseNumber,
    initiatedOn:overlay.initiatedOn,
    statusAsOf:overlay.asOf,
    sourceUrl:overlay.sourceUrl,
    legalEffect:overlay.legalEffect,
    humanGateRequired:overlay.humanGateRequired,
    warningMk:futureReference
      ? overlay.warningMk+" Наведениот референтен датум е по датумот на последната проверка; статусот за тој иден датум не е потврден."
      : overlay.warningMk,
    warningEn:futureReference
      ? overlay.warningEn+" The requested reference date is later than the last verification date; status for that future date is not verified."
      : overlay.warningEn,
    futureReferenceUnverified:futureReference
  };
}

export function legalStatusOverlaysForArticle(instrumentKey,articleNumber,{referenceDate=null}={}){
  const key=String(instrumentKey || "");
  const number=normalizeArticleNumber(articleNumber);
  return LEGAL_STATUS_OVERLAYS
    .filter(o=>o.instrumentKey===key && normalizeArticleNumber(o.articleNumber)===number)
    // A later-discovered review must not be retroactively shown for a date
    // before proceedings were initiated.
    .filter(o=>!referenceDate || referenceDate>=o.initiatedOn)
    .map(o=>publicOverlay(o,{referenceDate}));
}

export function legalStatusOverlaysForArticles(instrumentKey,articles,{referenceDate=null}={}){
  const out=[];
  const seen=new Set();
  for(const article of Array.isArray(articles)?articles:[]){
    const number=article?.articleNumberNormalized || article?.articleNumber || article?.article_number_normalized || article?.article_number;
    for(const overlay of legalStatusOverlaysForArticle(instrumentKey,number,{referenceDate})){
      if(seen.has(overlay.id)) continue;
      seen.add(overlay.id);
      out.push({...overlay,articleNumber:String(number || "")});
    }
  }
  return out;
}

export function attachLegalStatusOverlays(instrumentKey,article,{referenceDate=null}={}){
  if(!article || typeof article!=="object") return article;
  const number=article.articleNumberNormalized || article.articleNumber || article.article_number_normalized || article.article_number;
  return {
    ...article,
    legalStatusOverlays:legalStatusOverlaysForArticle(instrumentKey,number,{referenceDate})
  };
}
