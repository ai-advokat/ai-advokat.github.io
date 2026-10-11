// AI Advokat — reviewed derived article representations.
//
// Raw D1 article records remain immutable/source-faithful. This module exposes a
// separate reviewed representation only when the exact governed source
// fingerprint and expected source markers match. A reviewed representation is
// NOT a current-law promotion and never changes Human Gate state.

export const REVIEWED_ARTICLE_REPRESENTATIONS_AS_OF = "2026-10-11";
export const ZI_REVIEWED_SOURCE = Object.freeze({
  url:"https://portal.mdt.gov.mk/post-body-files/zakoni-izvrsuvanje-file-zhwP.pdf",
  sha256:"15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55"
});

export const REVIEWED_ARTICLE_REPRESENTATIONS = Object.freeze([
  Object.freeze({
    id:"mk:zi:art:4:reviewed-derived:v1",
    instrumentKey:"mk:zi",
    articleNumber:"4",
    derivationKind:"editorial_suffix_removed",
    sourcePage:1,
    reviewedText:"Извршувањето заради остварување на парично побарување ќе се спроведе во обем што е потребен за намирување на тоа побарување.",
    rawMarkerRequired:"Редакциски пречистениот текст на Законот за извршување ги опфаќа:",
    representationReviewState:"reviewed_structure",
    legalCurrencyState:"pending_current_gate"
  }),
  Object.freeze({
    id:"mk:zi:art:104:reviewed-derived:v1",
    instrumentKey:"mk:zi",
    articleNumber:"104",
    derivationKind:"next_article_heading_removed",
    sourcePage:49,
    reviewedText:"(1) За пописот и процената извршителот составува записник.\n(2) Во записникот, покрај другото, посебно се назначуваат поединечно попишаните предмети, нивната проценета вредност, изјавите од странките и од учесниците во постапката, како и изјавите од трети лица за постоењето на права што го спречуваат извршувањето.\n(3) Записникот за извршен попис на подвижни предмети со вредност поголема од 1.000 евра, задолжително се доставува до Заложниот регистар заради упис на заложното право.",
    rawMarkerRequired:"Забелешка наместо попис",
    representationReviewState:"reviewed_structure",
    legalCurrencyState:"pending_current_gate"
  }),
  Object.freeze({
    id:"mk:zi:art:269:reviewed-derived:v1",
    instrumentKey:"mk:zi",
    articleNumber:"269",
    derivationKind:"official_amendment_applied_and_editorial_suffix_removed",
    sourcePage:96,
    reviewedText:"Овој закон влегува во сила осмиот ден од денот на објавувањето во „Службен весник на Република Македонија“ а ќе започне да се применува од 1 јануари 2017 година.",
    rawMarkerRequired:"*Членот 269 е изменет, види:",
    basePhraseRequired:"по четири месеци од денот на неговото влегување во сила",
    amendmentReplacement:"од 1 јануари 2017 година",
    amendmentGazetteIssue:"142/2016",
    amendmentSourceUrl:"https://www.slvesnik.com.mk/Issues/6f8d996e802342e0ae27878062c8ecff.pdf",
    appliesFrom:"2016-08-01",
    representationReviewState:"reviewed_structure_and_amendment_derivation",
    legalCurrencyState:"pending_current_gate"
  })
]);

function normalizeArticleNumber(value){
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("mk")
    .replace(/[–—−‑]/g,"-")
    .replace(/\s+/g,"");
}

function countOccurrences(text,needle){
  if(!needle) return 0;
  let count=0;
  let pos=0;
  while((pos=text.indexOf(needle,pos))>=0){
    count++;
    pos+=needle.length;
  }
  return count;
}

function publicRepresentation(rule){
  return {
    id:rule.id,
    derivationKind:rule.derivationKind,
    representationReviewState:rule.representationReviewState,
    legalCurrencyState:rule.legalCurrencyState,
    reviewedAsOf:REVIEWED_ARTICLE_REPRESENTATIONS_AS_OF,
    sourcePage:rule.sourcePage,
    sourceUrl:ZI_REVIEWED_SOURCE.url,
    sourceSha256:ZI_REVIEWED_SOURCE.sha256,
    amendmentGazetteIssue:rule.amendmentGazetteIssue || null,
    amendmentSourceUrl:rule.amendmentSourceUrl || null,
    rawSourcePreserved:true,
    currentLawAuthority:false,
    humanGateApproved:false
  };
}

export function reviewedArticleRepresentation(instrumentKey,article,{referenceDate=null}={}){
  if(!article || typeof article!=="object") return null;
  const number=normalizeArticleNumber(
    article.articleNumberNormalized || article.articleNumber || article.article_number_normalized || article.article_number
  );
  const rule=REVIEWED_ARTICLE_REPRESENTATIONS.find(
    x=>x.instrumentKey===String(instrumentKey || "") && normalizeArticleNumber(x.articleNumber)===number
  );
  if(!rule) return null;

  // Exact provenance binding. Never apply a derived representation to a
  // different source revision or an unknown source.
  if(String(article.sourceUrl || article.source_url || "")!==ZI_REVIEWED_SOURCE.url) return null;
  if(String(article.sourceSha256 || article.source_sha256 || "").toLowerCase()!==ZI_REVIEWED_SOURCE.sha256) return null;

  if(rule.appliesFrom && referenceDate && referenceDate<rule.appliesFrom) return null;

  const raw=String(article.text ?? article.article_text ?? "");
  if(!raw || !raw.includes(rule.rawMarkerRequired)) return null;
  if(countOccurrences(raw,rule.rawMarkerRequired)!==1) return null;

  if(rule.basePhraseRequired){
    if(countOccurrences(raw,rule.basePhraseRequired)!==1) return null;
  }

  return {
    ...publicRepresentation(rule),
    reviewedText:rule.reviewedText
  };
}

export function attachReviewedArticleRepresentation(instrumentKey,article,{referenceDate=null}={}){
  if(!article || typeof article!=="object") return article;
  const reviewed=reviewedArticleRepresentation(instrumentKey,article,{referenceDate});
  if(!reviewed) return {
    ...article,
    reviewedText:null,
    reviewedRepresentation:null
  };
  return {
    ...article,
    reviewedText:reviewed.reviewedText,
    reviewedRepresentation:{
      id:reviewed.id,
      derivationKind:reviewed.derivationKind,
      representationReviewState:reviewed.representationReviewState,
      legalCurrencyState:reviewed.legalCurrencyState,
      reviewedAsOf:reviewed.reviewedAsOf,
      sourcePage:reviewed.sourcePage,
      sourceUrl:reviewed.sourceUrl,
      sourceSha256:reviewed.sourceSha256,
      amendmentGazetteIssue:reviewed.amendmentGazetteIssue,
      amendmentSourceUrl:reviewed.amendmentSourceUrl,
      rawSourcePreserved:reviewed.rawSourcePreserved,
      currentLawAuthority:reviewed.currentLawAuthority,
      humanGateApproved:reviewed.humanGateApproved
    }
  };
}

export function articleTextForLegalSynthesis(article){
  return String(article?.reviewedText || article?.text || article?.article_text || "");
}
