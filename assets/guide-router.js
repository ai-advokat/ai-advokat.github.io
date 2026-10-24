(function(root,factory){
  const api=factory();
  if(typeof module==="object" && module.exports) module.exports=api;
  if(root) root.AIAdvokatGuideRouter=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const STOPWORDS=new Set([
    "a","ako","ama","bez","bi","bide","bidejki","da","deka","do","e","edna","eden","edno","go","gi","i","ili","jas","kaj","kako","ke","koj","koja","koe","koi","me","mi","moj","moja","moite","na","ne","ni","od","ova","ovaa","ovoj","ovae","po","pred","pri","sakam","se","so","sto","sum","taa","toj","toa","treba","vo","za",
    "the","a","an","and","or","to","of","in","on","for","with","my","i","me"
  ]);

  const GENERIC_ROUTING_TOKENS=new Set([
    "postapka","pravo","praven","pravna","baranje","dokument","dokumenti","predmet",
    "organ","institucija","sud","imot","informacija","informacii","potrebno","podgotvi"
  ]);

  const CATEGORY_DOMAIN=Object.freeze({
    labour_social:"labour_social",
    administrative_law:"administrative_law",
    criminal_justice:"criminal_procedure",
    family_property:"family_property",
    civil_compensation:"civil_compensation",
    private_notarial:"private_notarial",
    access_to_justice:"access_to_justice",
    integrity:"integrity"
  });

  const AUXILIARY_DOMAINS=new Set(["access_to_justice","civil_procedure"]);

  const DOMAIN_SIGNALS=Object.freeze({
    labour_social:Object.freeze([
      ["враќање на работа",22],["врати на работа",20],["работен однос",18],["договор за вработување",16],
      ["работно место",12],["вознемирување на работно место",18],["работник",12],["работодавач",12],
      ["отказ",18],["вработување",12],["плата",10],["стаж",12],["фпио",14],["фзо",12],["мобинг",16]
    ]),
    administrative_law:Object.freeze([
      ["управен суд",22],["управно решение",20],["управна постапка",18],["управен спор",20],
      ["молчење на администрација",20],["управен акт",18],["институцијата не одговара",16],
      ["институцијата не ми одговара",20],["јавна евиденција",18],["уверение",12],
      ["управен",12],["управна",12],["управно",12],["администрација",12],["институција",8]
    ]),
    criminal_procedure:Object.freeze([
      ["кривична пријава",22],["кривична постапка",20],["полициска станица",18],["лишен од слобода",18],
      ["условен отпуст",18],["полиција",12],["притвор",20],["осомничен",16],["обвинет",16],["сведок",12]
    ]),
    criminal_substantive:Object.freeze([
      ["кривичен законик",22],["кривично дело",18],["кривична одговорност",18],["сторител",12]
    ]),
    family_property:Object.freeze([
      ["родителско право",18],["вонбрачна заедница",18],["заеднички имот",14],["развод",22],
      ["издршка",18],["алиментација",18],["старателство",18],["брак",12],["оставина",18],["наследство",18]
    ]),
    property_law:Object.freeze([
      ["право на сопственост",20],["имотен лист",18],["сопственост",16],["катастар",16],["владение",14],["недвижност",12]
    ]),
    civil_compensation:Object.freeze([
      ["сообраќајна незгода",22],["сообраќајна несреќа",22],["надомест на штета",18],
      ["осигурител",16],["осигурување",14],["сообраќајка",18],["штета",9]
    ]),
    private_notarial:Object.freeze([
      ["кај нотар",18],["нотарска изјава",18],["нотарска исправа",18],["нотар",16],
      ["полномошно",12],["заверка",14],["солемнизација",18]
    ]),
    access_to_justice:Object.freeze([
      ["бесплатна правна помош",24],["бесплатен адвокат",20],["избор на адвокат",18],
      ["адвокатска тарифа",16],["адвокат",8],["правна помош",14]
    ]),
    integrity:Object.freeze([
      ["пријавување корупција",20],["заштита на укажувач",20],["корупција",20],["мито",18],["укажувач",18]
    ]),
    human_rights:Object.freeze([
      ["европски суд за човекови права",24],["европска конвенција",20],["човекови права",18],["есчп",22],["echr",22],["hudoc",20]
    ]),
    public_information:Object.freeze([
      ["слободен пристап до информации",24],["информации од јавен карактер",22],["јавен карактер",16]
    ]),
    civil_procedure:Object.freeze([
      ["парнична постапка",20],["тужбено барање",18],["граѓански суд",18],["зпп",22],["парница",18]
    ])
  });

  const EXTRA_TERMS=Object.freeze({
    "guide-02-victim-edited-2026-10-01":["жртва","оштетен","оштетена","кривично дело","права на жртва","надоместок жртва"],
    "guide-05-workplace":["мобинг","вознемирување на работа","дискриминација на работа","работодавач","работно место","шеф ме вознемирува"],
    "guide-09-family":["развод","брак","вонбрачна заедница","деца","старателство","родителско право","издршка","алиментација","заеднички имот","делба на имот"],
    "guide-10-traffic":["сообраќајка","сообраќајна несреќа","сообраќајна незгода","осигурител","осигурување","штета од возило","надомест од осигурување"],
    "guide-17-police":["легитимирање","претрес","преглед","полиција","полициска контрола","лишување од слобода","апсење","одземени предмети"],
    "guide-21-witness":["сведок","сведочење","покана за сведок","повик за сведочење"],
    "guide-22-corruption":["корупција","мито","укажувач","пријавување корупција","одмазда по пријава"],
    "guide-26-administrative-short":["управен спор","институција одбива","институција молчи","управен суд","жалба институција"],
    "guide-choose-lawyer":["избор на адвокат","адвокат","адвокатски трошоци","адвокатска тарифа","колку чини адвокат","полномошно адвокат"],
    "guide-free-legal-aid":["бесплатна правна помош","бесплатен адвокат","бпп","немам пари за адвокат","правна помош"],
    "guide-38-full-word-2026":["работен стаж","стаж","празнини во стаж","фпио","пензиски стаж","недостига стаж"],
    "guide-39-full-word-2026":["фзо","фонд за здравствено осигурување","здравствено осигурување","жалба фзо","барање фзо"],
    "guide-40-full-word-2026":["сообраќајка","сообраќајна несреќа","сообраќајна незгода","материјална штета","нематеријална штета","тужба осигурител","надомест штета"],
    "guide-41-full-word-2026":["информативен разговор","повик од полиција","ме повика полиција","полиција ме повика","изјава во полиција"],
    "guide-42-full-word-2026":["приведен","приведена","задржан","задржана","полициска станица","лишен од слобода","уапсен","уапсена","бранител"],
    "guide-43-full-word-2026":["кривична пријава","поднесам кривична пријава","пријавам кривично дело","пријава полиција обвинителство"],
    "guide-44-full-word-2026":["покана сведок","покана осомничен","покана оштетен","осомничен","оштетен","повик од полиција обвинителство"],
    "guide-45-full-word-2026":["жртва на кривично дело","нападнат","нападната","ограбен","ограбена","насилство","права на жртва"],
    "guide-46-full-word-2026":["притвор","укинување притвор","замена на притвор","поблага мерка","куќен притвор"],
    "guide-47-full-word-2026":["условен отпуст","излегување од затвор порано","ресоцијализација"],
    "guide-48-full-word-2026":["одлагање затвор","одлагање казна","одлагање на извршување","упатен акт","казна затвор"],
    "guide-49-full-word-2026":["рехабилитација","бришење осуда","кривична евиденција","правни последици од осуда"],
    "guide-50-full-word-2026":["помилување","молба за помилување","амнестија"],
    "guide-51-full-word-2026":["управно барање","барање до институција","управна постапка","поднесок до орган"],
    "guide-52-full-word-2026":["жалба против решение","управно решение","правна поука","жалба институција"],
    "guide-53-full-word-2026":["тужба управен суд","управен спор","тужба против решение","управен суд"],
    "guide-54-full-word-2026":["молчење на администрацијата","институцијата не одговара","институција не одговара","немам одговор од институција","ургенција"],
    "guide-55-full-word-2026":["поништување управен акт","укинување управен акт","поништување решение","укинување решение"],
    "guide-56-full-word-2026":["повторување управна постапка","нова постапка","нови докази управна постапка","нови факти"],
    "guide-57-full-word-2026":["уверение","извод","јавна евиденција","извод од матична","потврда од институција"],
    "guide-58-full-word-2026":["претставка","приговор","работа на орган","поплака институција","надзор орган"],
    "guide-59-full-word-2026":["штета од институција","незаконито управно постапување","незаконито решение штета","надомест штета од држава","штета од орган"],
    "guide-60-full-word-2026":["нотар договор","заверка договор","солемнизација","нотарска исправа","договор кај нотар"],
    "guide-61-full-word-2026":["полномошно","нотар полномошно","заверка полномошно","овластување кај нотар"],
    "guide-62-full-word-2026":["заверка потпис","заверка препис","копија документ нотар","нотар потпис","нотар препис"],
    "guide-63-full-word-2026":["нотарска изјава","изјава кај нотар","нотар изјава"],
    "guide-administrative-v2":["управна постапка","управен спор","управно право","институција","управен суд","виш управен суд","молчење администрација","жалба управно решение","тужба управен спор"]
  });

  const CYR_TO_LAT=Object.freeze({
    "а":"a","б":"b","в":"v","г":"g","д":"d","ѓ":"gj","е":"e","ж":"zh","з":"z","ѕ":"dz","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ќ":"kj","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","џ":"dz","ш":"sh"
  });

  function normalize(value){
    const raw=String(value??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    let out="";
    for(const ch of raw) out+=CYR_TO_LAT[ch] ?? ch;
    return out
      .replace(/gj/g,"g")
      .replace(/kj/g,"k")
      .replace(/sh/g,"s")
      .replace(/ch/g,"c")
      .replace(/zh/g,"z")
      .replace(/[^a-z0-9]+/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function tokenise(value){
    return normalize(value).split(" ").filter(t=>t.length>=3 && !STOPWORDS.has(t));
  }

  function phraseIn(question,phrase){
    if(!phrase) return false;
    return question===phrase || question.includes(" "+phrase+" ") || question.startsWith(phrase+" ") || question.endsWith(" "+phrase);
  }

  function domainSignalMatch(normalized,tokens,signal){
    const term=normalize(signal);
    if(!term) return false;
    if(term.includes(" ")) return normalized===term || normalized.includes(term);
    return tokens.some(token=>token===term || (term.length>=5 && token.startsWith(term)));
  }

  function classifyLegalDomain(question){
    const normalized=routingQuestion(question);
    const tokens=normalize(normalized).split(" ").filter(Boolean);
    const ranked=Object.entries(DOMAIN_SIGNALS).map(([domain,signals])=>{
      let score=0;
      const matchedSignals=[];
      for(const [signal,weight] of signals){
        if(domainSignalMatch(normalized,tokens,signal)){
          score+=weight;
          matchedSignals.push({signal,weight});
        }
      }
      return {domain,score,matchedSignals};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.domain.localeCompare(b.domain));
    const top=ranked[0],second=ranked[1];
    if(!top || top.score<10 || (second && !AUXILIARY_DOMAINS.has(second.domain) && second.score>=10 && top.score-second.score<=2)){
      return {routingState:"UNRESOLVED",primaryDomain:"unknown",secondaryDomains:[],ranked};
    }
    return {
      routingState:"RESOLVED",
      primaryDomain:top.domain,
      secondaryDomains:ranked.slice(1).filter(x=>x.score>=8 && x.score>=Math.max(8,Math.floor(top.score*.6))).slice(0,3),
      ranked
    };
  }

  function guideLegalDomain(record){
    return CATEGORY_DOMAIN[String(record?.category_code||"")] || "unknown";
  }

  function guideDomainCompatibility(question,record,analysis=classifyLegalDomain(question)){
    const q=routingQuestion(question);
    const title=normalize(record.display_title || record.title || "");
    const sourceDomain=guideLegalDomain(record);
    if(title && title.length>=10 && (q===title || q.includes(title))){
      return {allowed:true,state:"COMPATIBLE_EXPLICIT",sourceDomain,reason:"explicit_guide_title:"+String(record.id||"")};
    }
    if(analysis.routingState!=="RESOLVED"){
      return {allowed:false,state:"UNRESOLVED",sourceDomain,reason:"query_domain_unresolved"};
    }
    if(sourceDomain==="unknown"){
      return {allowed:false,state:"UNRESOLVED",sourceDomain,reason:"source_domain_unresolved"};
    }
    if(sourceDomain===analysis.primaryDomain){
      return {allowed:true,state:"COMPATIBLE_PRIMARY",sourceDomain,reason:"matches_primary_domain:"+analysis.primaryDomain};
    }
    if(analysis.secondaryDomains.some(x=>x.domain===sourceDomain)){
      return {allowed:true,state:"COMPATIBLE_SECONDARY",sourceDomain,reason:"matches_explicit_secondary_domain:"+sourceDomain};
    }
    return {
      allowed:false,state:"INCOMPATIBLE",sourceDomain,
      reason:"source_domain_"+sourceDomain+"_not_compatible_with_primary_"+analysis.primaryDomain
    };
  }

  function recordText(record){
    const aliases=EXTRA_TERMS[record.id] || [];
    return [
      record.display_title,
      record.title,
      record.scope,
      record.category_label,
      record.subcategory_label,
      record.guide_no,
      ...aliases
    ].filter(Boolean).join(" ");
  }

  function isArchiveIntent(q){
    return /(?:arhiv|prethod|stara verz|istorisk|archive|previous version)/.test(q);
  }

  function routingQuestion(value){
    return normalize(value).replace(/ai advokat/g," ").replace(/\s+/g," ").trim();
  }

  function scoreRecord(question,record,domainAnalysis=null){
    const q=routingQuestion(question);
    if(!q) return 0;
    const analysis=domainAnalysis||classifyLegalDomain(q);
    const compatibility=guideDomainCompatibility(q,record,analysis);
    if(!compatibility.allowed) return 0;

    const title=normalize(record.display_title || record.title || "");
    const text=normalize(recordText(record));
    const qTokens=tokenise(q).filter(t=>!GENERIC_ROUTING_TOKENS.has(t));
    const recordTokens=new Set(tokenise(text).filter(t=>!GENERIC_ROUTING_TOKENS.has(t)));
    let score=0;

    if(title && q===title) score+=120;
    else if(title && q.length>=8 && title.includes(q)) score+=45;
    else if(title && q.includes(title) && title.length>=8) score+=55;

    for(const alias of (EXTRA_TERMS[record.id] || [])){
      const a=normalize(alias);
      if(!a) continue;
      if(q===a || q.includes(a)) score+=34+Math.min(10,a.split(" ").length*2);
      else if(q.length>=5 && a.includes(q)) score+=14;
    }

    for(const token of qTokens){
      if(recordTokens.has(token)){
        score+=5;
        continue;
      }
      if(token.length>=4){
        for(const rt of recordTokens){
          if(rt.length>=4 && (rt.startsWith(token) || token.startsWith(rt))){
            score+=2;
            break;
          }
        }
      }
    }

    if(record.category_label && q.includes(normalize(record.category_label))) score+=8;
    if(record.subcategory_label && q.includes(normalize(record.subcategory_label))) score+=6;

    const archive=record.source_role==="version_history";
    if(archive && !isArchiveIntent(q)) score-=50;
    if(record.id==="guide-administrative-v2" && /(?:uprav|instituci|administraci)/.test(q)) score+=3;

    // Domain relevance is evaluated before verification quality. A verified
    // source can never cross an incompatible legal-domain boundary.
    if(score>0){
      if(compatibility.state==="COMPATIBLE_PRIMARY") score+=8;
      else if(compatibility.state==="COMPATIBLE_SECONDARY") score+=4;
      else if(compatibility.state==="COMPATIBLE_EXPLICIT") score+=10;

      // Verification remains a quality tie-breaker only after relevance.
      if(record.activation_state==="active_verified") score+=6;
      else if(record.activation_state==="active_with_warning") score+=2;
    }

    return score;
  }

  function routeGuides(question,records,{limit=3,minScore=10,includeHistory=false}={}){
    if(!Array.isArray(records)) return [];
    const q=routingQuestion(question);
    if(!q) return [];
    const archiveIntent=isArchiveIntent(q);
    const domainAnalysis=classifyLegalDomain(q);
    return records
      .filter(r=>r && r.catalog_public===true && r.public_record_enabled===true && r.public_record_url)
      .filter(r=>includeHistory || archiveIntent || r.source_role!=="version_history")
      .map(record=>{
        const compatibility=guideDomainCompatibility(q,record,domainAnalysis);
        return {record,compatibility,score:compatibility.allowed?scoreRecord(q,record,domainAnalysis):0};
      })
      .filter(x=>x.score>=minScore)
      .sort((a,b)=>b.score-a.score || String(a.record.guide_no||"").localeCompare(String(b.record.guide_no||""),"mk"))
      .slice(0,Math.max(1,Math.min(6,Number(limit)||3)))
      .map(({record,score,compatibility})=>({
        id:record.id,
        guideNo:record.guide_no,
        title:record.display_title || record.title,
        scope:record.scope || "",
        category:record.category_label || "",
        legalDomain:compatibility.sourceDomain,
        domainCompatibility:compatibility.state,
        domainReason:compatibility.reason,
        primaryDomain:domainAnalysis.primaryDomain,
        secondaryDomains:domainAnalysis.secondaryDomains.map(x=>x.domain),
        verificationLabel:record.verification_label || "",
        activationState:record.activation_state || "review_required",
        activationLabel:record.activation_label_mk || "",
        currentLawAuthority:record.current_law_authority===true,
        currentLawClaimPolicy:record.current_law_claim_policy || "primary_source_required",
        lawDependencies:Array.isArray(record.law_dependencies)?record.law_dependencies.map(x=>({
          key:x.key,title:x.title,role:x.role,sourceClass:x.source_class
        })):[],
        sourceRole:record.source_role || "",
        url:record.public_record_url,
        score
      }));
  }

  function currentPublicGuides(records){
    return Array.isArray(records)
      ? records.filter(r=>r && r.catalog_public===true && r.public_record_enabled===true && r.public_record_url && r.source_role!=="version_history")
      : [];
  }

  return Object.freeze({
    normalize,
    tokenise,
    classifyLegalDomain,
    guideDomainCompatibility,
    scoreRecord,
    routeGuides,
    routingQuestion,
    currentPublicGuides,
    extraTerms:EXTRA_TERMS
  });
});
