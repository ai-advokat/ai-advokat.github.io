  window.AI_ADVOCAT_CONFIG = Object.freeze({
    portal: "AI Advokat",
    demoMode: false,

    api: {
      search: "/api/search",
      instruments: "/api/instruments",
      articles: "/api/articles",
      assistant: "/api/assistant",
      membershipStatus: "/api/membership/status",
      documents: "/api/documents"
    },

    zenodoEnabled: false,

    zenodoApi: "/api/zenodo",

    zenodoAuthorUrl:
      "#publications",

    contactEmails: [
      "aiadvokat16@gmail.com",
      "aiadvokat@outlook.com"
    ],

    orcid: {
      id: "0009-0001-0702-2371",
      url: "https://orcid.org/0009-0001-0702-2371"
    },

    defaultLanguage: "mk"
  });


  const i18n = {
    mk:{
      topLine:"Правен информациски портал · AI со проверливи извори · човечка контрола",
      theme:"Тема",
      brandSub:"Правен информациски и AI портал",
      navSources:"Правни извори", navAi:"AI Advokat", navArchitecture:"AI Архитектура", navGuides:"Водичи", navGazette:"Службен весник", navLibrary:"Стручна библиотека", navGovernance:"Проверливост", navResearch:"AI истражувач", navPublications:"Трудови", navAuthor:"Автор", navAbout:"За порталот",
      eyebrow:"AI АДВОКАТ · ЧОВЕЧКА ПРОВЕРКА",
      heroTitle:"Правото, организирано. AI, под човечка контрола.",
      heroText:"Едно место за прописи, судска практика, правни анализи, документи и истражување со вештачка интелигенција — со видливи извори, верзии и задолжителна човечка проверка.",
      startResearch:"Започни правно истражување", viewPapers:"Отвори трудови", installApp:"Инсталирај AI Advokat",
      trustLabel1:"Изворот прв", trustLabel2:"човечка контрола", trustLabel3:"Проверка на верзија", trustLabel4:"Поврзано со Zenodo",
      trust1:"Одговорите треба да покажуваат на што се потпираат.", trust2:"AI не ја заменува професионалната правна проценка.", trust3:"Правниот текст се чита со датум, верзија и важност.", trust4:"Четири авторски труда се објавени на Zenodo со DOI и имаат научни профили; нацртите се јасно означени.",
      featuredTag:"ПОСЕБНИ ПРАВНИ МОДУЛИ", featuredTitle:"Директен пристап до специјализирани правни модули", featuredText:"Две видливи патеки за работа со странци и со македонскиот корпус на пресуди и одлуки на ЕСЧП.", foreignTag:"МВР · ПРЕСТОЈ · ВРАБОТУВАЊЕ", foreignTitle:"Престој и вработување на странци", foreignText:"Прв пат, продолжување и проверка на чек-листи со официјални извори и човечка проверка.", foreignFirst:"Прв пат", foreignRenewal:"Продолжување", foreignOpen:"Отвори модул", foreignGuide:"📘 Водич за престој на странци", echrFeaturedTag:"ЕСЧП · МАКЕДОНСКИ КОРПУС", echrFeaturedTitle:"Пресуди и одлуки на ЕСЧП за Северна Македонија", echrFeaturedText:"Домашен индекс за пребарување на достапните записи, внес на целосен текст и задолжително HUDOC-поврзување пред професионално потпирање. Бројот на записи се чита од живиот корпус, не од статично ветување.", echrSearch:"Пребарај ЕСЧП", echrAnalyze:"Анализирај предмет", echrOpenAi:"Отвори AI Advokat",
      aiChatIntro:"Опишете го правниот проблем со свои зборови. FREE режимот користи Workers AI, а точниот активен AI-провајдер/модел се прикажува во самиот разговор. Платен AI-провајдер се користи само кога е навистина активиран.", chatConversations:"Разговори", chatSessionNote:"Историјата се чува само во оваа сесија на прелистувачот.", chatProviderChecking:"Проверка на активниот AI-провајдер/модел…", chatHumanControl:"човечка контрола", chatExportDraft:"Извези работен нацрт", chatAttachDocs:"🔒 Документи → Заштитен простор за предмети", chatFreeState:"FREE активен · јавен текстуален разговор · Workers AI", chatDropHint:"Не прикачувајте документи во јавниот разговор. За конкретни предмети користете го Заштитениот простор за предмети.", chatPlaceholder:"Прашајте го AI Advokat…",
      sourceTag:"Правна база", sourceTitle:"Од извор до правен заклучок", sourceText:"Порталот е структуриран така што официјалниот текст, судската практика, стручната анализа и AI-синтезата никогаш не се мешаат без ознака.",
      cardLaws:"Закони и прописи", cardLawsText:"Регистарот се проширува закон-по-закон: прво официјални метаподатоци и доказно потекло, а потоа проверен текст член-по-член.",
      cardCases:"Судска практика", cardCasesText:"Директориум кон официјалните бази на судовите. Индексирана судска практика по суд, правно прашање и исход се додава постепено и се означува кога ќе биде достапна.",
      cardEchr:"ЕСПЧ и меѓународни извори", cardEchrText:"HUDOC, EUR-Lex и домашниот индекс за пребарување се прикажуваат со јасна јурисдикција и статус. Секој предмет мора да остане врзан за примарниот извор пред професионално потпирање.",
      cardVersions:"Верзии и измени", cardVersionsText:"Споредба на стар и нов текст, со видливи датумски граници и правна важност.",
      cardCitations:"Проверка на цитати", cardCitationsText:"Контрола дали членот, предметот, DOI или изворот навистина го поддржува тврдењето.",
      cardDocs:"Документи и досиеја", cardDocsText:"Работни досиеја, хронологии, доказни матрици и правни белешки со човечко одобрување.",
      researchTag:"AI ПРАВНО ИСТРАЖУВАЊЕ", researchTitle:"AI истражувач со доказна трага", researchText:"AI истражувачот работи врз истиот корпус на ниво на членови што е видлив во „Закони и прописи“. Секој одговор се врзува за една утврдена верзија на законот, ги прикажува изворните членови и останува под човечка контрола.",
      question:"Правно прашање", humanGate:"Човечка правна проверка е задолжителна", humanGateText:"AI-излезот е истражувачка помош. Не претставува адвокатско мислење, застапување или конечен правен совет додека не биде проверен и усвоен од овластен професионалец.",
      promptTitle:"Примери на прашања", pubTag:"ПУБЛИКАЦИИ", pubTitle:"Трудови и стручни анализи", pubText:"Zenodo-профилот е активен. Четири работни труда се објавени со регистрирани DOI и се вклучени во AI Advokat Zenodo Community. „Кочани – Пулс“ е означен како draft во подготовка за журналски труд.", zenodoStatus:"Статус на Zenodo",
      authorTag:"АВТОР", authorName:"Адвокат Зоран Стојанкиќ", authorBio:"Порталот е развиен како професионална правна платформа за систематизирање на законодавството, судската практика, стручните анализи и истражувањето поддржано од вештачка интелигенција. Zenodo-профилот е активен; четири труда се објавени со DOI, имаат научни профили и се вклучени во AI Advokat Zenodo Community.",
      focus:"Области на интерес", focusText:"Право · институционална одговорност · безбедност · медијација", researchIds:"Истражувачки идентификатори", zenodoReserved:"Zenodo · 4 објавени труда · 4 научни профили", contact:"Контакт", publication:"Публикации", zenodoDraftRecords:"Zenodo · 4 објавени труда · 4 научни профили",
      aboutTag:"УПРАВУВАЊЕ", aboutTitle:"Како порталот ја чува доказната дисциплина", intLabel1:"1. Извор", intLabel2:"2. Доказно потекло", intLabel3:"3. AI нацрт", intLabel4:"4. Човечка проверка",
      int1:"Официјалниот документ се чува одделно од толкувањето.", int2:"Се бележат орган, датум, верзија и доказно потекло.", int3:"AI може да сумира и споредува, но мора да покаже извори.", int4:"Конечната правна проценка и објавување остануваат човечки.",
      disclaimerTitle:"Правна напомена", disclaimerText:"AI Advokat е правно-информативна и истражувачка платформа. AI-генерираната содржина може да содржи грешки, не создава сама по себе однос адвокат-клиент и не е замена за индивидуален правен совет. Официјалниот и важечки текст на правниот извор секогаш има предност; за рокови, кривична постапка и други високоризични прашања е задолжителна човечка професионална проверка.", privacyWarningTitle:"Не внесувајте доверливи податоци", privacyWarningText:"Ова е јавно поле за правно истражување. Не внесувајте имиња на странки, матични броеви, адреси, здравствени податоци, детали од активни предмети, адвокатска тајна или други доверливи податоци. Поставете го прашањето општо.", privacyPolicy:"Политика за приватност", aiPolicy:"AI, точност и човечка контрола", navMembership:"Членство", membershipKeyTitle:"Клуч за членство (опционално)", membershipKeyText:"Ако имате активно членство, внесете го приватниот клуч за да се примени вашиот пакет и месечната квота. Клучот се чува само во тековната сесија на прелистувачот и се испраќа само до AI Advokat API.", membershipKeyUse:"Користи клуч", membershipLink:"Планови и членство",
      footerSub:"Правен информациски портал и AI истражување", footerText:"Правни извори, авторски анализи и AI-поддржано истражување со проверливи извори и човечка финална контрола.", footerNavTitle:"Навигација", footerIntegrityTitle:"Интегритет", methodology:"Методологија", legalNotice:"Правна напомена", zenodoDoiRecords:"Zenodo · DOI-записи", rights:"Сите права задржани.", footerStatus:"Правно-информативна платформа · Изворот прв · човечка контрола",
      modalTitle:"Интеграција со Zenodo", modalText:"Zenodo-профилот на Зоран Стојанкиќ / AI Advokat е активен. Објавени се „СИНЏИР“ (DOI 10.5281/zenodo.22981744), „Електронските и AI-генерираните докази во судската постапка“ (DOI 10.5281/zenodo.23017531), „Претресот на мобилен телефон и заштитата на адвокатската тајна“ (DOI 10.5281/zenodo.23021388) и „Вештачката интелигенција во адвокатурата и судството“ (DOI 10.5281/zenodo.23023442), сите како Working paper, Version 1.0. Автоматската API-синхронизација сè уште не е вклучена.",
      skipLink:"Прескокни до главната содржина", changeLanguage:"Промени јазик", changeTheme:"Промени тема", increaseText:"Зголеми текст", brandHome:"AI Advokat почетна", mainNav:"Главна навигација", openMenu:"Отвори мени", trustGridAria:"Основни принципи", searchPanelAria:"Пребарување", authorPortraitAlt:"Професионален портрет на адвокат Зоран Стојанкиќ", footerNavAria:"Навигација во подножје", footerIntegrityAria:"Интегритет и контакти", closeModal:"Затвори",
      searchPlaceholder:"Пребарај закон, член, пресуда, поим или труд...", searchAria:"Глобално пребарување", typeAria:"Тип", statusAria:"Статус", typeAll:"Сите извори", typeLaw:"Прописи", typeCase:"Судска практика", typePaper:"Трудови", typeGuide:"Водичи", statusAll:"Секој статус", statusOfficial:"Официјален", statusVerified:"Проверен", statusPending:"Во подготовка", searchButton:"Пребарај",
      chipConstitutional:"Уставно право", chipCriminal:"Кривично право", chipObligations:"Облигации", chipAdministrative:"Управно право", chipEchr:"ЕСПЧ", chipMediation:"Медијација", chipAiLaw:"AI и право",
      questionPlaceholder:"Пример: Кои се условите за институционална одговорност и како се разликува од индивидуалната кривична одговорност?", jurisdictionMk:"Северна Македонија", jurisdictionEchr:"Европски суд за човекови права", jurisdictionEu:"Европска унија", jurisdictionComparative:"Компаративно право", modeSource:"Истражување со примарни извори", modeMemo:"Правно мислење", modeCase:"Матрица на судска практика", modeCitations:"Проверка на цитати", sourceRule:"✓ Прво официјални извори · ✓ видливи цитати · ✓ без измислен DOI", analyzeButton:"Анализирај", demoMode:"AI Advokat · поткрепено со извори",
      usePrompt:"Користи", doiReserved:"DOI", openZenodo:"Отвори на Zenodo", openDraft:"Отвори Zenodo нацрт (сопственик)", zenodoPending:"Zenodo-запис во подготовка", noResults:"Нема пронајден релевантен резултат во достапниот правен корпус.", statusOfficialBadge:"ОФИЦИЈАЛЕН", statusVerifiedBadge:"ПРОВЕРЕН", statusPendingBadge:"ВО ПОДГОТОВКА",
      typeSource:"Официјални извори", chipsAria:"Теми за пребарување", cardStatusLabel:"Статус",
      cardLawsAction:"Отвори регистар →", cardCasesAction:"Отвори судска практика →", cardEchrAction:"Отвори меѓународни извори →", cardVersionsAction:"Провери верзии →",
      questionHelp:"Опишете го проблемот со свои зборови. AI Advokat прво ќе ви предложи релевантни кликабилни водичи; ако сакате анализа на закон, наведете го и законот/членот.",
      instrumentLabel:"Закон", instrumentHelp:"„Автоматски“ избира закон само кога називот или кратенката во прашањето е еднозначна.",
      dateLabel:"Датум на кој се однесува прашањето (опционално)", dateHelp:"Ако законот има повеќе верзии, датумот одредува која верзија се применува. Без датум, верзија се користи само кога може безбедно да се утврди; во спротивно системот ќе побара датум.",
      scopeNote:"Опсег: Северна Македонија · 39 јавни практични водичи + корпус на закони на ниво на членови. Водичите се насочување, а правниот заклучок бара проверка на официјалниот извор и човечка контрола.",
      systemModeLabel:"Режим на системот:", answerHeading:"Резултат од AI истражувачот", membershipKeyLabel:"Клуч",
      coverageTitle:"Покриеност на корпусот", coverageText:"Закони со внесен текст член-по-член. Бројот на членови не значи дека текстот е потврден како тековен: статусот на верзијата се прикажува при секој одговор.", coverageLoading:"Се вчитува регистарот…",
      helpTitle:"Како да поставите прашање", help1:"Опишете го проблемот со свои зборови — на пример „ме повика полиција“, „сакам развод“ или „институцијата не ми одговара“.", help2:"Отворете го предложениот практичен водич; за анализа на конкретен закон наведете го законот, членот, поимот или рокот.", help3:"Ако законот има повеќе верзии (на пр. ЗПП), внесете датум.", help4:"Отворете ги прикажаните членови и официјалниот извор пред да се потпрете на одговорот.", help5:"Кога системот одбива да одговори (двосмислен закон, непозната верзија, тема без корпус), тоа е заштита — не грешка.",
      layersTitle:"Слоеви на авторитет", layerLawsTag:"Слој 1–2 · Извор, член, верзија", layerCasesTag:"Слој 3 · Судска практика", layerEchrTag:"Слој 1 и 3 · Меѓународно", layerVersionsTag:"Слој 2 · Верзии", layerCitationsTag:"Проверка меѓу слоевите", layerDocumentsTag:"Работен простор", layerAnalysisTag:"Слој 4 · Стручна анализа", layerAiTag:"Слој 5 · AI синтеза", cardCitationsAction:"Отвори проверка →", cardDocsAction:"Што е планирано →",
      zppLayerTag:"Слој 1–2 · Верзиски статус", zppTitle:"ЗПП · временска линија на верзиите", zppIntro:"Кој текст на Законот за парничната постапка се однесува на кој период — прикажано само од официјалните метаподатоци во LDBIS.", zppEifTitle:"Стапување во сила ≠ почеток на примена", zppEif1:"Законот стапува во сила кога станува дел од правниот поредок, по објавувањето во Службен весник. Почетокот на примена е денот од кој неговите одредби навистина се применуваат.", zppEif2:"Тие два датума може да се разликуваат: законот може да биде во сила, а да се применува подоцна, за да има време за подготовка на судовите и странките.", zppEif3:"Пример: новиот ЗПП (151/2026) е објавен на 08.07.2026, стапи во сила на 16.07.2026, а се применува од 18.01.2027. Според официјалните метаподатоци, дотогаш се применува претходната патека (пречистениот текст 7/2011 со измената 124/2015).", zppCaveat:"Преодните одредби на новиот закон (на пр. за постапки започнати пред 18.01.2027) не се прикажани овде — проверете ги во официјалниот текст. Приказот е информативен и не е правен совет.",
      askReady:"AI Advokat го обработува прашањето преку правниот корпус за {jurisdiction} и мора да покаже извори, применливи норми, ограничувања на верзијата и човечка контрола.",
      askEmpty:"Внесете правно прашање. Порталот намерно не генерира правни заклучоци без прашање и извори."
    },
    en:{
      topLine:"Legal information portal · AI with verifiable sources · human control",
      theme:"Theme",
      brandSub:"Legal information & AI portal",
      navSources:"Legal sources", navAi:"AI Advokat", navArchitecture:"AI Architecture", navGuides:"Guides", navGazette:"Official Gazette", navLibrary:"Professional Library", navGovernance:"Verifiability", navResearch:"AI Research", navPublications:"Publications", navAuthor:"Author", navAbout:"About",
      eyebrow:"AI ADVOCATE · HUMAN REVIEW",
      heroTitle:"Law, organized. AI, under human control.",
      heroText:"One place for legislation, case law, legal analysis, documents and AI-assisted research — with visible sources, versions and mandatory human review.",
      startResearch:"Start legal research", viewPapers:"View publications", installApp:"Install AI Advokat",
      trustLabel1:"Source-first", trustLabel2:"Human Gate", trustLabel3:"Version-aware", trustLabel4:"Zenodo-linked",
      trust1:"Answers should show what they rely on.", trust2:"AI does not replace professional legal judgment.", trust3:"Legal text is read with date, version and validity.", trust4:"Four author papers are published on Zenodo with DOIs and have Scholar pages; drafts are clearly labelled.",
      featuredTag:"SPECIAL LEGAL MODULES", featuredTitle:"Direct access to specialized legal modules", featuredText:"Two visible workflows for foreign nationals and the North Macedonia ECHR judgments and decisions corpus.", foreignTag:"MOI · RESIDENCE · EMPLOYMENT", foreignTitle:"Residence and employment of foreign nationals", foreignText:"First-time applications, renewals and document checks with official sources and a Human Gate.", foreignFirst:"First time", foreignRenewal:"Renewal", foreignOpen:"Open module", foreignGuide:"📘 Lawyer guide", echrFeaturedTag:"ECHR · NORTH MACEDONIA CORPUS", echrFeaturedTitle:"ECHR judgments and decisions concerning North Macedonia", echrFeaturedText:"A domestic discovery index of the available records, full-text intake and mandatory HUDOC binding before professional reliance. Record counts come from the live corpus, not a static claim.", echrSearch:"Search ECHR", echrAnalyze:"Analyze case", echrOpenAi:"Open AI Advokat",
      aiChatIntro:"Describe the legal problem in your own words. FREE mode uses Workers AI, and the exact active provider/model is shown in the chat. A paid provider is used only when it is actually enabled.", chatConversations:"Conversations", chatSessionNote:"History is kept only in this browser session.", chatProviderChecking:"Checking the active AI provider/model…", chatHumanControl:"human control", chatExportDraft:"Export working draft", chatAttachDocs:"🔒 Documents → Secure Case Workspace", chatFreeState:"FREE active · public text chat · Workers AI", chatDropHint:"Do not upload documents in public chat. Use Secure Case Workspace for concrete case materials.", chatPlaceholder:"Ask AI Advokat…",
      sourceTag:"Legal database", sourceTitle:"From source to legal conclusion", sourceText:"Official text, case law, professional analysis and AI synthesis remain visibly separated.",
      cardLaws:"Laws & regulations", cardLawsText:"The registry expands law-by-law: first official metadata and provenance, then verified article-by-article text.",
      cardCases:"Case law", cardCasesText:"Directory of official court databases. Indexed case law by court, legal issue and outcome is added gradually and labelled once available.",
      cardEchr:"ECHR & international sources", cardEchrText:"HUDOC, EUR-Lex and the domestic discovery index are shown with clear jurisdiction and status. Every case must remain bound to its primary source before professional reliance.",
      cardVersions:"Versions & amendments", cardVersionsText:"Compare old and new text with visible temporal boundaries and legal effect.",
      cardCitations:"Citation audit", cardCitationsText:"Check whether an article, case, DOI or source actually supports the claim.",
      cardDocs:"Documents & files", cardDocsText:"Working files, chronologies, evidence matrices and legal notes under human approval.",
      researchTag:"AI LEGAL RESEARCH", researchTitle:"AI Research with an evidence trail", researchText:"The AI Researcher works on the same article-level corpus shown under Laws & regulations. Every answer is bound to one resolved version of the law, shows the source articles and stays under the Human Gate.",
      question:"Legal question", humanGate:"Human legal review is mandatory", humanGateText:"AI output is research assistance. It is not legal representation or final legal advice until verified and adopted by an authorized professional.",
      promptTitle:"Example questions", pubTag:"PUBLICATIONS", pubTitle:"Publications & legal analyses", pubText:"The Zenodo profile is active. Four Working papers are published with registered DOIs and are included in the AI Advokat Zenodo Community. “Kočani – Puls” is listed as a draft in preparation for a journal article.", zenodoStatus:"Zenodo status",
      authorTag:"AUTHOR", authorName:"Attorney Zoran Stojankich", authorBio:"The portal is developed as a professional legal platform for organizing legislation, case law, professional analyses and AI-assisted research. The Zenodo profile is active; four works are published with DOIs, have Scholar pages, and are included in the AI Advokat Zenodo Community.",
      focus:"Areas of interest", focusText:"Law · institutional accountability · security · mediation", researchIds:"Research identifiers", zenodoReserved:"Zenodo · 4 published works · 4 Scholar pages", contact:"Contact", publication:"Publications", zenodoDraftRecords:"Zenodo · 4 published works · 4 Scholar pages",
      aboutTag:"GOVERNANCE", aboutTitle:"How the portal protects evidence discipline", intLabel1:"1. Source", intLabel2:"2. Provenance", intLabel3:"3. AI Draft", intLabel4:"4. Human Gate",
      int1:"Official documents stay separate from interpretation.", int2:"Authority, date, version and provenance are recorded.", int3:"AI may summarize and compare, but must expose sources.", int4:"Final legal judgment and publication remain human.",
      disclaimerTitle:"Legal notice", disclaimerText:"AI Advokat is a legal-information and research platform. AI-generated content may contain errors, does not by itself create an attorney-client relationship, and is not a substitute for individualized legal advice. The official and current legal source controls; human professional review is required for deadlines, criminal proceedings and other high-risk matters.", privacyWarningTitle:"Do not enter confidential data", privacyWarningText:"This is a public legal-research field. Do not enter party names, national ID numbers, addresses, health data, details of active matters, privileged information or other confidential data. Ask the question in general terms.", privacyPolicy:"Privacy policy", aiPolicy:"AI accuracy and Human Gate", navMembership:"Membership", membershipKeyTitle:"Membership key (optional)", membershipKeyText:"If you have an active membership, enter your private key to apply your plan and monthly quota. The key is kept only for the current browser session and is sent only to the AI Advokat API.", membershipKeyUse:"Use key", membershipLink:"Plans & membership",
      footerSub:"Legal information & AI research portal", footerText:"Legal sources, author analyses and AI-assisted research with verifiable sources and final human control.", footerNavTitle:"Navigation", footerIntegrityTitle:"Integrity", methodology:"Methodology", legalNotice:"Legal notice", zenodoDoiRecords:"Zenodo · DOI records", rights:"All rights reserved.", footerStatus:"Legal-information platform · Source-first · Human Gate",
      modalTitle:"Zenodo integration", modalText:"The Zenodo profile of Zoran Stojankich / AI Advokat is active. Published works are “CHAIN” (DOI 10.5281/zenodo.22981744), “Electronic and AI-Generated Evidence in Judicial Proceedings” (DOI 10.5281/zenodo.23017531), “Searching a Mobile Phone and the Protection of Legal Professional Privilege” (DOI 10.5281/zenodo.23021388), and “Artificial Intelligence in the Legal Profession and the Judiciary” (DOI 10.5281/zenodo.23023442), all as Working paper, Version 1.0. Automatic API synchronization is not yet enabled.",
      skipLink:"Skip to main content", changeLanguage:"Change language", changeTheme:"Change theme", increaseText:"Increase text size", brandHome:"AI Advokat home", mainNav:"Main navigation", openMenu:"Open menu", trustGridAria:"Core principles", searchPanelAria:"Search", authorPortraitAlt:"Professional portrait of Attorney Zoran Stojankich", footerNavAria:"Footer navigation", footerIntegrityAria:"Integrity and contacts", closeModal:"Close",
      searchPlaceholder:"Search law, article, judgment, term or publication...", searchAria:"Global search", typeAria:"Type", statusAria:"Status", typeAll:"All sources", typeLaw:"Legislation", typeCase:"Case law", typePaper:"Publications", typeGuide:"Guides", statusAll:"Any status", statusOfficial:"Official", statusVerified:"Verified", statusPending:"In preparation", searchButton:"Search",
      chipConstitutional:"Constitutional law", chipCriminal:"Criminal law", chipObligations:"Law of obligations", chipAdministrative:"Administrative law", chipEchr:"ECHR", chipMediation:"Mediation", chipAiLaw:"AI & Law",
      questionPlaceholder:"Example: What are the conditions for institutional accountability and how does it differ from individual criminal responsibility?", jurisdictionMk:"North Macedonia", jurisdictionEchr:"European Court of Human Rights", jurisdictionEu:"European Union", jurisdictionComparative:"Comparative law", modeSource:"Source-first research", modeMemo:"Legal memo", modeCase:"Case-law matrix", modeCitations:"Citation audit", sourceRule:"✓ official sources first · ✓ visible citations · ✓ no invented DOI", analyzeButton:"Analyze", demoMode:"AI Advokat · Source-backed",
      usePrompt:"Use", doiReserved:"DOI", openZenodo:"Open on Zenodo", openDraft:"Open Zenodo draft (owner)", zenodoPending:"Zenodo record in preparation", noResults:"No relevant result was found in the available legal corpus.", statusOfficialBadge:"OFFICIAL", statusVerifiedBadge:"VERIFIED", statusPendingBadge:"IN PREPARATION",
      typeSource:"Official sources", chipsAria:"Search topics", cardStatusLabel:"Status",
      cardLawsAction:"Open registry →", cardCasesAction:"Open case law →", cardEchrAction:"Open international sources →", cardVersionsAction:"Check versions →",
      questionHelp:"Name the law (e.g. “ZRO”) and the article or concept. The answer relies only on the articles shown as sources.",
      instrumentLabel:"Law", instrumentHelp:"“Automatic” selects a law only when the name or abbreviation in the question is unambiguous.",
      dateLabel:"Date the question refers to (optional)", dateHelp:"If a law has several versions, the date decides which version applies. Without a date a version is used only when it can be determined safely; otherwise the system asks for a date.",
      scopeNote:"Scope: North Macedonia · article-level corpus of laws. Case law and ECHR are currently available only as a directory of official sources.",
      systemModeLabel:"System mode:", answerHeading:"AI Researcher result", membershipKeyLabel:"Key",
      coverageTitle:"Corpus coverage", coverageText:"Laws with article-by-article text. An article count does not mean the text is verified as current: the version status is shown with every answer.", coverageLoading:"Loading registry…",
      helpTitle:"How to ask a question", help1:"Name the law (abbreviation or title) or choose it from the list.", help2:"Ask about a specific article, concept, deadline or obligation.", help3:"If the law has several versions (e.g. ZPP), enter a date.", help4:"Open the cited articles and the official source before relying on the answer.", help5:"When the system declines to answer (ambiguous law, unknown version, topic without corpus), that is a safeguard — not an error.",
      layersTitle:"Layers of authority", layerLawsTag:"Layer 1–2 · Source, article, version", layerCasesTag:"Layer 3 · Case law", layerEchrTag:"Layer 1 and 3 · International", layerVersionsTag:"Layer 2 · Versions", layerCitationsTag:"Cross-layer check", layerDocumentsTag:"Workspace", layerAnalysisTag:"Layer 4 · Professional analysis", layerAiTag:"Layer 5 · AI synthesis", cardCitationsAction:"Open audit →", cardDocsAction:"What is planned →",
      zppLayerTag:"Layer 1–2 · Version status", zppTitle:"ZPP · version timeline", zppIntro:"Which text of the Law on Civil Procedure relates to which period — shown only from the official LDBIS metadata.", zppEifTitle:"Entry into force ≠ start of application", zppEif1:"A law enters into force when it becomes part of the legal order, after publication in the Official Gazette. The start of application is the day from which its provisions actually apply.", zppEif2:"The two dates can differ: a law can be in force but apply later, to give courts and parties time to prepare.", zppEif3:"Example: the new ZPP (151/2026) was published on 8 July 2026, entered into force on 16 July 2026 and applies from 18 January 2027. According to the official metadata, the previous track (the 7/2011 consolidated text with the 124/2015 amendment) applies until then.", zppCaveat:"The transitional provisions of the new law (e.g. for proceedings started before 18 January 2027) are not shown here — check them in the official text. This is information, not legal advice.",
      askReady:"AI Advokat processes the question through the legal corpus for {jurisdiction} and must expose sources, applicable rules, version limitations and the Human Gate.",
      askEmpty:"Enter a legal question. The portal deliberately does not generate legal conclusions without a question and sources."
    }
  };

  let lang = "mk";

  const API_BASE = location.hostname.endsWith("workers.dev")
    ? location.origin
    : "https://ai-advokat-github-io.aiadvokat16.workers.dev";
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const SCHOLAR_BASE="https://ai-advokat.github.io";
  const PUBLICATION_META={
    "10.5281/zenodo.22981744":{scholar:"/scholar/sindzir/",year:"2026",titleEn:"“CHAIN” — Plea Agreements, Guilty Pleas and the Limits of Criminal Justice"},
    "10.5281/zenodo.23017531":{scholar:"/scholar/electronic-ai-evidence/",year:"2026",titleEn:"Electronic and AI-Generated Evidence in Judicial Proceedings"},
    "10.5281/zenodo.23021388":{scholar:"/scholar/mobile-phone-privilege/",year:"2026",titleEn:"Searching a Mobile Phone and the Protection of Legal Professional Privilege"},
    "10.5281/zenodo.23023442":{scholar:"/scholar/ai-legal-practice-judiciary/",year:"2026",titleEn:"Artificial Intelligence in the Legal Profession and the Judiciary"}
  };

  const dynamicContent = {
    mk:{
      prompts:[
        ["Член од закон","Што уредува член 12 од ЗРО и кои услови ги предвидува?"],
        ["Поим во закон","Кои членови од ЗКП го уредуваат притворот и кои рокови предвидуваат?"],
        ["Рокови и обврски","Кои рокови ги предвидува ЗИ за постапување по предлог за извршување? Наведи ги изворните членови."],
        ["Права и обврски","Кои права ги има работникот при престанок на договорот за вработување според ЗРО?"],
        ["Верзија на законот","Кој член од ЗПП ја уредува содржината на тужбата? (ЗПП има повеќе верзии — внесете датум.)"],
        ["Проверка пред употреба","Кои членови од ЗРО треба лично да се проверат во официјалниот извор пред примена на конкретен случај?"]
      ],
      publications:[        {title:"„СИНЏИР“ — Спогодување со обвинителството, признавање вина и границите на казнената правда",kind:"Работен труд",version:"Верзија 1.0 · човечка контрола завршена",doi:"10.5281/zenodo.22981744",badge:"ZENODO · ОБЈАВЕНО",published:true,draftUrl:"",zenodoUrl:"https://zenodo.org/records/22981744",tags:["кривично право","спогодување","финансиски криминал","конфискација"]},
        {title:"Електронските и AI-генерираните докази во судската постапка",kind:"Работен труд",version:"Верзија 1.0 · човечка контрола завршена",doi:"10.5281/zenodo.23017531",badge:"ZENODO · ОБЈАВЕНО",published:true,draftUrl:"",zenodoUrl:"https://zenodo.org/records/23017531",tags:["електронски докази","AI-генерирани докази","deepfake","синџир на чување"]},
        {title:"Претресот на мобилен телефон и заштитата на адвокатската тајна",kind:"Работен труд",version:"Верзија 1.0 · човечка контрола завршена",doi:"10.5281/zenodo.23021388",badge:"ZENODO · ОБЈАВЕНО",published:true,draftUrl:"",zenodoUrl:"https://zenodo.org/records/23021388",tags:["мобилен телефон","адвокатска тајна","електронски докази","приватност"]},
        {title:"Вештачката интелигенција во адвокатурата и судството",kind:"Работен труд",version:"Верзија 1.0 · човечка контрола завршена",doi:"10.5281/zenodo.23023442",badge:"ZENODO · ОБЈАВЕНО",published:true,draftUrl:"",zenodoUrl:"https://zenodo.org/records/23023442",tags:["вештачка интелигенција","адвокатура","судство","правично судење"]},
        {title:"Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност",kind:"Нацрт за журналски труд",version:"Нацрт · Во подготовка за журналски артикал",doi:"",badge:"НАЦРТ · НЕ Е ОБЈАВЕН",published:false,draftUrl:"",tags:["кривична одговорност","институционална одговорност","политичка одговорност","Кочани · Пулс"]},
      ],
      data:[        {type:"paper",status:"verified",title:"„СИНЏИР“ — Спогодување со обвинителството, признавање вина и границите на казнената правда",meta:"Зоран Стојанкиќ · Working paper · Version 1.0 · DOI: 10.5281/zenodo.22981744",text:"Спогодување; признание на вина; организиран финансиски криминал; даночно затајување; перење пари; конфискација; пропорционалност.",url:"/scholar/sindzir/"},
        {type:"paper",status:"verified",title:"Електронските и AI-генерираните докази во судската постапка",meta:"Зоран Стојанкиќ · Working paper · Version 1.0 · DOI: 10.5281/zenodo.23017531",text:"Автентичност; интегритет; deepfake; синџир на чување; електронски докази; AI-генерирани докази; ефективно оспорување.",url:"/scholar/electronic-ai-evidence/"},
        {type:"paper",status:"verified",title:"Претресот на мобилен телефон и заштитата на адвокатската тајна",meta:"Зоран Стојанкиќ · Working paper · Version 1.0 · DOI: 10.5281/zenodo.23021388",text:"Мобилен телефон; адвокатска тајна; електронски докази; судска наредба; приватност; независно издвојување.",url:"/scholar/mobile-phone-privilege/"},
        {type:"paper",status:"verified",title:"Вештачката интелигенција во адвокатурата и судството",meta:"Зоран Стојанкиќ · Working paper · Version 1.0 · DOI: 10.5281/zenodo.23023442",text:"Вештачка интелигенција; адвокатура; судство; правично судење; алгоритамска пристрасност; електронски докази; човечки надзор.",url:"/scholar/ai-legal-practice-judiciary/"},
        {type:"paper",status:"pending",title:"Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност",meta:"Зоран Стојанкиќ · Нацрт · Подготовка за журналски труд",text:"Нацрт во подготовка за журналски артикал; индивидуална кривична, институционална и политичка одговорност."},
        {type:"guide",status:"verified",title:"Метод за проверка на правен цитат",meta:"AI Advokat · Истражувачки водич · v1",text:"Проверка на член, верзија, важност, судска одлука, DOI и примарен извор."}
      ]
    },
    en:{
      prompts:[
        ["Article of a law","What does Article 12 of the ZRO regulate and which conditions does it set?"],
        ["Concept in a law","Which ZKP articles regulate detention and which deadlines do they set?"],
        ["Deadlines and obligations","Which deadlines does the ZI set for acting on an enforcement motion? List the source articles."],
        ["Rights and obligations","Which rights does an employee have when an employment contract ends under the ZRO?"],
        ["Version of a law","Which ZPP article regulates the content of a claim? (The ZPP has several versions — enter a date.)"],
        ["Check before use","Which ZRO articles must be checked personally in the official source before applying them to a specific case?"]
      ],
      publications:[        {title:"“CHAIN” — Plea Agreements, Guilty Pleas and the Limits of Criminal Justice",kind:"Working Paper",version:"Version 1.0 · Human Gate completed",doi:"10.5281/zenodo.22981744",badge:"ZENODO · PUBLISHED",published:true,draftUrl:"",zenodoUrl:"https://zenodo.org/records/22981744",tags:["criminal law","plea agreements","financial crime","confiscation"]},
        {title:"Electronic and AI-Generated Evidence in Judicial Proceedings",kind:"Working Paper",version:"Version 1.0 · Human Gate completed",doi:"10.5281/zenodo.23017531",badge:"ZENODO · PUBLISHED",published:true,draftUrl:"",zenodoUrl:"https://zenodo.org/records/23017531",tags:["electronic evidence","AI-generated evidence","deepfake","chain of custody"]},
        {title:"Searching a Mobile Phone and the Protection of Legal Professional Privilege",kind:"Working Paper",version:"Version 1.0 · Human Gate completed",doi:"10.5281/zenodo.23021388",badge:"ZENODO · PUBLISHED",published:true,draftUrl:"",zenodoUrl:"https://zenodo.org/records/23021388",tags:["mobile phone","legal professional privilege","electronic evidence","privacy"]},
        {title:"Artificial Intelligence in the Legal Profession and the Judiciary",kind:"Working Paper",version:"Version 1.0 · Human Gate completed",doi:"10.5281/zenodo.23023442",badge:"ZENODO · PUBLISHED",published:true,draftUrl:"",zenodoUrl:"https://zenodo.org/records/23023442",tags:["artificial intelligence","legal profession","judiciary","fair trial"]},
        {title:"Kočani – “Puls”: Individual Criminal, Institutional and Political Responsibility",kind:"Journal article draft",version:"Draft · In preparation for a journal article",doi:"",badge:"DRAFT · NOT PUBLISHED",published:false,draftUrl:"",tags:["criminal responsibility","institutional responsibility","political responsibility","Kočani · Puls"]},
      ],
      data:[        {type:"paper",status:"verified",title:"“CHAIN” — Plea Agreements, Guilty Pleas and the Limits of Criminal Justice",meta:"Zoran Stojankich · Working paper · Version 1.0 · DOI: 10.5281/zenodo.22981744",text:"Plea agreements; guilty pleas; organised financial crime; tax evasion; money laundering; confiscation; proportionality.",url:"/scholar/sindzir/"},
        {type:"paper",status:"verified",title:"Electronic and AI-Generated Evidence in Judicial Proceedings",meta:"Zoran Stojankich · Working paper · Version 1.0 · DOI: 10.5281/zenodo.23017531",text:"Authenticity; integrity; deepfakes; chain of custody; electronic evidence; AI-generated evidence; effective challenge.",url:"/scholar/electronic-ai-evidence/"},
        {type:"paper",status:"verified",title:"Searching a Mobile Phone and the Protection of Legal Professional Privilege",meta:"Zoran Stojankich · Working paper · Version 1.0 · DOI: 10.5281/zenodo.23021388",text:"Mobile phone search; legal professional privilege; electronic evidence; judicial order; privacy; independent filtering.",url:"/scholar/mobile-phone-privilege/"},
        {type:"paper",status:"verified",title:"Artificial Intelligence in the Legal Profession and the Judiciary",meta:"Zoran Stojankich · Working paper · Version 1.0 · DOI: 10.5281/zenodo.23023442",text:"Artificial intelligence; legal profession; judiciary; fair trial; algorithmic bias; electronic evidence; human oversight.",url:"/scholar/ai-legal-practice-judiciary/"},
        {type:"paper",status:"pending",title:"Kočani – “Puls”: Individual Criminal, Institutional and Political Responsibility",meta:"Zoran Stojankich · Draft · Journal article in preparation",text:"Draft in preparation for a journal article; individual criminal, institutional and political responsibility."},
        {type:"guide",status:"verified",title:"Method for auditing a legal citation",meta:"AI Advokat · Research Guide · v1",text:"Check provision, version, validity, judicial decision, DOI and primary source."}
      ]
    }
  };

  function applyLanguage(){
    document.documentElement.lang = lang === "mk" ? "mk" : "en";

    $$("[data-i18n]").forEach(el=>{
      const k=el.dataset.i18n;
      if(i18n[lang][k] !== undefined) el.textContent=i18n[lang][k];
    });
    $$("[data-i18n-aria]").forEach(el=>{
      const k=el.dataset.i18nAria;
      if(i18n[lang][k] !== undefined) el.setAttribute("aria-label",i18n[lang][k]);
    });
    $$("[data-i18n-placeholder]").forEach(el=>{
      const k=el.dataset.i18nPlaceholder;
      if(i18n[lang][k] !== undefined) el.setAttribute("placeholder",i18n[lang][k]);
    });
    $$("[data-i18n-alt]").forEach(el=>{
      const k=el.dataset.i18nAlt;
      if(i18n[lang][k] !== undefined) el.setAttribute("alt",i18n[lang][k]);
    });

    const description = document.querySelector('meta[name="description"]');
    if(description){
      description.setAttribute("content", lang === "mk"
        ? "AI Advokat — правен информациски и AI портал со проверливи извори, судска практика, анализи и човечка контрола."
        : "AI Advokat — legal information and AI research portal with verifiable sources, case law, analysis and mandatory human review.");
    }

    document.title = lang === "mk"
      ? "AI Advokat — Правен информациски и AI портал"
      : "AI Advokat — Legal Information & AI Portal";

    renderPrompts();
    renderPublications();
    renderLayerLadder();
    renderZppTimeline();
    hydrateInstrumentSelect();
    if(lastSearch) renderSearchResults(lastSearch);
    const themeBtn=$("#themeBtn");
    if(themeBtn) themeBtn.setAttribute("aria-pressed",String(document.documentElement.dataset.theme==="dark"));
  }

  function renderPrompts(){
    const root=$("#promptGrid");
    root.innerHTML="";
    dynamicContent[lang].prompts.forEach((p,i)=>{
      const el=document.createElement("div");
      el.className="prompt";
      el.innerHTML=`<span class="n" aria-hidden="true">${i+1}</span><span><b>${escapeHtml(p[0])}</b><small>${escapeHtml(p[1])}</small></span><button type="button" aria-label="${escapeHtml(i18n[lang].usePrompt+": "+p[0])}">${i18n[lang].usePrompt}</button>`;
      el.querySelector("button").addEventListener("click",()=>{
        $("#legalQuestion").value=p[1];
        $("#legalQuestion").focus();
      });
      root.appendChild(el);
    });
  }

  function citationFor(pub){
    const meta=PUBLICATION_META[pub.doi];
    if(!pub.published || !meta) return "";
    const author=lang==="mk" ? "Стојанкиќ, З." : "Stojankich, Z.";
    const version=lang==="mk" ? "Верзија 1.0" : "Version 1.0";
    const kind=lang==="mk" ? "Работен труд" : "Working paper";
    return `${author} (${meta.year}). ${pub.title} (${version}) [${kind}]. Zenodo. https://doi.org/${pub.doi}`;
  }

  function renderPublications(){
    const root=$("#publicationGrid");
    root.innerHTML="";
    dynamicContent[lang].publications.forEach(pub=>{
      const el=document.createElement("article");
      el.className="card pubCard";
      const meta=PUBLICATION_META[pub.doi];
      const doiHtml=pub.published && pub.doi
        ? `DOI: <a href="https://doi.org/${escapeHtml(pub.doi)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pub.doi)}</a>`
        : escapeHtml(lang==="mk" ? "Нема објавен DOI · нацрт" : "No published DOI · draft");
      const actions=[];
      if(pub.published){
        if(meta) actions.push(`<a class="btn light" href="${meta.scholar}">${lang==="mk" ? "Scholar страница" : "Scholar page"}</a>`);
        actions.push(`<a class="btn light" href="${escapeHtml(pub.zenodoUrl || `https://doi.org/${pub.doi}`)}" target="_blank" rel="noopener noreferrer">${i18n[lang].openZenodo}</a>`);
      }else if(pub.draftUrl){
        actions.push(`<a class="btn light" href="${escapeHtml(pub.draftUrl)}" target="_blank" rel="noopener noreferrer">${i18n[lang].openDraft}</a>`);
      }
      const cite=citationFor(pub);
      const citeHtml=cite ? `<details class="citeBox"><summary>${lang==="mk" ? "Цитирај" : "Cite"}</summary><p class="citeText">${escapeHtml(cite)}</p><button type="button" class="btn light copyCite">${lang==="mk" ? "Копирај цитат" : "Copy citation"}</button><span class="help" role="status"></span></details>` : "";
      el.innerHTML=`<span class="badge ${pub.published ? "ok" : "draft"}">${escapeHtml(pub.badge)}</span><div><h3>${escapeHtml(pub.title)}</h3><p>${escapeHtml(pub.kind)} · ${escapeHtml(pub.version)}</p></div><div class="doi">${doiHtml}</div><div class="chips">${pub.tags.map(t=>`<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>${citeHtml}${actions.length ? `<div class="pubActions">${actions.join("")}</div>` : ""}`;
      const copy=el.querySelector(".copyCite");
      if(copy) copy.addEventListener("click",async()=>{
        const status=copy.nextElementSibling;
        try{ await navigator.clipboard.writeText(cite); status.textContent=lang==="mk" ? "Цитатот е копиран." : "Citation copied."; }
        catch{ status.textContent=lang==="mk" ? "Копирањето не е дозволено; означете го текстот рачно." : "Copying is not allowed; select the text manually."; }
      });
      root.appendChild(el);
    });
  }

  function statusLabel(status){
    if(status==="official") return i18n[lang].statusOfficialBadge;
    if(status==="verified") return i18n[lang].statusVerifiedBadge;
    return i18n[lang].statusPendingBadge;
  }

  const ENTITY_LABELS={
    mk:{law:"Пропис",source:"Официјален извор",case:"Судска одлука",paper:"Труд",guide:"Водич"},
    en:{law:"Legislation",source:"Official source",case:"Court decision",paper:"Publication",guide:"Guide"}
  };
  let lastSearch=null;
  let searchSeq=0;

  function publicExcerpt(value,max=280){
    const text=String(value||"").replace(/\s+/g," ").trim();
    if(text.length<=max) return {text,truncated:false};
    const candidate=text.slice(0,max+1);
    const boundary=candidate.lastIndexOf(" ");
    const cut=boundary>=Math.floor(max*0.65) ? boundary : max;
    return {text:text.slice(0,cut).trimEnd()+"…",truncated:true};
  }

  function renderSearchResults(state){
    const root=$("#searchResults");
    const status=$("#searchStatus");
    const labels=ENTITY_LABELS[lang];
    if(state.mode==="fallback"){
      status.textContent=lang==="mk"
        ? "Живото пребарување моментално не е достапно. Прикажани се само локалните записи за трудовите и водичите на порталот — не и прописи."
        : "Live search is currently unavailable. Only the portal's local entries for publications and guides are shown — not legislation.";
    }else{
      status.textContent=lang==="mk"
        ? `${state.results.length} резултати од јавниот корпус за „${state.query}“. Отворете го изворот пред професионална употреба.`
        : `${state.results.length} results from the public corpus for “${state.query}”. Open the source before professional use.`;
    }
    if(!state.results.length){
      root.innerHTML=`<div class="resultItem">${escapeHtml(i18n[lang].noResults)}</div>`;
      return;
    }
    root.innerHTML=state.results.map(x=>{
      const kind=labels[x.entityType] || x.entityType || "";
      const meta=[kind,x.meta,x.jurisdiction,x.date].filter(Boolean).join(" · ");
      const external=x.url && /^https?:\/\//.test(x.url);
      const link=x.url
        ? `<div class="resultActions"><a class="btn light" href="${escapeHtml(x.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${lang==="mk" ? "Отвори извор" : "Open source"}${external ? " ↗" : ""}</a></div>`
        : "";
      const excerpt=publicExcerpt(x.snippet,280);
      const excerptHtml=excerpt.text
        ? `<div class="searchExcerpt"><span class="layerTag">${lang==="mk" ? (excerpt.truncated?"Извадок · скратено":"Извадок") : (excerpt.truncated?"Excerpt · shortened":"Excerpt")}</span><p>${escapeHtml(excerpt.text)}</p></div>`
        : "";
      return `<div class="resultItem"><div class="resultTop"><div><h4>${escapeHtml(x.title)}</h4><div class="meta">${escapeHtml(meta)}</div></div><span class="badge ${x.status==="official" ? "ok" : x.status==="verified" ? "info" : "pending"}">${escapeHtml(statusLabel(x.status))}</span></div>${excerptHtml}${link}</div>`;
    }).join("");
  }

  function localFallback(q,t,s){
    const locale=lang==="mk" ? "mk" : "en";
    const needle=q.toLocaleLowerCase(locale);
    return dynamicContent[lang].data
      .filter(x=>(!needle || `${x.title} ${x.text} ${x.meta}`.toLocaleLowerCase(locale).includes(needle)) && (t==="all" || x.type===t) && (s==="all" || x.status===s))
      .map(x=>({entityType:x.type,title:x.title,meta:x.meta,snippet:x.text,url:x.url || null,jurisdiction:null,status:x.status,date:null}));
  }

  async function renderResults(){
    const q=$("#globalSearch").value.trim();
    const t=$("#typeFilter").value;
    const s=$("#statusFilter").value;
    const status=$("#searchStatus");
    if(q.length<2){
      status.textContent=lang==="mk" ? "Внесете најмалку два знака." : "Enter at least two characters.";
      return;
    }
    const seq=++searchSeq;
    status.textContent=lang==="mk" ? "Се пребарува…" : "Searching…";
    $("#searchResults").setAttribute("aria-busy","true");
    let state;
    try{
      const url=new URL(API_BASE+"/api/search");
      url.searchParams.set("q",q);
      url.searchParams.set("type",t);
      url.searchParams.set("status",s);
      url.searchParams.set("limit","20");
      const response=await fetch(url,{headers:{accept:"application/json"}});
      const data=await response.json();
      if(!response.ok || !data.ok || !Array.isArray(data.results)) throw new Error(data?.error || "search_error");
      state={mode:"live",query:q,results:data.results};
    }catch{
      state={mode:"fallback",query:q,results:localFallback(q,t,s)};
    }finally{
      $("#searchResults").removeAttribute("aria-busy");
    }
    if(seq!==searchSeq) return;
    lastSearch=state;
    renderSearchResults(state);
  }

  $("#langBtn").addEventListener("click",()=>{
    lang=lang==="mk" ? "en" : "mk";
    applyLanguage();
  });

  $("#themeBtn").addEventListener("click",()=>{
    const dark=document.documentElement.dataset.theme!=="dark";
    document.documentElement.dataset.theme=dark ? "dark" : "light";
    $("#themeBtn").setAttribute("aria-pressed",String(dark));
  });

  let zoom=0;
  $("#a11yBtn").addEventListener("click",()=>{
    zoom=(zoom+1)%3;
    document.documentElement.style.fontSize=["100%","108%","116%"][zoom];
  });

  function setMenu(open){
    const m=$("#mobileMenu");
    m.hidden=!open;
    $("#menuBtn").setAttribute("aria-expanded",String(open));
  }
  $("#menuBtn").addEventListener("click",()=>setMenu($("#mobileMenu").hidden));
  $$("#mobileMenu a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape" && !$("#mobileMenu").hidden){ setMenu(false); $("#menuBtn").focus(); }
  });

  $("#searchForm").addEventListener("submit",e=>{ e.preventDefault(); renderResults(); });
  $$(".chips button.chip").forEach(chip=>chip.addEventListener("click",()=>{
    $("#globalSearch").value=chip.textContent.trim();
    renderResults();
  }));

  const LB=window.LegalBase;
  const FALLBACK_OFFICIAL_SOURCES = LB.OFFICIAL_SOURCES.map(x=>({title:x.mk,url:x.url,category:x.category,jurisdiction:x.jurisdiction}));

  async function getOfficialSources(){
    try{
      const response=await fetch(API_BASE+"/api/web-sources",{headers:{accept:"application/json"}});
      const data=await response.json();
      if(response.ok && data.ok && Array.isArray(data.sources)) return data.sources;
    }catch{}
    return FALLBACK_OFFICIAL_SOURCES;
  }

  // ---------------------------------------------------------------------------
  // Legal Base workspace. Every panel shows what the backend returned and nothing more.
  // ---------------------------------------------------------------------------
  function openWorkspace(tag,title,text){
    $("#workspaceTag").textContent=tag;
    $("#workspaceTitle").textContent=title;
    $("#workspaceText").textContent=text;
    $("#workspaceLinks").replaceChildren();
    $("#sourceWorkspace").hidden=false;
    $("#sourceWorkspace").scrollIntoView({behavior:"smooth",block:"start"});
    $("#sourceWorkspace").focus({preventScroll:true});
    return $("#workspaceLinks");
  }

  function capState(key){
    return LB.capabilityState(key, capabilitiesState==="ready" ? systemCapabilities : null);
  }

  function statusBanner(key,textMk,textEn){
    const st=capState(key);
    return el("div",{class:`wsBanner ${st.active ? "live" : ""}`,role:"note"},
      el("b",{text:T("Статус: ","Status: ")+T(st.mk,st.en)}),
      T(textMk,textEn));
  }

  function officialSourceCard(src){
    const meta=LB.OFFICIAL_SOURCES.find(x=>x.url===src.url) || null;
    const jur=LB.JURISDICTION_LABELS[src.jurisdiction];
    return el("a",{class:"sourceLink",href:src.url,target:"_blank",rel:"noopener noreferrer"},
      el("span",{class:"layerTag",text:T("Слој 1 · Официјален извор","Layer 1 · Official source")}),
      el("b",{text:meta ? T(meta.mk,meta.en) : src.title}),
      el("small",{text:[jur ? T(jur.mk,jur.en) : src.jurisdiction, meta ? T(meta.kindMk,meta.kindEn) : src.category].filter(Boolean).join(" · ")+" ↗"}));
  }

  function versionTable(v){
    const rows=LB.versionRows(v,lang);
    return el("table",{class:"versionTable"},el("tbody",{},rows.map(([k,val])=>el("tr",{},el("th",{scope:"row",text:k}),el("td",{text:val})))));
  }

  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // Labels come from the backend's publicStatus (computed server-side); see assets/legal-base.js.
  function articleStatusLabel(article){ return LB.articleStatus(article.publicStatus,lang).label; }
  function articleStatusClass(article){ return LB.articleStatus(article.publicStatus,lang).tone; }

  async function fetchInstruments(){
    const response=await fetch(API_BASE+"/api/instruments",{headers:{accept:"application/json"}});
    const data=await response.json();
    if(!response.ok || !data.ok || !Array.isArray(data.instruments)) throw new Error(data?.error || "instrument_api_error");
    return data.instruments;
  }

  const REVIEW_LABELS={
    mk:{approved:"одобрено",reviewed:"прегледано",pending:"чека проверка",rejected:"одбиено"},
    en:{approved:"approved",reviewed:"reviewed",pending:"pending review",rejected:"rejected"}
  };
  function reviewLabel(v){ return REVIEW_LABELS[lang][v] || REVIEW_LABELS[lang].pending; }

  function renderCoverage(instruments){
    const root=$("#coverageTable");
    if(!root) return;
    if(!instruments){
      root.innerHTML=`<p>${lang==="mk" ? "Регистарот моментално не е достапен. Покриеноста не може да се прикаже." : "The registry is currently unavailable. Coverage cannot be shown."}</p>`;
      return;
    }
    const withText=instruments.filter(i=>Number(i.articleCount)>0);
    const metaOnly=instruments.length-withText.length;
    const rows=withText.map(i=>`<tr><td><b>${escapeHtml(i.shortTitle || "")}</b> ${escapeHtml(i.title)}</td><td class="num">${Number(i.articleCount)}</td><td>${escapeHtml(reviewLabel(i.humanReviewStatus))}</td></tr>`).join("");
    root.innerHTML=withText.length
      ? `<table class="coverageTable"><caption>${lang==="mk" ? "Закони со текст член-по-член" : "Laws with article-level text"}</caption><thead><tr><th scope="col">${lang==="mk" ? "Закон" : "Law"}</th><th scope="col">${lang==="mk" ? "Членови" : "Articles"}</th><th scope="col">${lang==="mk" ? "Човечка контрола" : "Human Gate"}</th></tr></thead><tbody>${rows}</tbody></table>`
        + `<p class="help u-inline-22">${lang==="mk" ? `Уште ${metaOnly} закони се во регистарот само со метаподатоци, без внесен текст; за нив AI истражувачот не одговара.` : `${metaOnly} more laws are in the registry with metadata only and no text; the AI Researcher does not answer for them.`}</p>`
      : `<p>${lang==="mk" ? "Моментално нема закон со внесен текст член-по-член." : "No law currently has article-level text."}</p>`;
  }

  async function hydrateInstrumentSelect(){
    const select=$("#instrumentSelect");
    if(!select) return;
    const current=select.value || "auto";
    const autoLabel=lang==="mk" ? "Автоматски избери закон" : "Automatically choose law";
    try{
      const instruments=await fetchInstruments();
      renderCoverage(instruments);
      zppInstrument=instruments.find(i=>i.canonicalKey==="mk:zpp") || null;
      renderZppTimeline();
      select.innerHTML=`<option value="auto">${autoLabel}</option>`+
        instruments.map(inst=>{
          const count=Number(inst.articleCount || 0);
          const suffix=count>0
            ? (lang==="mk" ? ` · ${count} членови` : ` · ${count} articles`)
            : (lang==="mk" ? " · само метаподатоци" : " · metadata only");
          return `<option value="${escapeHtml(inst.canonicalKey)}">${escapeHtml((inst.shortTitle || inst.title)+ " · " + inst.title + suffix)}</option>`;
        }).join("");
      if([...select.options].some(o=>o.value===current)) select.value=current;
    }catch{
      renderCoverage(null);
      zppInstrument=null;
      renderZppTimeline();
      select.innerHTML=`
        <option value="auto">${autoLabel}</option>
        <option value="mk:zro">ЗРО · Закон за работните односи</option>
        <option value="mk:zkp">ЗКП · Закон за кривичната постапка</option>`;
      if([...select.options].some(o=>o.value===current)) select.value=current;
    }
  }

  async function fetchArticles(instrumentKey,params={}){
    const url=new URL(API_BASE+"/api/articles");
    url.searchParams.set("instrument",instrumentKey);
    for(const [k,v] of Object.entries(params)){
      if(v!==undefined && v!==null && String(v)!=="") url.searchParams.set(k,String(v));
    }
    const response=await fetch(url,{headers:{accept:"application/json"}});
    let data=null;
    try{ data=await response.json(); }catch{}
    if(!response.ok || !data || !data.ok){
      const error=new Error(data?.message || data?.error || "article_api_error");
      error.status=response.status; error.body=data;
      throw error;
    }
    return data;
  }

  function renderArticleRows(root,data){
    const rows=data.articles || [];
    const instrument=data.instrument || {};
    if(!rows.length){
      root.innerHTML=`<div class="resultItem">${lang==="mk" ? "Нема пронајдени членови." : "No articles found."}</div>`;
      return;
    }

    root.innerHTML=rows.map(a=>`
      <details class="resultItem u-inline-23">
        <summary class="u-inline-24">
          <div class="resultTop">
            <div>
              <h4 class="u-inline-25">${lang==="mk" ? "Член" : "Article"} ${escapeHtml(a.articleNumber)}${a.heading ? " · "+escapeHtml(a.heading) : ""}</h4>
              <div class="meta">${escapeHtml(a.sourceIssueNumber || instrument.gazetteReference || "")} · ${escapeHtml(a.sourceIssueDate || "")}</div>
            </div>
            <span class="badge ${articleStatusClass(a)}">${escapeHtml(articleStatusLabel(a))}</span>
          </div>
        </summary>
        <div class="u-inline-26">${escapeHtml(a.text)}</div>
        <div class="u-inline-27">
          <a class="btn light" href="${escapeHtml(a.sourceUrl)}" target="_blank" rel="noopener noreferrer">
            ${lang==="mk" ? "Отвори извор ↗" : "Open source ↗"}
          </a>
          <button class="btn light askArticleBtn" type="button"
            data-article="${escapeHtml(a.articleNumber)}"
            data-instrument="${escapeHtml(instrument.canonicalKey || "")}"
            data-title="${escapeHtml(instrument.title || "")}">
            ${lang==="mk" ? "Прашај AI за овој член" : "Ask AI about this article"}
          </button>
        </div>
      </details>`).join("");

    root.querySelectorAll(".askArticleBtn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        if($("#instrumentSelect")) $("#instrumentSelect").value=btn.dataset.instrument || "auto";
        $("#legalQuestion").value=(lang==="mk"
          ? `Објасни го член ${btn.dataset.article} од ${btn.dataset.title}, неговото практично значење и ограничувањата на верзијата.`
          : `Explain Article ${btn.dataset.article} of ${btn.dataset.title}, its practical meaning and version limitations.`);
        document.querySelector("#research").scrollIntoView({behavior:"smooth",block:"start"});
        $("#legalQuestion").focus();
      });
    });
  }

  function versionRefusal(body){
    const box=el("div",{class:"stateBox"},
      el("h4",{style:"margin:0 0 6px",text:T("Верзијата не може безбедно да се утврди","The version cannot be resolved safely")}),
      el("p",{text:body?.message || T("Наведете датум.","Enter a date.")}));
    (body?.versions || []).forEach(v=>box.append(el("div",{class:"versionBox"},el("b",{text:v.label || "—"}),versionTable(v))));
    return box;
  }

  async function openLawBrowser(instrumentKey,opts={}){
    const root=openWorkspace(T("Слој 2 · Член и верзија","Layer 2 · Article and version"),T("Закони и прописи","Laws & regulations"),
      T("Секој закон е одделен инструмент со сопствен извор, верзија и статус на човечка контрола.","Each law is a separate instrument with its own source, version and Human Gate status."));

    const back=el("button",{class:"btn light",type:"button",id:"backToLawRegistry",onclick:openLawsRegistry},T("← Сите закони","← All laws"));
    const query=el("input",{id:"lawArticleQuery",type:"search","aria-label":T("Пребарај членови","Search articles"),placeholder:T("Пребарај член, поим или институт...","Search article, term or legal concept..."),style:"flex:1;min-width:220px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink)"});
    const date=el("input",{id:"lawArticleDate",type:"date","aria-label":T("Датум на верзијата (опционално)","Version date (optional)"),value:opts.date || "",style:"padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink)"});
    const searchBtn=el("button",{class:"btn primary",type:"button",id:"lawArticleSearchBtn"},T("Пребарај членови","Search articles"));
    const resetBtn=el("button",{class:"btn light",type:"button",id:"lawArticleResetBtn"},T("Први членови","First articles"));
    const stats=el("div",{id:"lawCorpusStats",class:"meta",style:"margin-top:10px"});
    const versionBox=el("div",{id:"lawVersionBox"});
    const results=el("div",{id:"lawArticleResults",style:"display:grid;gap:12px;grid-column:1/-1"});
    const loadMore=el("button",{class:"btn light",type:"button",id:"lawLoadMoreBtn",hidden:true},T("Вчитај уште","Load more"));

    root.append(
      el("div",{style:"grid-column:1/-1"},back),
      el("div",{class:"resultItem",style:"grid-column:1/-1"},
        el("div",{style:"display:flex;gap:10px;flex-wrap:wrap;align-items:center"},query,date,searchBtn,resetBtn),
        el("small",{class:"help",text:T("Датумот е потребен само кога законот има повеќе верзии.","A date is needed only when the law has several versions.")}),
        stats),
      el("div",{style:"grid-column:1/-1"},versionBox),
      results,
      el("div",{style:"grid-column:1/-1;text-align:center"},loadMore));

    let offset=0;
    let currentQuery="";
    let loadSeq=0;

    const load=async({append=false}={})=>{
      const seq=++loadSeq;
      const requestedOffset=offset;
      const requestedQuery=currentQuery;
      const requestedDate=date.value;
      results.setAttribute("aria-busy","true");
      if(!append) results.innerHTML=`<div class="resultItem">${T("Се вчитуваат членовите...","Loading articles...")}</div>`;
      try{
        const data=await fetchArticles(instrumentKey,{q:requestedQuery,limit:40,offset:requestedOffset,date:requestedDate});
        if(seq!==loadSeq) return;
        const counts=data.statusCounts || {};
        const inst=data.instrument || {};
        $("#workspaceTitle").textContent=T("Закони и прописи · ","Laws & regulations · ")+(inst.shortTitle || inst.title || instrumentKey);
        $("#workspaceText").textContent=inst.notes || "";
        stats.textContent=[
          `${inst.shortTitle || inst.title} · ${data.total} ${T("членови","articles")}`,
          `${LB.articleStatus("historical",lang).label}: ${counts.historical || 0}`,
          `${LB.articleStatus("version_review",lang).label}: ${counts.needs_version_review || 0}`,
          `${LB.articleStatus("current_verified",lang).label}: ${counts.current_consolidated || 0}`
        ].join(" · ");
        if(!append){
          versionBox.replaceChildren(el("div",{class:"versionBox"},
            el("b",{text:T("Верзија на прикажаниот текст","Version of the text shown")}),
            versionTable(data.instrumentVersion),
            inst.canonicalSourceUrl ? el("p",{style:"margin:8px 0 0"},el("a",{href:inst.canonicalSourceUrl,target:"_blank",rel:"noopener noreferrer"},T("Слој 1 · Официјален извор ↗","Layer 1 · Official source ↗"))) : null));
        }
        if(append){
          const temp=document.createElement("div");
          renderArticleRows(temp,data);
          while(temp.firstChild) results.appendChild(temp.firstChild);
        }else{
          renderArticleRows(results,data);
        }
        offset=requestedOffset+data.articles.length;
        loadMore.hidden=Boolean(requestedQuery) || offset>=data.filteredCount;
      }catch(error){
        if(seq!==loadSeq) return;
        versionBox.replaceChildren();
        if(error.status===409){
          results.replaceChildren(versionRefusal(error.body));
        }else if(error.status===404 && error.body?.error==="no_articles"){
          results.replaceChildren(el("div",{class:"resultItem",text:T("За овој закон има само официјални метаподатоци; текст член-по-член не е внесен.","Only official metadata exists for this law; article-level text is not loaded.")}));
        }else{
          results.innerHTML=`<div class="resultItem">${T("Corpus API моментално не е достапен.","Corpus API is currently unavailable.")}</div>`;
        }
        stats.textContent="";
        loadMore.hidden=true;
      }finally{
        if(seq===loadSeq) results.removeAttribute("aria-busy");
      }
    };

    const run=()=>{ currentQuery=query.value.trim(); offset=0; load(); };
    searchBtn.addEventListener("click",run);
    query.addEventListener("keydown",e=>{ if(e.key==="Enter") run(); });
    date.addEventListener("change",()=>{ offset=0; load(); });
    resetBtn.addEventListener("click",()=>{ query.value=""; currentQuery=""; offset=0; load(); });
    loadMore.addEventListener("click",()=>load({append:true}));
    await load();
  }

  async function openZroBrowser(){ return openLawBrowser("mk:zro"); }
  async function openZkpBrowser(){ return openLawBrowser("mk:zkp"); }

  function statusGlossary(){
    const items=[
      [T("Официјални метаподатоци","Official metadata"),T("Назив, Службен весник и врска до официјалниот извор. Нема текст.","Title, Official Gazette reference and link to the official source. No text.")],
      [T("Текст член-по-член","Article-level text"),T("Внесен текст врзан за една верзија. Сам по себе не значи дека е тековен.","Loaded text bound to one version. On its own it does not mean the text is current.")],
      [LB.articleStatus("historical",lang).label,T("Снимок на текстот од одреден извор и датум. Не е потврден како важечки.","A snapshot of the text from a given source and date. Not confirmed as in force.")],
      [LB.articleStatus("version_review",lang).label,T("Текстот чека проверка на верзијата.","The text awaits version review.")],
      [LB.articleStatus("current_verified",lang).label,T("Само кога серверскиот систем потврдува дека текстот е тековен пречистен и одобрен преку човечка контрола.","Only when the backend says the text is current consolidated AND approved through the Human Gate.")]
    ];
    return el("dl",{class:"glossary"},items.flatMap(([k,v])=>[el("dt",{text:k}),el("dd",{text:v})]));
  }

  function lawCard(inst){
    const layers=LB.instrumentLayers(inst,lang);
    const actions=el("div",{style:"display:flex;gap:8px;flex-wrap:wrap"});
    if(Number(inst.articleCount)>0) actions.append(el("button",{type:"button",class:"btn light lawInstrumentCard","data-key":inst.canonicalKey,onclick:()=>openLawBrowser(inst.canonicalKey)},T("Прегледај членови","Browse articles")));
    if(inst.canonicalSourceUrl) actions.append(el("a",{class:"btn light",href:inst.canonicalSourceUrl,target:"_blank",rel:"noopener noreferrer"},T("Официјален извор ↗","Official source ↗")));
    return el("article",{class:"lawCard"},
      el("h4",{},el("b",{text:inst.shortTitle || ""})," ",inst.title),
      inst.gazetteReference ? el("div",{class:"meta",text:T("Сл. весник: ","Official Gazette: ")+inst.gazetteReference}) : null,
      el("ul",{class:"layerList"},layers.map(l=>el("li",{class:l.present ? "yes" : ""},l.label,el("span",{class:"sr",text:l.present ? T(" (да)"," (yes)") : T(" (не)"," (no)")})))),
      actions);
  }

  async function openLawsRegistry(){
    const root=openWorkspace(T("Слој 1–2 · Регистар","Layer 1–2 · Registry"),T("Закони и прописи","Laws & regulations"),
      T("Законите се додаваат еден по еден: прво официјални метаподатоци и доказно потекло, па текст член-по-член врзан за верзија, па проверка со човечка контрола.","Laws are added one by one: first official metadata and provenance, then article-level text bound to a version, then Human Gate review."));
    root.append(el("div",{style:"grid-column:1/-1"},
      el("details",{class:"helpBox"},el("summary",{text:T("Што значат ознаките","What the labels mean")}),statusGlossary()),
      el("div",{class:"resultItem",id:"lawRegistryList",text:T("Се вчитува регистарот...","Loading law registry...")})));
    const list=$("#lawRegistryList");
    try{
      const instruments=await fetchInstruments();
      const withText=instruments.filter(i=>Number(i.articleCount)>0);
      const metaOnly=instruments.filter(i=>!(Number(i.articleCount)>0));
      list.className="";
      list.replaceChildren(
        el("h4",{text:T(`Со текст член-по-член (${withText.length})`,`With article-level text (${withText.length})`)}),
        el("div",{class:"wsGrid two"},withText.map(lawCard)),
        el("h4",{style:"margin-top:16px",text:T(`Само официјални метаподатоци (${metaOnly.length})`,`Official metadata only (${metaOnly.length})`)}),
        el("div",{class:"wsGrid two"},metaOnly.map(lawCard)));
    }catch{
      list.replaceChildren(T("Регистарот моментално не е достапен. Прикажани се само законите со познат корпус.","The registry is currently unavailable. Only laws with a known corpus are shown."),
        el("div",{class:"wsGrid two",style:"margin-top:10px"},
          el("button",{class:"sourceLink lawInstrumentCard",type:"button","data-key":"mk:zro",onclick:()=>openLawBrowser("mk:zro")},el("b",{text:"ЗРО · Закон за работните односи"})),
          el("button",{class:"sourceLink lawInstrumentCard",type:"button","data-key":"mk:zkp",onclick:()=>openLawBrowser("mk:zkp")},el("b",{text:"ЗКП · Закон за кривичната постапка"}))));
    }
  }

  async function openCaseLawRegistry(){
    const root=openWorkspace(T("Слој 3 · Судска практика","Layer 3 · Case law"),T("Судска практика","Case law"),
      T("Официјални судски бази. AI Advokat не ја заменува проверката на оригиналната одлука и не прикажува одлуки што не се индексирани.","Official court databases. AI Advokat does not replace checking the original decision and shows no decision that is not indexed."));
    const st=capState("cases");
    const live=st.active;
    root.append(el("div",{style:"grid-column:1/-1"},statusBanner("cases",
      live
        ? "Индексираната судска практика е вклучена. Пребарувањето по клучен збор е достапно; филтрите за суд, датум и исход остануваат исклучени додека API-то не ги поддржи."
        : "Индексираната судска практика не е вклучена. Подолу се официјалните бази на судовите; филтрите ќе работат кога корпусот ќе биде вклучен.",
      live
        ? "Indexed case law is enabled. Keyword search is available; court, date and outcome filters remain disabled until the API supports them."
        : "Indexed case law is not enabled. Below are the courts' official databases; the filters will work once the corpus is enabled.")));
    const sources=(await getOfficialSources()).filter(s=>s.category==="court" && s.jurisdiction==="MK");
    const courtSelect=el("select",{id:"caseCourt",disabled:true},el("option",{value:"",text:T("Сите судови","All courts")}),sources.map(s=>{const m=LB.OFFICIAL_SOURCES.find(x=>x.url===s.url); return el("option",{value:s.url,text:m ? T(m.mk,m.en) : s.title});}));
    const field=(id,labelMk,labelEn,control)=>el("div",{},el("label",{for:id,text:T(labelMk,labelEn)}),control);
    const issue=el("input",{id:"caseIssue",type:"search",disabled:!live,placeholder:T("на пр. отказ, притвор","e.g. dismissal, detention")});
    const filters=el("fieldset",{class:"filterSet"},
      el("legend",{text:T("Филтри за индексирана судска практика","Filters for indexed case law")}),
      el("div",{class:"filterGrid"},
        field("caseCourt","Суд","Court",courtSelect),
        field("caseIssue","Правно прашање (клучен збор)","Legal issue (keyword)",issue),
        field("caseDate","Датум на одлука","Decision date",el("input",{id:"caseDate",type:"date",disabled:true})),
        field("caseOutcome","Исход","Outcome",el("select",{id:"caseOutcome",disabled:true},el("option",{value:"",text:T("Секој исход","Any outcome")})))),
      el("small",{class:"help",text:live
        ? T("Пребарувањето работи само по клучен збор преку јавниот корпус; филтрите за суд, датум и исход сè уште не се поддржани од API-то.","Search works by keyword only through the public corpus; court, date and outcome filters are not yet supported by the API.")
        : T("Сите филтри се исклучени: индексирана судска практика не е вклучена. Нема прикажани ниту измислени предмети.","All filters are disabled: indexed case law is not enabled. No cases are shown or invented.")}));
    const results=el("div",{id:"caseResults",role:"status",class:"wsGrid"});
    root.append(el("div",{style:"grid-column:1/-1"},filters,results),
      el("h4",{style:"grid-column:1/-1;margin:6px 0 0",text:T("Официјални бази на судовите","Official court databases")}),
      ...sources.map(officialSourceCard));
    if(live){
      issue.addEventListener("keydown",async e=>{
        if(e.key!=="Enter" || issue.value.trim().length<2) return;
        results.textContent=T("Се пребарува…","Searching…");
        try{
          const url=new URL(API_BASE+"/api/search"); url.searchParams.set("q",issue.value.trim()); url.searchParams.set("type","case"); url.searchParams.set("limit","20");
          const data=await (await fetch(url,{headers:{accept:"application/json"}})).json();
          if(!data.ok) throw new Error();
          results.replaceChildren(...(data.results.length ? data.results.map(x=>el("div",{class:"resultItem"},el("b",{text:x.title}),el("div",{class:"meta",text:[x.meta,x.date].filter(Boolean).join(" · ")}),x.url ? el("a",{href:x.url,target:"_blank",rel:"noopener noreferrer"},T("Отвори одлука ↗","Open decision ↗")) : null)) : [el("p",{text:i18n[lang].noResults})]));
        }catch{ results.textContent=T("Пребарувањето не е достапно.","Search is unavailable."); }
      });
    }
  }

  let workspaceOpener=null;
  function bindCard(id,open){
    const card=$(id);
    const button=card.querySelector("button.cardAction");
    const go=()=>{ workspaceOpener=button; open(); };
    button.addEventListener("click",go);
    card.addEventListener("click",e=>{ if(!e.target.closest("button,a")) go(); });
  }
  bindCard("#lawsCard",openLawsRegistry);
  bindCard("#casesCard",openCaseLawRegistry);

  async function openInternationalRegistry(){
    const root=openWorkspace(T("Слој 1 и 3 · Меѓународни извори","Layer 1 and 3 · International sources"),T("ЕСПЧ и меѓународни извори","ECHR & international sources"),
      T("Европски извори со сопствена јурисдикција и правна природа. Не се прикажуваат како македонски прописи.","European sources with their own jurisdiction and legal nature. They are not presented as Macedonian legislation."));
    root.append(el("div",{style:"grid-column:1/-1"},statusBanner("echr",
      "Индексиран корпус на одлуки на ЕСПЧ и СПЕУ не е вклучен. AI истражувачот не одговара врз овие извори.",
      "An indexed corpus of ECtHR and CJEU decisions is not enabled. The AI Researcher does not answer from these sources.")));
    const sources=(await getOfficialSources()).filter(s=>["international_court","international_organization"].includes(s.category));
    sources.forEach(src=>{
      const meta=LB.OFFICIAL_SOURCES.find(x=>x.url===src.url);
      const jur=LB.JURISDICTION_LABELS[src.jurisdiction];
      root.append(el("article",{class:"lawCard"},
        el("span",{class:"layerTag",text:T("Слој 1 · Официјален извор","Layer 1 · Official source")}),
        el("h4",{text:meta ? T(meta.mk,meta.en) : src.title}),
        el("dl",{class:"glossary",style:"margin:0"},
          el("dt",{text:T("Јурисдикција","Jurisdiction")}),el("dd",{text:jur ? T(jur.mk,jur.en) : src.jurisdiction}),
          el("dt",{text:T("Вид на извор","Source type")}),el("dd",{text:meta ? T(meta.kindMk,meta.kindEn) : src.category}),
          el("dt",{text:T("Во AI Advokat","In AI Advokat")}),el("dd",{text:T("Само врска до официјалната база · не е индексирано","Link to the official database only · not indexed")})),
        el("a",{class:"btn light",href:src.url,target:"_blank",rel:"noopener noreferrer"},T("Отвори ","Open ")+(meta ? meta.en.split(" — ").pop() : src.title)+" ↗")));
    });
  }

  bindCard("#echrCard",openInternationalRegistry);

  // ---- Versions and amendments: compares two versions the backend returns; no legal-status inference.
  async function openVersionsWorkspace(){
    const root=openWorkspace(T("Слој 2 · Верзии и измени","Layer 2 · Versions and amendments"),T("Верзии и измени","Versions & amendments"),
      T("Споредба на текстот на ист член во две верзии што backend-от ги враќа. Споредбата е текстуална и не утврдува правно дејство.","Compares the text of one article in two versions returned by the backend. The comparison is textual and does not determine legal effect."));
    root.append(el("div",{style:"grid-column:1/-1"},statusBanner("versions",
      "Споредбата работи само врз верзии што се внесени со датумски метаподатоци. Секоја верзија го покажува својот статус и човечка контрола.",
      "The comparison works only on versions loaded with date metadata. Each version shows its own status and Human Gate.")));
    const lawSelect=el("select",{id:"versionLaw"});
    const article=el("input",{id:"versionArticle",type:"text",inputmode:"text",placeholder:T("на пр. 12 или 12-а","e.g. 12 or 12-a"),required:true});
    const show=el("button",{class:"btn primary",type:"submit"},T("Прикажи верзии","Show versions"));
    const out=el("div",{id:"versionOut",role:"status"});
    const form=el("form",{class:"wsForm",style:"grid-column:1/-1"},
      el("div",{class:"row"},
        el("div",{},el("label",{for:"versionLaw",text:T("Закон","Law")}),lawSelect),
        el("div",{},el("label",{for:"versionArticle",text:T("Член","Article")}),article)),
      el("div",{},show));
    root.append(form,el("div",{style:"grid-column:1/-1"},out));
    try{
      const instruments=(await fetchInstruments()).filter(i=>Number(i.articleCount)>0);
      lawSelect.replaceChildren(...instruments.map(i=>el("option",{value:i.canonicalKey,text:`${i.shortTitle || ""} · ${i.title}`})));
    }catch{
      lawSelect.replaceChildren(el("option",{value:"",text:T("Регистарот не е достапен","Registry unavailable")}));
      show.disabled=true;
    }

    const column=(titleText,v,art)=>el("section",{class:"compareCol","aria-label":titleText},
      el("h4",{text:titleText}),versionTable(v),
      art ? el("div",{class:"compareText",text:art.text}) : el("p",{class:"help",text:T("Членот не постои во оваа верзија.","The article does not exist in this version.")}));

    async function compare(key,num,oldV,newV){
      out.replaceChildren(el("p",{text:T("Се вчитуваат двете верзии…","Loading both versions…")}));
      const fetchAt=async v=>{
        try{ const d=await fetchArticles(key,{article:num,date:LB.versionStartDate(v),limit:1}); return {v:d.instrumentVersion || v,art:d.articles[0] || null}; }
        catch(e){ return {v,art:null,error:e}; }
      };
      const [a,b]=await Promise.all([fetchAt(oldV),fetchAt(newV)]);
      const diff=a.art && b.art ? LB.diffWords(a.art.text,b.art.text) : null;
      const diffBox=el("div",{});
      if(a.art && b.art){
        if(a.art.text===b.art.text) diffBox.append(el("p",{class:"wsBanner",text:T("Текстот на членот е идентичен во двете верзии (текстуална споредба).","The article text is identical in both versions (textual comparison).")}));
        else if(diff){
          const view=el("div",{class:"diffView","aria-label":T("Текстуални разлики","Textual differences")});
          // Text markers ([− …] / [+ …]) carry the meaning; colour is only a secondary cue.
          diff.forEach(part=>{
            if(part.type==="same"){ view.append(document.createTextNode(part.text)); return; }
            const added=part.type==="added";
            view.append(el("span",{class:"diffMark",text:added ? "[+ " : "[− "}),el(added ? "ins" : "del",{text:part.text.trim()}),el("span",{class:"diffMark",text:" ]"})," ");
          });
          diffBox.append(el("h4",{text:T("Текстуални разлики","Textual differences")}),
            el("p",{class:"help",text:T("[− …] отстранет текст · [+ …] додаден текст. Ова не е правна оцена на измената.","[− …] removed text · [+ …] added text. This is not a legal assessment of the amendment.")}),view);
        }else diffBox.append(el("p",{class:"help",text:T("Текстот е предолг за автоматска споредба; споредете ги колоните.","The text is too long for automatic comparison; compare the columns.")}));
      }
      out.replaceChildren(el("div",{class:"wsGrid two"},column(T("Постара верзија","Older version"),a.v,a.art),column(T("Понова верзија","Newer version"),b.v,b.art)),diffBox);
    }

    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const key=lawSelect.value, num=article.value.trim();
      if(!key || !num){ out.replaceChildren(el("p",{text:T("Изберете закон и внесете број на член.","Choose a law and enter an article number.")})); article.focus(); return; }
      out.replaceChildren(el("p",{text:T("Се проверуваат верзиите…","Checking versions…")}));
      let versions=[];
      try{
        // Metadata probe only: a deliberately early ISO date makes the existing
        // version resolver return its candidate list without treating today's
        // approved version as proof that no historical/future version exists.
        await fetchArticles(key,{article:num,limit:1,date:"0001-01-01"});
      }catch(probe){
        if(probe.status===409) versions=(probe.body?.versions || []).filter(v=>v && v.label);
        else throw probe;
      }
      if(versions.length<2){
        try{
          const d=await fetchArticles(key,{article:num,limit:1});
          out.replaceChildren(
            el("div",{class:"wsBanner",text:T("Во корпусот нема две верзии со текст што може безбедно да се споредат.","The corpus does not contain two text-bearing versions that can be compared safely.")}),
            column(T("Внесена верзија","Loaded version"),d.instrumentVersion,d.articles[0] || null));
          return;
        }catch(err){
          const fallback=(err.body?.versions || []).filter(v=>v && v.label);
          if(fallback.length>=2) versions=fallback;
          else{
            out.replaceChildren(err.status===409 ? versionRefusal(err.body) : el("p",{text:T("Верзиите не можат да се вчитаат.","The versions cannot be loaded.")}));
            return;
          }
        }
      }
      {
        const pick=(id,labelMk,labelEn,sel)=>{
          const s=el("select",{id},versions.map((v,i)=>el("option",{value:String(i),disabled:!LB.versionStartDate(v),text:`${v.label} · ${LB.versionStartDate(v) || T("нема датум на почеток","no start date")} · ${LB.versionCategoryLabel(v,lang)}`})));
          s.value=String(sel);
          return el("div",{},el("label",{for:id,text:T(labelMk,labelEn)}),s);
        };
        const ordered=versions.map((v,i)=>({v,i})).sort((x,y)=>String(LB.versionStartDate(x.v) || "").localeCompare(String(LB.versionStartDate(y.v) || "")));
        const pickOld=pick("versionOld","Постара верзија","Older version",ordered[0].i);
        const pickNew=pick("versionNew","Понова верзија","Newer version",ordered[ordered.length-1].i);
        const go=el("button",{class:"btn primary",type:"button"},T("Спореди","Compare"));
        out.replaceChildren(
          el("p",{text:T(`Внесени се ${versions.length} верзии. Изберете кои две да се споредат.`,`${versions.length} versions are loaded. Choose which two to compare.`)}),
          el("div",{class:"wsGrid two"},versions.map(v=>el("div",{class:"versionBox"},el("b",{text:v.label}),versionTable(v)))),
          el("div",{class:"wsForm"},el("div",{class:"row"},pickOld,pickNew),el("div",{},go)));
        go.addEventListener("click",()=>{
          const o=versions[Number($("#versionOld").value)], n=versions[Number($("#versionNew").value)];
          if(o===n){ out.append(el("p",{text:T("Изберете две различни верзии.","Choose two different versions.")})); return; }
          compare(key,num,o,n);
        });
      }
    });
  }

  bindCard("#versionsCard",openVersionsWorkspace);

  // ---- Citation audit (PREVIEW): finds the source, never decides support on its own.
  async function openCitationAudit(){
    const root=openWorkspace(T("Проверка меѓу слоевите","Cross-layer check"),T("Проверка на цитати","Citation audit"),
      T("Внесете тврдење и цитат. Системот само проверува дали изворот постои во порталот или во официјалниот директориум и го прикажува; дали го поддржува тврдењето одлучувате вие.","Enter a claim and a citation. The system only checks whether the source exists in the portal or the official directory and shows it; you decide whether it supports the claim."));
    root.append(el("div",{style:"grid-column:1/-1"},statusBanner("citationAudit",
      "PREVIEW: системот никогаш не означува „поддржано“ или „не е поддржано“ сам и никогаш не го поправа цитатот.",
      "PREVIEW: the system never marks “supported” or “unsupported” on its own and never corrects the citation.")));
    const claim=el("textarea",{id:"auditClaim",rows:"3",maxlength:"600","aria-describedby":"auditClaimHelp",placeholder:T("Тврдење што сакате да го проверите","Claim you want to check")});
    const kinds=[["article","Член од закон","Article of a law"],["doi","DOI","DOI"],["url","Официјален извор (URL)","Official source (URL)"],["case","Судска одлука","Court decision"]];
    const radios=el("div",{class:"radioRow"},kinds.map(([v,mk,en],i)=>el("label",{},el("input",{type:"radio",name:"auditKind",value:v,checked:i===0}),T(mk,en))));
    const law=el("select",{id:"auditLaw"});
    const art=el("input",{id:"auditArticle",type:"text",placeholder:T("на пр. 12","e.g. 12")});
    const date=el("input",{id:"auditDate",type:"date"});
    const doi=el("input",{id:"auditDoi",type:"text",placeholder:"10.5281/zenodo.…"});
    const url=el("input",{id:"auditUrl",type:"url",placeholder:"https://"});
    const caseRef=el("input",{id:"auditCase",type:"text",placeholder:T("Суд, број и датум на одлуката","Court, number and date of the decision")});
    const fld=(id,mk,en,c)=>el("div",{"data-kind-field":""},el("label",{for:id,text:T(mk,en)}),c);
    const groups={
      article:el("div",{class:"row"},fld("auditLaw","Закон","Law",law),fld("auditArticle","Член","Article",art),fld("auditDate","Датум (ако законот има повеќе верзии)","Date (if the law has several versions)",date)),
      doi:el("div",{class:"row",hidden:true},fld("auditDoi","DOI","DOI",doi)),
      url:el("div",{class:"row",hidden:true},fld("auditUrl","Адреса на изворот","Source address",url)),
      case:el("div",{class:"row",hidden:true},fld("auditCase","Одлука","Decision",caseRef))
    };
    const result=el("div",{id:"auditResult",role:"status"});
    const form=el("form",{class:"wsForm",style:"grid-column:1/-1"},
      el("div",{},el("label",{for:"auditClaim",text:T("Тврдење","Claim")}),claim,el("small",{id:"auditClaimHelp",class:"help",text:T("Не внесувајте имиња на странки или доверливи податоци.","Do not enter party names or confidential data.")})),
      el("fieldset",{},el("legend",{text:T("Вид на цитат","Citation type")}),radios),
      ...Object.values(groups),
      el("div",{},el("button",{class:"btn primary",type:"submit"},T("Провери го изворот","Check the source"))));
    root.append(form,el("div",{style:"grid-column:1/-1"},result));
    radios.addEventListener("change",()=>{
      const k=form.querySelector('input[name="auditKind"]:checked').value;
      for(const [name,g] of Object.entries(groups)) g.hidden=name!==k;
    });
    try{
      law.replaceChildren(...(await fetchInstruments()).map(i=>el("option",{value:i.canonicalKey,text:`${i.shortTitle || ""} · ${i.title}${Number(i.articleCount)>0 ? "" : T(" · без текст"," · no text")}`})));
    }catch{ law.replaceChildren(el("option",{value:"",text:T("Регистарот не е достапен","Registry unavailable")})); }

    function verdictControls(){
      const status=el("p",{class:"help",role:"status"});
      const mk=(state,mkL,enL)=>el("button",{type:"button",class:"btn light",onclick:()=>{ status.replaceChildren(el("span",{class:"auditState","data-state":state,text:LB.auditLabel(state,lang)})," ",T("Оваа оцена е ваша и не се зачувува.","This assessment is yours and is not stored.")); }},T(mkL,enL));
      return el("div",{},
        el("p",{class:"help",text:T("Ваша оцена по споредбата (не се зачувува, не се испраќа):","Your assessment after comparing (not stored, not sent):")}),
        el("div",{class:"actions",style:"display:flex;gap:8px;flex-wrap:wrap"},mk("supported","Го поддржува","Supports it"),mk("unsupported","Не го поддржува","Does not support it")),
        status);
    }

    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const kind=form.querySelector('input[name="auditKind"]:checked').value;
      let verdict, evidence=null;
      result.replaceChildren(el("p",{text:T("Се проверува…","Checking…")}));
      if(kind==="article"){
        if(!law.value || !art.value.trim()){ result.replaceChildren(el("p",{text:T("Изберете закон и внесете член.","Choose a law and enter an article.")})); return; }
        let status=0, body=null;
        try{ body=await fetchArticles(law.value,{article:art.value.trim(),date:date.value,limit:1}); status=200; }
        catch(err){ status=err.status || 0; body=err.body || null; }
        verdict=LB.classifyArticleLookup(status,body);
        if(verdict.article) evidence=el("div",{class:"resultItem"},
          el("span",{class:"layerTag",text:T("Слој 2 · Член и верзија","Layer 2 · Article and version")}),
          el("b",{text:T("Член ","Article ")+verdict.article.articleNumber+(verdict.article.heading ? " · "+verdict.article.heading : "")}),
          el("div",{class:"meta",text:[articleStatusLabel(verdict.article),body.instrumentVersion?.label].filter(Boolean).join(" · ")}),
          el("div",{class:"compareText",text:verdict.article.text}),
          verdict.article.sourceUrl ? el("a",{href:verdict.article.sourceUrl,target:"_blank",rel:"noopener noreferrer"},T("Отвори официјален извор ↗","Open official source ↗")) : null);
        else if(verdict.versions?.length) evidence=versionRefusal(body);
      }else if(kind==="doi"){
        let records=[];
        try{ const d=await (await fetch(API_BASE+"/api/zenodo",{headers:{accept:"application/json"}})).json(); records=d.records || []; }
        catch{ records=null; }
        verdict=records===null ? {state:"source_unavailable",reason:"service_unavailable"} : LB.classifyDoi(doi.value,records);
        if(verdict.record) evidence=el("div",{class:"resultItem"},
          el("span",{class:"layerTag",text:T("Слој 4 · Стручна анализа","Layer 4 · Professional analysis")}),
          el("b",{text:verdict.record.title}),
          el("a",{href:verdict.record.publicUrl,target:"_blank",rel:"noopener noreferrer"},"https://doi.org/"+verdict.doi+" ↗"));
      }else if(kind==="url"){
        verdict=LB.classifySourceUrl(url.value);
        if(verdict.state==="unresolved") evidence=el("div",{class:"resultItem"},
          verdict.source ? el("span",{class:"layerTag",text:T("Слој 1 · Официјален извор","Layer 1 · Official source")}) : null,
          verdict.source ? el("b",{text:T(verdict.source.mk,verdict.source.en)}) : null,
          el("a",{href:url.value.trim(),target:"_blank",rel:"noopener noreferrer"},T("Отвори го изворот ↗","Open the source ↗")));
      }else{
        verdict=capState("cases").active
          ? {state:"source_unavailable",reason:"lookup_failed"}
          : {state:"source_unavailable",reason:"case_corpus_disabled"};
      }
      result.replaceChildren(el("div",{class:"stateBox"},
        el("h4",{style:"margin:0 0 6px"},T("Резултат: ","Result: "),el("span",{class:"auditState","data-state":verdict.state,text:LB.auditLabel(verdict.state,lang)})),
        el("p",{text:LB.auditReason(verdict.reason,lang)}),
        claim.value.trim() ? el("p",{class:"help"},el("b",{text:T("Тврдење: ","Claim: ")}),claim.value.trim()) : null,
        evidence,
        verdict.state==="unresolved" ? verdictControls() : el("p",{class:"failClosed",text:T("Цитатот не е изменет или „поправен“. Без извор, тврдењето останува непроверено.","The citation was not changed or “fixed”. Without a source the claim remains unverified.")})));
    });
  }

  bindCard("#citationsCard",openCitationAudit);

  function openDocumentsInfo(){
    const root=openWorkspace(T("Работен простор · ЗАКЛУЧЕНО","Workspace · LOCKED"),T("Документи и досиеја","Documents & case files"),
      T("Оваа функција е заклучена и во подготовка. Порталот не прима, не прикачува и не чува документи.","This feature is locked and in preparation. The portal does not accept, upload or store documents."));
    root.append(el("div",{style:"grid-column:1/-1"},
      statusBanner("documents",
        "Прикачувањето документи и работните простори се заклучени додека не се воведат автентикација, шифрирано чување, правила за задржување и контрола на пристап.",
        "Document upload and workspaces are locked until authentication, encrypted storage, retention rules and access controls are in place."),
      el("div",{class:"resultItem"},
        el("b",{text:T("Што може да вклучуваат идните работни простори","What future workspaces may include")}),
        el("ul",{class:"lockedList"},
          el("li",{text:T("хронологии на настани и процесни чекори","timelines of events and procedural steps")}),
          el("li",{text:T("доказни матрици (утврдени факти, наводи, спорни факти)","evidence matrices (established facts, allegations, disputed facts)")}),
          el("li",{text:T("работни белешки поврзани со членови и извори","working notes linked to articles and sources")}),
          el("li",{text:T("човечка проверка пред секоја употреба","Human Gate review before any use")})),
        el("p",{class:"help",text:T("Ништо од ова сè уште не е вклучено. Не испраќајте доверливи документи по е-пошта до порталот.","None of this is enabled yet. Do not send confidential documents to the portal by e-mail.")}))));
  }

  bindCard("#documentsCard",openDocumentsInfo);

  // ---------------------------------------------------------------------------
  // ZPP version timeline: static official metadata (assets/zpp-timeline.js) plus the
  // instrument's човечка контрола status from /api/instruments. Phase labels are statements
  // as of a fixed date and are withdrawn (not recomputed) once that date has passed.
  // ---------------------------------------------------------------------------
  let zppInstrument=null;
  function jurisdictionIsoDate(){
    const parts=new Intl.DateTimeFormat("en-CA",{
      timeZone:"Europe/Skopje",
      year:"numeric",
      month:"2-digit",
      day:"2-digit"
    }).formatToParts(new Date());
    const byType=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  }
  function renderZppTimeline(){
    const ZT=window.ZppTimeline, root=$("#zppItems");
    if(!ZT || !root) return;
    const tl=ZT.ZPP_TIMELINE, today=jurisdictionIsoDate(), stale=ZT.isStale(today);
    const L=lang==="en" ? "en" : "mk";
    const gate=ZT.humanGateLabel(zppInstrument,lang);
    $("#zppAsOf").textContent=stale
      ? T(`Ознаките за состојба беа точни на ${ZT.formatDate(tl.statusAsOf,"mk")} и сега се повлечени до нова проверка.`,`The status labels were accurate on ${ZT.formatDate(tl.statusAsOf,"en")} and are now withdrawn until re-checked.`)
      : T(`Ознаките за состојба важат на ${ZT.formatDate(tl.statusAsOf,"mk")}. Човечка проверка на законот: ${gate}.`,`Status labels as of ${ZT.formatDate(tl.statusAsOf,"en")}. Human Gate (law): ${gate}.`);
    root.replaceChildren(...tl.items.map(it=>{
      const phase=ZT.phaseFor(it,today);
      const dl=el("dl",{});
      ZT.dateRows(it,lang).forEach(r=>dl.append(el("dt",{text:r.label}),el("dd",{},r.iso ? el("time",{datetime:r.iso,text:r.value}) : el("span",{class:"help",style:"margin:0",text:r.value}))));
      dl.append(el("dt",{text:T("Човечка проверка на законот","Human Gate (law)")}),el("dd",{text:gate}));
      return el("li",{class:"zppItem","data-phase":phase.key},
        el("span",{class:"srcBadge",text:T("✓ Официјален извор · LDBIS","✓ Official source · LDBIS")}),
        el("p",{class:"gazette"},T("Сл. весник ","Off. Gazette "),it.gazette," ",el("small",{text:it.kindLabel[L]})),
        el("h4",{text:it.title[L]}),
        dl,
        el("span",{class:"phaseChip","data-phase":phase.key,text:phase[L]}),
        el("p",{class:"help",style:"margin:0",text:phase[L==="en" ? "noteEn" : "noteMk"]}),
        el("a",{href:it.sourceUrl,target:"_blank",rel:"noopener noreferrer"},T("Официјални метаподатоци (LDBIS) ↗","Official metadata (LDBIS) ↗")));
    }));
    const next=tl.items.find(i=>i.id==="zpp-151-2026");
    $("#zppTracks").replaceChildren(
      el("div",{class:"zppTrack"},
        el("b",{text:T("Патека пред 2027: 7/2011 + 124/2015","Pre-2027 track: 7/2011 + 124/2015")}),
        stale ? T("Повторна проверка е потребна.","Re-check required.")
          : T(`Се применува до почетокот на примената на 151/2026 (${ZT.formatDate(next.applicationFrom,"mk")}). Не е потврдена како тековен пречистен текст. човечка контрола: ${gate}.`,
              `Applies until 151/2026 begins to apply (${ZT.formatDate(next.applicationFrom,"en")}). Not confirmed as a current consolidated text. Human Gate: ${gate}.`)),
      el("div",{class:"zppTrack"},
        el("b",{text:T("Патека од 2027: 151/2026","2027 track: 151/2026")}),
        stale ? T("Повторна проверка е потребна.","Re-check required.")
          : T(`Објавен и стапен во сила; примена од ${ZT.formatDate(next.applicationFrom,"mk")}. Сè уште не се применува. човечка контрола: ${gate}.`,
              `Published and in force; application begins ${ZT.formatDate(next.applicationFrom,"en")}. Not yet applicable. Human Gate: ${gate}.`)));
  }

  function renderLayerLadder(){
    const root=$("#layerLadder");
    if(!root) return;
    root.replaceChildren(...LB.LAYERS.map(l=>el("li",{},
      el("span",{class:"num","aria-hidden":"true",text:String(l.n)}),
      el("span",{},el("b",{text:`${T("Слој","Layer")} ${l.n} · ${T(l.mk,l.en)}`}),el("small",{text:T(l.textMk,l.textEn)})))));
  }

  $("#closeWorkspace").addEventListener("click",()=>{
    $("#sourceWorkspace").hidden=true;
    (workspaceOpener || $("#lawsCard button.cardAction")).focus({preventScroll:true});
  });

  function currentMembershipKey(){
    try{return sessionStorage.getItem("ai_advokat_membership_key_v1") || "";}catch{return "";}
  }
  function updateMembershipKeyState(message){
    const node=$("#membershipKeyState");
    if(node) node.textContent=message || "";
  }
  const savedMembershipKey=currentMembershipKey();
  if(savedMembershipKey) $("#botMembershipKey").value=savedMembershipKey;

  $("#saveMembershipKey").addEventListener("click",async()=>{
    const key=$("#botMembershipKey").value.trim();
    try{
      if(key) sessionStorage.setItem("ai_advokat_membership_key_v1",key);
      else sessionStorage.removeItem("ai_advokat_membership_key_v1");
    }catch{}
    if(!key){ updateMembershipKeyState(lang==="mk" ? "Membership key е отстранет од сесијата." : "Membership key removed from this session."); return; }
    updateMembershipKeyState(lang==="mk" ? "Се проверува членството..." : "Checking membership...");
    try{
      const response=await fetch(API_BASE+"/api/membership/status",{headers:{"accept":"application/json","authorization":"Bearer "+key}});
      const data=await response.json();
      if(!response.ok || !data.ok) throw new Error("inactive");
      const m=data.membership;
      updateMembershipKeyState((lang==="mk" ? "Активно: " : "Active: ")+m.planCode.toUpperCase()+" · "+m.used+"/"+m.monthlyQuota+" · "+(lang==="mk" ? "преостануваат " : "remaining ")+m.remaining);
    }catch{
      updateMembershipKeyState(lang==="mk" ? "Клучот не е активен или не може да се провери." : "The key is inactive or could not be verified.");
    }
  });

  // ---------------------------------------------------------------------------
  // AI Researcher result rendering. Every refusal stays fail-closed: no answer text
  // is shown for a refused question, only the reason and the safe next step.
  // ---------------------------------------------------------------------------
  function el(tag,attrs={},...children){
    const node=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(v===null || v===undefined || v===false) continue;
      if(k==="class") node.className=v;
      else if(k==="text") node.textContent=v;
      else if(k.startsWith("on")) node.addEventListener(k.slice(2),v);
      else node.setAttribute(k,v===true ? "" : String(v));
    }
    for(const c of children.flat()){ if(c!==null && c!==undefined && c!==false) node.append(c instanceof Node ? c : document.createTextNode(String(c))); }
    return node;
  }
  const T=(mk,en)=>lang==="mk" ? mk : en;

  // Every error code the assistant endpoint can return (see src/index.js handleAssistant and
  // VERSION_ERROR_MESSAGES in src/corpus-versions.js). test/public-layer.test.mjs keeps them in sync.
  const ASSISTANT_STATES={
    instrument_required:{kind:"controlled",mk:"Изберете закон",en:"Choose a law",hintMk:"Прашањето не именува закон еднозначно. Изберете го законот од листата „Закон“ и обидете се повторно.",hintEn:"The question does not name a law unambiguously. Choose the law in the “Law” list and try again.",action:"instrument"},
    instrument_ambiguous:{kind:"controlled",mk:"Кратенката одговара на повеќе закони",en:"The abbreviation matches several laws",hintMk:"Системот не избира закон наместо вас. Изберете еден од понудените закони.",hintEn:"The system does not pick a law for you. Choose one of the laws offered.",action:"candidates"},
    instrument_not_found:{kind:"controlled",mk:"Законот не е утврден во корпусот",en:"The law was not identified in the corpus",hintMk:"Изберете закон од листата. Видете ја табелата „Покриеност на корпусот“.",hintEn:"Choose a law from the list. See the “Corpus coverage” table.",action:"instrument"},
    no_relevant_articles:{kind:"controlled",mk:"Темата не е покриена со доволно релевантни членови",en:"The topic is not covered by sufficiently relevant articles",hintMk:"Нема одговор без извор. Прегледајте го законот член-по-член или преформулирајте го прашањето.",hintEn:"There is no answer without a source. Browse the law article by article or rephrase the question.",action:"browse"},
    no_articles:{kind:"controlled",mk:"Законот нема внесен текст член-по-член",en:"The law has no article-level text",hintMk:"За овој закон постојат само метаподатоци. Проверете го официјалниот извор.",hintEn:"Only metadata exists for this law. Check the official source.",action:"instrument"},
    version_required:{kind:"version",mk:"Потребен е датум за да се утврди верзијата",en:"A date is needed to resolve the version",hintMk:"Законот има повеќе верзии и ниту една не е потврдена како тековна. Внесете датум на кој се однесува прашањето.",hintEn:"The law has several versions and none is confirmed as current. Enter the date the question refers to.",action:"date"},
    version_ambiguous:{kind:"version",mk:"Верзијата не може безбедно да се избере",en:"The version cannot be chosen safely",hintMk:"Внесете датум за да се утврди која верзија се применува.",hintEn:"Enter a date so the applicable version can be resolved.",action:"date"},
    version_not_yet_applicable:{kind:"version",mk:"Верзијата сè уште не се применува",en:"The version does not apply yet",hintMk:"Внесената верзија почнува да се применува подоцна. За преглед на идната верзија внесете датум од периодот на примена.",hintEn:"The loaded version applies later. To review the future version, enter a date within its period of application.",action:"date"},
    version_no_longer_applicable:{kind:"version",mk:"Верзијата повеќе не се применува",en:"The version no longer applies",hintMk:"За историски преглед внесете датум од периодот кога верзијата се применувала.",hintEn:"For a historical view, enter a date within the period when the version applied.",action:"date"},
    version_not_applicable_on_date:{kind:"version",mk:"Нема применлива верзија на наведениот датум",en:"No version applies on the given date",hintMk:"Ниту една внесена верзија не важи на тој датум. Проверете го датумот или официјалниот извор.",hintEn:"No loaded version applies on that date. Check the date or the official source.",action:"date"},
    version_date_unverifiable:{kind:"version",mk:"Верзијата за датумот не може да се потврди",en:"The version for this date cannot be verified",hintMk:"Корпусот нема датумски метаподатоци за оваа верзија. Проверете ја важечката верзија во официјалниот извор.",hintEn:"The corpus has no date metadata for this version. Check the applicable version in the official source.",action:"date"},
    version_metadata_missing:{kind:"version",mk:"Недостасуваат метаподатоци за верзијата",en:"Version metadata is missing",hintMk:"Одговорот е запрен додека не се поправат метаподатоците.",hintEn:"The answer is withheld until the metadata is fixed.",action:null},
    invalid_date:{kind:"input",mk:"Неважечки датум",en:"Invalid date",hintMk:"Датумот мора да биде во формат ГГГГ-ММ-ДД.",hintEn:"The date must use the YYYY-MM-DD format.",action:"date"},
    query_too_short:{kind:"input",mk:"Прашањето е прекратко",en:"The question is too short",hintMk:"Внесете најмалку три знака.",hintEn:"Enter at least three characters.",action:"question"},
    invalid_json:{kind:"input",mk:"Барањето не е валидно",en:"The request is not valid",hintMk:"Освежете ја страницата и обидете се повторно.",hintEn:"Reload the page and try again.",action:null},
    invalid_payload:{kind:"input",mk:"Барањето не е валидно",en:"The request is not valid",hintMk:"Освежете ја страницата и обидете се повторно.",hintEn:"Reload the page and try again.",action:null},
    unsupported_media_type:{kind:"input",mk:"Барањето не е валидно",en:"The request is not valid",hintMk:"Освежете ја страницата и обидете се повторно.",hintEn:"Reload the page and try again.",action:null},
    free_quota_exhausted:{kind:"quota",mk:"Бесплатната месечна квота е искористена",en:"The free monthly quota is used up",hintMk:"Законите, официјалните извори и пребарувањето остануваат слободно достапни. Поголема квота е дел од членството.",hintEn:"Laws, official sources and search remain freely available. A larger quota is part of membership.",action:"membership"},
    membership_quota_exhausted:{kind:"quota",mk:"Месечната квота на пакетот е искористена",en:"Your plan's monthly quota is used up",hintMk:"Квотата се обновува на почетокот на следниот месец.",hintEn:"The quota renews at the start of next month.",action:"membership"},
    rate_limited:{kind:"quota",mk:"Премногу барања за кратко време",en:"Too many requests in a short time",hintMk:"Почекајте малку и обидете се повторно.",hintEn:"Wait a moment and try again.",action:null},
    assistant_temporarily_unavailable:{kind:"unavailable",mk:"AI истражувачот привремено не е достапен",en:"The AI Researcher is temporarily unavailable",hintMk:"Обидете се подоцна. Законите се достапни во „Закони и прописи“.",hintEn:"Try again later. Laws remain available under “Laws & regulations”.",action:"browse"},
    database_not_ready:{kind:"unavailable",mk:"Правната база привремено не е достапна",en:"The legal database is temporarily unavailable",hintMk:"Обидете се подоцна.",hintEn:"Try again later.",action:null},
    method_not_allowed:{kind:"unavailable",mk:"AI истражувачот привремено не е достапен",en:"The AI Researcher is temporarily unavailable",hintMk:"Освежете ја страницата и обидете се повторно.",hintEn:"Reload the page and try again.",action:null}
  };
  const UNAVAILABLE_STATE={kind:"unavailable",mk:"AI истражувачот привремено не е достапен",en:"The AI Researcher is temporarily unavailable",hintMk:"Услугата не одговори. Обидете се подоцна.",hintEn:"The service did not respond. Try again later.",action:"browse"};

  const MODE_LABELS={
    workers_ai_source_backed:{mk:"AI синтеза врз прикажаните членови — помош при истражување",en:"AI synthesis over the cited articles — research assistance"},
    retrieval_only:{mk:"Извадок од изворите — без AI синтеза",en:"Extract from the sources — no AI synthesis"},
    retrieval_only_citation_guard:{mk:"AI синтезата е одбиена од контролата на цитати — прикажани се само изворите",en:"The AI synthesis was rejected by the citation guard — only the sources are shown"}
  };
  const BASIS_LABELS={
    date:{mk:"Избрана според наведениот датум",en:"Selected by the date you entered"},
    approved_current:{mk:"Тековна верзија потврдена преку човечка контрола",en:"Current version confirmed through the Human Gate"},
    single_version:{mk:"Единствена внесена верзија на законот",en:"The only loaded version of the law"},
    single_unversioned:{mk:"Корпус без верзиски метаподатоци (legacy) — верзијата мора да се провери во официјалниот извор",en:"Corpus without version metadata (legacy) — check the version in the official source"}
  };
  const CLASS_LABELS={
    original_text:{mk:"Оригинален текст",en:"Original text"},
    official_consolidated:{mk:"Официјален пречистен текст",en:"Official consolidated text"},
    dated_snapshot:{mk:"Датумски снимок",en:"Dated snapshot"},
    reference_consolidation:{mk:"Референтна консолидација (не е официјален пречистен текст)",en:"Reference consolidation (not an official consolidated text)"},
    amendment_text:{mk:"Текст на измена",en:"Amendment text"},
    other:{mk:"Друго",en:"Other"}
  };

  function versionWindowText(v){
    const start=v.applicationFrom || v.validFrom;
    if(!start && !v.validTo) return T("без датумски граници во корпусот","no date boundaries in the corpus");
    return T(`од ${start || "—"}${v.validTo ? ` до ${v.validTo} (не вклучувајќи)` : " · без краен датум"}`,`from ${start || "—"}${v.validTo ? ` until ${v.validTo} (exclusive)` : " · no end date"}`);
  }
  function versionCurrencyText(v){
    if(v.isCurrent && v.humanReviewStatus==="approved") return T("ТЕКОВНА · потврдена преку човечка контрола","CURRENT · confirmed through the Human Gate");
    if(v.isCurrent) return T("Означена како тековна, но НЕ е потврдена преку човечка контрола","Marked as current but NOT confirmed through the Human Gate");
    return T("Не е потврдена како тековна","Not confirmed as current");
  }
  function citationStatusLabel(c){
    const approved=c.humanReviewStatus==="approved";
    if(c.status==="current_consolidated" && approved) return T("ТЕКОВЕН · ПРОВЕРЕН","CURRENT · VERIFIED");
    if(c.status==="verified" && (approved || c.humanReviewStatus==="reviewed")) return T("ПРОВЕРЕН","VERIFIED");
    if(c.status==="needs_version_review") return T("ПРОВЕРКА НА ВЕРЗИЈА","VERSION REVIEW");
    if(c.status==="historical") return T("ИСТОРИСКИ ТЕКСТ","HISTORICAL TEXT");
    if(c.status==="repealed") return T("ИЗБРИШАН ЧЛЕН","REPEALED ARTICLE");
    if(c.status==="source_text") return T("ИЗВОРЕН ТЕКСТ · НЕПРОВЕРЕН","SOURCE TEXT · UNVERIFIED");
    return T("ЧЕКА ПРОВЕРКА","PENDING REVIEW");
  }

  function versionList(versions){
    if(!Array.isArray(versions) || !versions.length) return null;
    return el("ul",{class:"versionList"},versions.map(v=>el("li",{},
      el("b",{text:v.label || T("без ознака","unlabelled")}),
      " · ",versionWindowText(v),
      " · човечка контрола: ",reviewLabel(v.humanReviewStatus)
    )));
  }

  function selectInstrument(c){
    const select=$("#instrumentSelect");
    if(![...select.options].some(o=>o.value===c.canonicalKey)){
      select.append(el("option",{value:c.canonicalKey,text:(c.shortTitle ? c.shortTitle+" · " : "")+c.title}));
    }
    select.value=c.canonicalKey;
    $("#askBtn").focus();
  }

  function renderAssistantState(code,data,status,retryAfter){
    const def=ASSISTANT_STATES[code] || (status>=500 || !status ? UNAVAILABLE_STATE : {kind:"controlled",mk:"Барањето е одбиено",en:"The request was declined",hintMk:"",hintEn:"",action:null});
    // The server explains refusals in Macedonian. In the Macedonian UI that message is shown
    // as is; the English UI shows its own guidance first and the server message as a quote.
    const hint=T(def.hintMk,def.hintEn);
    const box=el("div",{class:`stateBox ${def.kind==="unavailable" ? "unavailable" : ""}`},
      el("h3",{text:T(def.mk,def.en)}),
      lang==="mk"
        ? el("p",{text:data?.message || hint})
        : [hint ? el("p",{text:hint}) : null, data?.message ? el("p",{class:"help",lang:"mk",text:data.message}) : null]
    );
    if(data?.instrument?.title) box.append(el("p",{class:"help",text:T("Закон: ","Law: ")+data.instrument.title}));
    const versions=versionList(data?.versions);
    if(versions) box.append(el("p",{class:"help",text:T("Внесени верзии:","Loaded versions:")}),versions);
    if(code==="rate_limited" && retryAfter) box.append(el("p",{class:"help",text:T(`Обидете се повторно за околу ${retryAfter} секунди.`,`Try again in about ${retryAfter} seconds.`)}));
    if(code==="free_quota_exhausted" || code==="membership_quota_exhausted"){
      const m=data?.membership;
      if(m) box.append(el("p",{class:"help",text:`${String(m.planCode || "free").toUpperCase()} · ${m.used}/${m.monthlyQuota}`}));
    }
    const actions=el("div",{class:"actions"});
    if(def.action==="candidates" && Array.isArray(data?.candidates)){
      data.candidates.forEach(c=>actions.append(el("button",{type:"button",class:"btn light",onclick:()=>selectInstrument(c)},
        T("Избери: ","Choose: ")+(c.shortTitle ? `${c.shortTitle} · ` : "")+c.title)));
    }
    if(def.action==="instrument") actions.append(el("button",{type:"button",class:"btn light",onclick:()=>$("#instrumentSelect").focus()},T("Избери закон","Choose a law")));
    if(def.action==="date") actions.append(el("button",{type:"button",class:"btn light",onclick:()=>$("#questionDate").focus()},T("Внеси датум","Enter a date")));
    if(def.action==="question") actions.append(el("button",{type:"button",class:"btn light",onclick:()=>$("#legalQuestion").focus()},T("Измени го прашањето","Edit the question")));
    if(def.action==="membership") actions.append(el("a",{class:"btn light",href:"/membership.html"},T("Планови и членство","Plans & membership")));
    if(def.action==="browse"){
      const key=data?.instrument?.canonicalKey;
      actions.append(el("button",{type:"button",class:"btn light",onclick:()=>key ? openLawBrowser(key) : openLawsRegistry()},T("Прегледај ги законите","Browse the laws")));
    }
    if(actions.children.length) box.append(actions);
    box.append(el("p",{class:"failClosed",text:T("Не е генериран правен одговор.","No legal answer was generated.")}));
    return box;
  }

  function renderAssistantAnswer(data){
    const frag=document.createDocumentFragment();
    const mode=MODE_LABELS[data.mode] || {mk:data.mode || "—",en:data.mode || "—"};
    frag.append(el("p",{class:"modeLine"},T("Тип на одговор: ","Answer type: "),el("strong",{text:T(mode.mk,mode.en)})));

    const v=data.instrumentVersion;
    if(data.instrument || v){
      const dl=el("dl",{});
      const row=(k,val)=>{ if(val) dl.append(el("dt",{text:k}),el("dd",{text:val})); };
      row(T("Закон","Law"),data.instrument?.title);
      if(v){
        row(T("Верзија","Version"),v.legacyUnversioned ? T("без верзиски метаподатоци (legacy)","no version metadata (legacy)") : v.label);
        row(T("Вид на текст","Text type"),v.class ? T(CLASS_LABELS[v.class]?.mk || v.class,CLASS_LABELS[v.class]?.en || v.class) : null);
        if(!v.legacyUnversioned) row(T("Важење","Validity"),versionWindowText(v));
        row(T("Статус","Status"),versionCurrencyText(v));
        row("човечка контрола",reviewLabel(v.humanReviewStatus));
      }
      const basis=BASIS_LABELS[data.versionBasis];
      if(basis) row(T("Основ за избор","Selection basis"),T(basis.mk,basis.en));
      frag.append(el("div",{class:"versionBox"},el("b",{text:T("Верзија на која се заснова одговорот","Version the answer relies on")}),dl));
    }
    if(data.legalStatusWarning) frag.append(el("div",{class:"notice",style:"margin:10px 0"},el("b",{text:T("Статус на правниот текст","Legal text status")}),data.legalStatusWarning));
    frag.append(el("div",{class:"answerBody",text:data.answer || ""}));

    if(data.answerProvenance){
      const p=data.answerProvenance;
      const hc=p.humanControl||{};
      const box=el("div",{class:"versionBox"},
        el("b",{text:T("Проверливост и човечка проверка","Verification and Human Gate")})
      );
      const dl=el("dl",{});
      const row=(k,v)=>{if(v!==null&&v!==undefined&&String(v)!=="") dl.append(el("dt",{text:k}),el("dd",{text:String(v)}));};
      row(T("Статус на верификација","Verification state"),p.verificationState);
      row(T("Човечка проверка","Human review"),hc.reviewState);
      row(T("Одлука за објавување/употреба","Release decision"),hc.releaseDecision);
      row(T("Верзија/датум на извор","Source version/date"),p.sourceVersionOrDate);
      if(hc.reviewRequired===true){
        box.append(dl,el("p",{class:"help",text:T(
          "Овој AI излез не е човечки одобрен додека reviewState не покаже завршена професионална проверка и releaseDecision не е експлицитно авторизиран.",
          "This AI output is not human-approved until reviewState records completed professional review and releaseDecision is explicitly authorized."
        )}));
      }else box.append(dl);
      frag.append(box);
    }

    const citations=el("div",{id:"assistantCitations",style:"margin-top:14px;display:grid;gap:8px"});
    if((data.citations || []).length) citations.append(el("b",{text:T("Изворни членови","Source articles")}));
    (data.citations || []).forEach(c=>{
      const head=el("div",{class:"citeHead"},
        el("b",{text:T("Член ","Article ")+c.articleNumber+(c.heading ? " · "+c.heading : "")}),
        el("span",{class:`badge ${c.status==="current_consolidated" && c.humanReviewStatus==="approved" ? "ok" : "pending"}`,text:citationStatusLabel(c)}));
      const meta=[c.sourceIssueNumber,c.sourceIssueDate,c.version?.label && c.version.label!=="legacy-unversioned" ? T("верзија ","version ")+c.version.label : null].filter(Boolean).join(" · ");
      citations.append(el("div",{class:"resultItem citationItem"},
        head,
        meta ? el("div",{class:"meta",text:meta}) : null,
        c.excerpt ? el("div",{class:"sourceExcerpt"},
          el("span",{class:"layerTag",text:T(c.excerptIsPartial ? "Извадок од член · скратено" : "Извадок од член",c.excerptIsPartial ? "Article excerpt · shortened" : "Article excerpt")}),
          el("p",{text:c.excerpt})
        ) : null,
        c.sourceUrl ? el("a",{class:"btn light",href:c.sourceUrl,target:"_blank",rel:"noopener noreferrer"},T("Отвори официјален извор ↗","Open official source ↗")) : null
      ));
    });
    frag.append(citations);
    frag.append(el("p",{class:"help"},T("Проверете ги членовите во официјалниот извор. Ова е помош при истражување, не правен совет.","Check the articles in the official source. This is research assistance, not legal advice.")));
    return frag;
  }

  let publicGuideRegistryPromise=null;
  function fetchPublicGuideRegistry(){
    if(!publicGuideRegistryPromise){
      publicGuideRegistryPromise=fetch("/data/guides.json?v=20261004-v2-final-master",{cache:"no-store"})
        .then(r=>{if(!r.ok) throw new Error("guides_unavailable");return r.json();})
        .then(d=>Array.isArray(d.records)?d.records:[]);
    }
    return publicGuideRegistryPromise;
  }

  async function renderCitizenGuideMatches(question){
    const panel=el("section",{class:"guideMatchPanel","aria-label":T("Предложени практични водичи","Suggested practical guides")});
    const head=el("div",{class:"guideMatchHead"},
      el("div",{},
        el("h3",{text:T("Практични водичи за вашиот проблем","Practical guides for your issue")}),
        el("p",{text:T("Ова е навигација низ јавната библиотека — не автоматски правен совет.","This is navigation through the public library, not automatic legal advice.")})
      )
    );
    panel.append(head);

    try{
      const records=await fetchPublicGuideRegistry();
      const router=window.AIAdvokatGuideRouter;
      const matches=router?.routeGuides ? router.routeGuides(question,records,{limit:3,minScore:10}) : [];
      if(matches.length){
        const grid=el("div",{class:"guideMatchGrid"});
        matches.forEach(m=>grid.append(el("article",{class:"guideMatchCard"},
          el("div",{},
            el("h4",{text:m.title}),
            el("p",{text:m.scope}),
            el("div",{class:"meta",text:[m.category,m.verificationLabel].filter(Boolean).join(" · ")})
          ),
          el("a",{class:"btn primary",href:m.url},T("Отвори го водичот →","Open guide →"))
        )));
        panel.append(grid);
      }else{
        panel.append(el("p",{class:"help",text:T(
          "Не најдов доволно сигурен тематски match за автоматски да изберам водич. Не погодувам — отворете ја целата библиотека.",
          "I could not find a sufficiently confident thematic match. I will not guess — open the full guide library."
        )}));
      }
    }catch{
      panel.append(el("p",{class:"help",text:T(
        "Библиотеката моментално не може автоматски да се пребара, но сите јавни водичи остануваат достапни.",
        "The library cannot be searched automatically right now, but all public guides remain available."
      )}));
    }

    panel.append(el("div",{class:"guideMatchAll"},
      el("a",{class:"btn light",href:"/guides/"},T("Прегледај ги сите 39 водичи","Browse all 39 guides"))
    ));
    return panel;
  }

  const questionField=$("#legalQuestion");
  const questionCount=$("#questionCount");
  const updateCount=()=>{ if(questionCount) questionCount.textContent=`${questionField.value.length} / 600`; };
  questionField.addEventListener("input",updateCount);
  updateCount();

  $("#askBtn").addEventListener("click",async()=>{
    const q=$("#legalQuestion").value.trim();
    const answerBox=$("#answerBox");
    const answerText=$("#answerText");
    answerBox.classList.add("show");
    answerText.replaceChildren();

    if(!q){
      answerText.append(el("p",{text:i18n[lang].askEmpty}));
      $("#legalQuestion").focus();
      return;
    }

    const guideSlot=el("div",{});
    const legalSlot=el("div",{class:"legalResearchResult"});
    answerText.append(guideSlot,legalSlot);
    guideSlot.replaceChildren(await renderCitizenGuideMatches(q));

    const date=$("#questionDate").value;
    legalSlot.replaceChildren(el("p",{text:T("Се проверува дали прашањето може да се поткрепи и со article-level правниот корпус…","Checking whether the question can also be supported by the article-level legal corpus…")}));
    answerBox.setAttribute("aria-busy","true");
    $("#askBtn").disabled=true;

    try{
      const response=await fetch(API_BASE+"/api/assistant",{
        method:"POST",
        headers:{
          "content-type":"application/json",
          "accept":"application/json",
          ...(currentMembershipKey() ? {"authorization":"Bearer "+currentMembershipKey()} : {})
        },
        body:JSON.stringify({q,instrument:$("#instrumentSelect")?.value || "auto",...(date ? {date} : {})})
      });
      let data=null;
      try{ data=await response.json(); }catch{}
      legalSlot.replaceChildren();
      if(!response.ok || !data || !data.ok){
        legalSlot.append(renderAssistantState(data?.error,data,response.status,response.headers.get("retry-after")));
        if(data?.membership?.monthlyQuota) updateMembershipKeyState(`${String(data.membership.planCode).toUpperCase()} · ${data.membership.used}/${data.membership.monthlyQuota}`);
        return;
      }

      legalSlot.append(renderAssistantAnswer(data));
      if(data.membership){
        if(data.membership.monthlyQuota){
          updateMembershipKeyState((lang==="mk" ? "Пакет " : "Plan ")+String(data.membership.planCode).toUpperCase()+" · "+data.membership.used+"/"+data.membership.monthlyQuota+" · "+(lang==="mk" ? "преостануваат " : "remaining ")+data.membership.remaining);
        }else if(data.membership.note){
          updateMembershipKeyState(lang==="mk" ? "FREE preview режим." : "FREE preview mode.");
        }
      }
    }catch(error){
      legalSlot.replaceChildren(renderAssistantState(null,null,0,null));
    }finally{
      answerBox.removeAttribute("aria-busy");
      $("#askBtn").disabled=false;
    }
  });

  let modalReturnFocus=null;
  function openModal(){
    modalReturnFocus=document.activeElement;
    const modal=$("#infoModal");
    modal.hidden=false;
    modal.classList.add("show");
    $("#closeModal").focus();
  }
  function closeModal(){
    const modal=$("#infoModal");
    if(modal.hidden) return;
    modal.classList.remove("show");
    modal.hidden=true;
    if(modalReturnFocus && modalReturnFocus.focus) modalReturnFocus.focus();
  }
  $("#zenodoInfo").addEventListener("click",openModal);
  $("#closeModal").addEventListener("click",closeModal);
  $("#infoModal").addEventListener("click",e=>{ if(e.target===e.currentTarget) closeModal(); });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") closeModal();
    if(e.key==="Tab" && !$("#infoModal").hidden){
      const focusables=[...$("#infoModal").querySelectorAll("a[href],button")];
      const first=focusables[0], last=focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  });

  let deferredInstallPrompt=null;
  const installButton=$("#installAppBtn");
  const installHint=$("#installAppHint");

  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();
    deferredInstallPrompt=event;
    installButton.hidden=false;
    installHint.textContent=lang==="mk"
      ? "AI Advokat може да се инсталира како апликација на овој уред."
      : "AI Advokat can be installed as an app on this device.";
  });

  installButton.addEventListener("click",async()=>{
    if(!deferredInstallPrompt){
      installHint.textContent=lang==="mk"
        ? "На iPhone/iPad: Share → Add to Home Screen. На desktop користете ја Install App опцијата на прелистувачот."
        : "On iPhone/iPad: Share → Add to Home Screen. On desktop use the browser's Install App option.";
      return;
    }
    deferredInstallPrompt.prompt();
    const choice=await deferredInstallPrompt.userChoice;
    installHint.textContent=choice.outcome==="accepted"
      ? (lang==="mk" ? "AI Advokat се инсталира." : "AI Advokat is being installed.")
      : (lang==="mk" ? "Инсталацијата е откажана." : "Installation was cancelled.");
    deferredInstallPrompt=null;
    installButton.hidden=true;
  });

  window.addEventListener("appinstalled",()=>{
    installButton.hidden=true;
    installHint.textContent=lang==="mk"
      ? "AI Advokat е инсталиран на уредот."
      : "AI Advokat is installed on this device.";
  });

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>{
      navigator.serviceWorker.register("/service-worker.js",{scope:"/"})
        .catch(()=>{});
    },{once:true});
  }

  const standalone=window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
  if(standalone){
    installButton.hidden=true;
    installHint.textContent=lang==="mk"
      ? "Работите во AI Advokat апликацијата."
      : "You are using the AI Advokat app.";
  }else if(/iPad|iPhone|iPod/.test(navigator.userAgent)){
    installButton.hidden=false;
    installHint.textContent=lang==="mk"
      ? "На iPhone/iPad: Share → Add to Home Screen."
      : "On iPhone/iPad: Share → Add to Home Screen.";
  }

  $("#year").textContent=new Date().getFullYear();
  applyLanguage();


  // ---------------------------------------------------------------------------
  // Truthful status labels: derived from /api/capabilities, never hard-coded.
  // The UI must never promise more than the backend actually provides.
  // ---------------------------------------------------------------------------
  let systemCapabilities=null;
  let capabilitiesState="loading";

  function renderCapabilityLabels(){
    const mk=lang==="mk";
    const T=(m,e)=>mk?m:e;
    const setCap=key=>{
      const st=LB.capabilityState(key, capabilitiesState==="ready" ? systemCapabilities : null);
      document.querySelectorAll(`[data-cap="${key}"]`).forEach(node=>{
        node.textContent=capabilitiesState==="loading" ? "…" : T(st.mk,st.en);
        node.dataset.state=capabilitiesState==="loading" ? "loading" : st.state;
        node.style.color=st.active ? "var(--ok)" : st.state==="locked" ? "var(--muted)" : "var(--warn)";
      });
    };
    const aiLabel=document.getElementById("aiModeLabel");
    const note=document.getElementById("coverageNote");
    ["laws","cases","echr","versions","citationAudit","documents"].forEach(setCap);

    if(capabilitiesState!=="ready" || !systemCapabilities){
      const unknown=capabilitiesState==="loading" ? "…" : T("СТАТУС НЕПОЗНАТ","STATUS UNKNOWN");
      if(aiLabel) aiLabel.textContent=unknown;
      if(note) note.textContent="";
      return;
    }

    const c=systemCapabilities.capabilities || {};
    const corpora=(systemCapabilities.coverage?.articleCorpusInstruments || []).filter(i=>i.articleCount>0);

    if(aiLabel){
      aiLabel.textContent =
        c.retrievalAssistant==="live_source_backed_ai" ? "LIVE · SOURCE-BACKED AI"
        : c.retrievalAssistant==="live_retrieval_only" ? T("LIVE · ПРЕБАРУВАЊЕ НА ИЗВОРИ (без AI синтеза)","LIVE · SOURCE RETRIEVAL (no AI synthesis)")
        : T("НЕДОСТАПНО","UNAVAILABLE");
    }
    if(note){
      const list=corpora.map(i=>i.shortTitle || i.canonicalKey).join(", ");
      note.textContent=T(
        `Темите погоре се тематска навигација. Article-level корпус моментално имаат: ${list || "—"}.`,
        `The topics above are thematic navigation. Article-level corpora currently available: ${list || "—"}.`
      );
    }
  }

  async function loadCapabilities(){
    try{
      const response=await fetch(API_BASE+"/api/capabilities",{headers:{accept:"application/json"}});
      if(!response.ok) throw new Error("capabilities_"+response.status);
      systemCapabilities=await response.json();
      capabilitiesState="ready";
    }catch{
      capabilitiesState="failed";
    }
    renderCapabilityLabels();
  }

  document.getElementById("langBtn")?.addEventListener("click",()=>setTimeout(renderCapabilityLabels,0));
  renderCapabilityLabels();
  loadCapabilities();
