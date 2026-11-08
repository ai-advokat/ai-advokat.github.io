export const FAMILY_DIVORCE_DRAFT_VERSION="AI_ADVOCAT_FAMILY_DIVORCE_DRAFT_V1";
export const FAMILY_DIVORCE_SOURCE_SNAPSHOT=Object.freeze({
  jurisdiction:"MK",
  verifiedOn:"2026-11-08",
  primaryLaw:Object.freeze({
    title:"Закон за семејството",
    consolidatedSourceUrl:"https://www.mtsp.gov.mk/content/pdf/zakoni/5.11_%D0%97%D0%B0%D0%BA%D0%BE%D0%BD%20%D0%B7%D0%B0%20%D1%81%D0%B5%D0%BC%D0%B5%D1%98%D1%81%D1%82%D0%B2%D0%BE%D1%82%D0%BE%20%28%D0%BA%D0%BE%D0%BD%D1%81%D0%BE%D0%BB%D0%B8%D0%B4%D0%B8%D1%80%D0%B0%D0%BD%20%D1%82%D0%B5%D0%BA%D1%81%D1%82%20%D0%BD%D0%BE%D0%B5%D0%BC%D0%B2%D1%80%D0%B8%202015%29.pdf",
    ldbisUrl:"https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=34057",
    latestCheckedAmendment:Object.freeze({
      gazette:"Службен весник на РСМ бр. 192/2025",
      published:"2025-09-17",
      url:"https://cms.mtsp.gov.mk/content/pdf/zakoni/zakoni_2025/z_semejstvo_192_25_mkd.pdf",
      relevantDivorceArticlesChanged:false
    })
  }),
  provisions:Object.freeze([
    Object.freeze({article:"39",role:"спогодбен развод"}),
    Object.freeze({article:"40",role:"развод по барање на еден брачен другар кога брачните односи се толку нарушени што заедничкиот живот станал неподнослив"}),
    Object.freeze({article:"41",role:"развод кога брачната заедница фактички престанала подолго од една година"}),
    Object.freeze({article:"43",role:"доставување на правосилната пресуда за упис"}),
    Object.freeze({article:"228",role:"посебна месна надлежност според последното заедничко живеалиште"}),
    Object.freeze({article:"229",role:"брачниот спор се поведува со тужба"}),
    Object.freeze({article:"237",role:"постапка за мирење по приемот на тужбата"})
  ])
});

function norm(value){
  return String(value||"").normalize("NFKC").toLocaleLowerCase("mk").replace(/\s+/g," ").trim();
}

export function isFamilyDivorceDraftRequest(query){
  const q=norm(query);
  if(!q) return false;
  const divorce=/(?:развод|бракоразвод|divorce)/u.test(q);
  const draft=/(?:направи|изработи|подготви|напиши|состави|тужб|поднесок|draft)/u.test(q);
  return divorce&&draft;
}

function wantsInventedData(query){
  return /(?:измислен|пример|фиктив|fictional|sample)/u.test(norm(query));
}

function wantsCaseLaw(query){
  return /(?:судска\s+пракс|case\s*law|пресуд|одлук)/u.test(norm(query));
}

