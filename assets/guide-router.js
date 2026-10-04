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

  function scoreRecord(question,record){
    const q=normalize(question);
    if(!q) return 0;
    const title=normalize(record.display_title || record.title || "");
    const text=normalize(recordText(record));
    const qTokens=tokenise(q);
    const recordTokens=new Set(tokenise(text));
    let score=0;

    if(title && q===title) score+=120;
    else if(title && q.length>=8 && title.includes(q)) score+=45;
    else if(title && q.includes(title) && title.length>=8) score+=55;

    for(const alias of (EXTRA_TERMS[record.id] || [])){
      const a=normalize(alias);
      if(!a) continue;
      if(phraseIn(" "+q+" "," "+a+" ")) score+=34+Math.min(10,a.split(" ").length*2);
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
    if(!archive) score+=2;
    if(record.id==="guide-administrative-v2" && /(?:uprav|instituci|administraci)/.test(q)) score+=3;

    return score;
  }

  function routeGuides(question,records,{limit=3,minScore=6,includeHistory=false}={}){
    if(!Array.isArray(records)) return [];
    const q=normalize(question);
    if(!q) return [];
    const archiveIntent=isArchiveIntent(q);
    return records
      .filter(r=>r && r.catalog_public===true && r.public_record_enabled===true && r.public_record_url)
      .filter(r=>includeHistory || archiveIntent || r.source_role!=="version_history")
      .map(record=>({record,score:scoreRecord(q,record)}))
      .filter(x=>x.score>=minScore)
      .sort((a,b)=>b.score-a.score || String(a.record.guide_no||"").localeCompare(String(b.record.guide_no||""),"mk"))
      .slice(0,Math.max(1,Math.min(6,Number(limit)||3)))
      .map(({record,score})=>({
        id:record.id,
        guideNo:record.guide_no,
        title:record.display_title || record.title,
        scope:record.scope || "",
        category:record.category_label || "",
        verificationLabel:record.verification_label || "",
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
    scoreRecord,
    routeGuides,
    currentPublicGuides,
    extraTerms:EXTRA_TERMS
  });
});