export function formatFamilyDivorceDraft(query){
  if(!isFamilyDivorceDraftRequest(query)) return null;

  const fictitious=wantsInventedData(query);
  const caseLawRequested=wantsCaseLaw(query);
  const dataNote=fictitious
    ?"Сите имиња, адреси, датуми и броеви во примерот подолу се ИЗМИСЛЕНИ и служат само за тестирање на формата."
    :"Податоците подолу се примерни полиња. Не внесувајте реални лични податоци во јавниот chat.";

  const caseLawSection=caseLawRequested
    ? [
        "VI. СУДСКА ПРАКСА · PROVENANCE GATE",
        "Во овој пример НЕ се наведува конкретен број на судски предмет или именувана пресуда, затоа што за ова барање нема item-level reviewed official family-law authority врзан во governed corpus.",
        "AI Advokat не смее да измисли судска пракса, ниту discovery-only запис да го претстави како правен авторитет. Конкретна практика се додава само по official item binding, проверка на идентитетот на предметот, holding-от, конечноста и применливоста.",
        ""
      ]
    : [];

  return [
    "ТУЖБА ЗА РАЗВОД НА БРАК",
    "",
    "SOURCE-FIRST · ЗАКОН ЗА СЕМЕЈСТВОТО · HUMAN GATE",
    dataNote,
    "",
    "ДО",
    "ОСНОВЕН ГРАЃАНСКИ СУД СКОПЈЕ",
    "",
    "Тужител: Александар Петров, ул. „Примерна“ бр. 12, Скопје — ИЗМИСЛЕНО ЛИЦЕ",
    "Тужена: Елена Петрова, ул. „Примерна“ бр. 44, Скопје — ИЗМИСЛЕНО ЛИЦЕ",
    "",
    "Предмет: Тужба за развод на брак",
    "",
    "I. ФАКТИЧКА ОСНОВА",
    "1. Тужителот и тужената склучиле брак на 12.05.2018 година во Скопје, запишан во матичната книга на венчаните под измислен број 324/2018.",
    "2. Брачните другари немаат заеднички малолетни деца ниту полнолетни деца над кои е продолжено родителското право.",
    "3. Последното заедничко живеалиште на брачните другари било во Скопје.",
    "4. Од 01.08.2024 година брачната заедница фактички престанала. Оттогаш странките живеат одделно, немаат заедничко домаќинство и не ја остваруваат брачната заедница.",
    "5. Односите меѓу странките се трајно и сериозно нарушени и не постојат реални услови за продолжување на заедничкиот живот.",
    "",
    "II. ПРАВНА ОСНОВА",
    "Тужбата се заснова на Законот за семејството.",
    "• Член 40: развод може да бара еден брачен другар кога брачните односи се толку нарушени што заедничкиот живот станал неподнослив.",
    "• Член 41: брачниот другар може да бара развод кога брачната заедница фактички престанала подолго од една година.",
    "• Член 228: покрај судот од општа месна надлежност, надлежен е и судот на чија територија брачните другари го имале последното заедничко живеалиште.",
    "• Член 229: парничната постапка во брачните спорови се поведува со тужба.",
    "• Член 237: по приемот на тужбата, пред нејзино доставување на тужениот, се спроведува постапка за мирење, освен во законски предвидените исклучоци.",
    "",
    "III. ТУЖБЕНО БАРАЊЕ",
    "Се предлага судот, по спроведената постапка, да донесе:",
    "",
    "П Р Е С У Д А",
    "",
    "1. СЕ РАЗВЕДУВА бракот склучен на 12.05.2018 година во Скопје меѓу тужителот Александар Петров и тужената Елена Петрова, запишан под измислен број 324/2018.",
    "2. За трошоците на постапката судот да одлучи согласно важечките процесни правила и исходот на постапката.",
    "",
    "IV. ДОКАЗИ",
    "1. Извод од матичната книга на венчаните.",
    "2. Доказ за последното заедничко живеалиште, ако е релевантен за месната надлежност.",
    "3. Други докази за фактичкиот престанок на брачната заедница — само ако се потребни и навистина постојат.",
    "",
    "V. ПРОЦЕСНА ЗАБЕЛЕШКА",
    "Бидејќи примерот е без заеднички малолетни деца, не се вметнуваат барања за доверување, лични односи или издршка на деца. Ако конкретниот предмет има деца, потребна е посебна анализа на одредбите за нивните права, учеството на центарот за социјална работа и судската одлука за родителските права.",
    "",
    ...caseLawSection,
    "VII. HUMAN GATE ПРЕД ПОДНЕСУВАЊЕ",
    "Адвокатот мора да ги провери: точниот надлежен суд; идентитетот и адресите на странките; матичниот запис за бракот; фактичката основа; дали се повикува член 40, член 41 или двата; состојбата со децата; важечката верзија на Законот за семејството; судските такси, полномошното и прилозите.",
    "",
    "Изворна основа: официјален/институционален текст на Законот за семејството, членови 40, 41, 228, 229 и 237; amendment lineage проверена до Службен весник на РСМ бр. 192/2025.",
    "Проверено на: "+FAMILY_DIVORCE_SOURCE_SNAPSHOT.verifiedOn+"."
  ].join("\n");
}

export function familyDivorceLegalSources(){
  const law=FAMILY_DIVORCE_SOURCE_SNAPSHOT.primaryLaw;
  return [
    {
      title:"Закон за семејството · консолидиран текст",
      url:law.consolidatedSourceUrl,
      jurisdiction:"MK",
      authorityClass:"official_institutional_legal_text",
      relation:"primary_statutory_basis",
      articles:["40","41","228","229","237"],
      verifiedOn:FAMILY_DIVORCE_SOURCE_SNAPSHOT.verifiedOn
    },
    {
      title:"Закон за изменување на Законот за семејството · Сл. весник на РСМ бр. 192/2025",
      url:law.latestCheckedAmendment.url,
      jurisdiction:"MK",
      authorityClass:"official_gazette_amendment",
      relation:"amendment_lineage_check",
      articlesChangedInThisLane:false,
      verifiedOn:FAMILY_DIVORCE_SOURCE_SNAPSHOT.verifiedOn
    },
    {
      title:"LDBIS · Закон за семејството",
      url:law.ldbisUrl,
      jurisdiction:"MK",
      authorityClass:"ministry_legal_database_metadata",
      relation:"current_lineage_metadata",
      verifiedOn:FAMILY_DIVORCE_SOURCE_SNAPSHOT.verifiedOn
    }
  ];
}
