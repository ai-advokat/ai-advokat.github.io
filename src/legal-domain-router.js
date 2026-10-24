export const LEGAL_DOMAIN_ROUTER_VERSION="1.0.0";

export const LEGAL_DOMAIN_IDS=Object.freeze([
  "labour_social",
  "civil_private",
  "civil_procedure",
  "administrative_law",
  "criminal_substantive",
  "criminal_procedure",
  "family_property",
  "property_law",
  "civil_compensation",
  "private_notarial",
  "human_rights",
  "access_to_justice",
  "integrity",
  "public_information",
  "general_legal",
  "unknown"
]);

const CYR_TO_LAT=Object.freeze({
  "а":"a","б":"b","в":"v","г":"g","д":"d","ѓ":"gj","е":"e","ж":"zh","з":"z","ѕ":"dz","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ќ":"kj","у":"u","ф":"f","х":"h","ц":"c","ч":"ch","џ":"dz","ш":"sh"
});

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

const DOMAIN_SIGNALS=Object.freeze({
  labour_social:Object.freeze([
    ["враќање на работа",22],["врати на работа",20],["работен однос",18],["договор за вработување",16],
    ["работно место",12],["неисплатена плата",16],["вознемирување на работно место",18],
    ["работник",12],["работодавач",12],["отказ",18],["вработување",12],["плата",10],["стаж",12],
    ["фпио",14],["фзо",12],["мобинг",16]
  ]),
  administrative_law:Object.freeze([
    ["управен суд",22],["управно решение",20],["управна постапка",18],["управен спор",20],
    ["молчење на администрација",20],["молчење на администрацијата",20],["управен акт",18],
    ["институцијата не одговара",16],["институција не одговара",16],
    ["управен",12],["управна",12],["управно",12],["администрација",12],["институција",8]
  ]),
  criminal_procedure:Object.freeze([
    ["кривична пријава",22],["кривична постапка",20],["полициска станица",18],["лишен од слобода",18],
    ["лишена од слобода",18],["условен отпуст",18],["полиција",12],["притвор",20],["осомничен",16],
    ["осомничена",16],["обвинет",16],["обвинета",16],["сведок",12],["оштетен",10],["жртва",8]
  ]),
  criminal_substantive:Object.freeze([
    ["кривичен законик",22],["кривично дело",18],["казнено дело",18],["сторител",12],["кривична одговорност",18]
  ]),
  family_property:Object.freeze([
    ["родителско право",18],["вонбрачна заедница",18],["заеднички имот",14],
    ["развод",22],["издршка",18],["алиментација",18],["старателство",18],["брак",12],["дете",7],
    ["оставина",18],["наследство",18]
  ]),
  property_law:Object.freeze([
    ["право на сопственост",20],["имотен лист",18],["сопственост",16],["катастар",16],["владение",14],["недвижност",12]
  ]),
  civil_compensation:Object.freeze([
    ["сообраќајна незгода",22],["сообраќајна несреќа",22],["надомест на штета",18],["надоместок на штета",18],
    ["осигурител",16],["осигурување",14],["сообраќајка",18],["штета",9]
  ]),
  private_notarial:Object.freeze([
    ["кај нотар",18],["нотарска изјава",18],["нотарска исправа",18],["заверка на потпис",16],
    ["нотар",16],["полномошно",12],["заверка",14],["солемнизација",18]
  ]),
  access_to_justice:Object.freeze([
    ["бесплатна правна помош",24],["бесплатен адвокат",20],["избор на адвокат",18],
    ["адвокатска тарифа",16],["адвокат",8],["правна помош",14]
  ]),
  integrity:Object.freeze([
    ["пријавување корупција",20],["заштита на укажувач",20],["корупција",20],["мито",18],["укажувач",18]
  ]),
  human_rights:Object.freeze([
    ["европски суд за човекови права",24],["европска конвенција",20],["човекови права",18],
    ["есчп",22],["echr",22],["hudoc",20]
  ]),
  public_information:Object.freeze([
    ["слободен пристап до информации",24],["информации од јавен карактер",22],["јавен карактер",16]
  ]),
  civil_procedure:Object.freeze([
    ["парнична постапка",20],["тужбено барање",18],["граѓански суд",18],["зпп",22],["парница",18]
  ]),
  civil_private:Object.freeze([
    ["облигационен договор",18],["раскинување договор",16],["исполнување договор",16],["договорна обврска",16]
  ])
});

const CROSS_DOMAIN_RULES=Object.freeze({
  labour_social:Object.freeze({civil_procedure:"civil_procedure_support_for_labour_dispute"}),
  family_property:Object.freeze({civil_procedure:"civil_procedure_support_for_family_property_dispute"}),
  property_law:Object.freeze({civil_procedure:"civil_procedure_support_for_property_dispute"}),
  civil_compensation:Object.freeze({civil_procedure:"civil_procedure_support_for_compensation_dispute"}),
  criminal_substantive:Object.freeze({criminal_procedure:"criminal_procedure_support_for_substantive_criminal_issue"}),
  criminal_procedure:Object.freeze({criminal_substantive:"substantive_criminal_basis_for_procedural_issue"}),
  human_rights:Object.freeze({
    criminal_procedure:"domestic_criminal_procedure_context_for_human_rights_issue",
    administrative_law:"domestic_administrative_context_for_human_rights_issue"
  })
});

export function normalizeLegalDomainText(value){
  const raw=String(value??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  let out="";
  for(const ch of raw) out+=CYR_TO_LAT[ch]??ch;
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
  return normalizeLegalDomainText(value).split(" ").filter(Boolean);
}

function signalMatches(normalized,tokens,signal){
  const term=normalizeLegalDomainText(signal);
  if(!term) return false;
  if(term.includes(" ")) return normalized===term || normalized.includes(term);
  return tokens.some(token=>token===term || (term.length>=5 && token.startsWith(term)));
}

function scoreDomain(question,domain){
  const normalized=normalizeLegalDomainText(question);
  const tokens=tokenise(normalized);
  let score=0;
  const matches=[];
  for(const [signal,weight] of (DOMAIN_SIGNALS[domain]||[])){
    if(signalMatches(normalized,tokens,signal)){
      score+=weight;
      matches.push(Object.freeze({signal,weight}));
    }
  }
  return Object.freeze({domain,score,matches:Object.freeze(matches)});
}

export function classifyLegalDomain(question){
  const normalized=normalizeLegalDomainText(question);
  const ranked=Object.keys(DOMAIN_SIGNALS)
    .map(domain=>scoreDomain(normalized,domain))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score || a.domain.localeCompare(b.domain));

  const top=ranked[0]||null;
  const second=ranked[1]||null;
  if(!top || top.score<10){
    return Object.freeze({
      version:LEGAL_DOMAIN_ROUTER_VERSION,
      routingState:"UNRESOLVED",
      primaryDomain:"unknown",
      primaryScore:top?.score||0,
      secondaryDomains:Object.freeze([]),
      confidence:"LOW",
      matchedSignals:Object.freeze(top?.matches||[]),
      ranked:Object.freeze(ranked)
    });
  }
  if(second && second.score>=10 && (top.score-second.score)<=2){
    return Object.freeze({
      version:LEGAL_DOMAIN_ROUTER_VERSION,
      routingState:"UNRESOLVED",
      primaryDomain:"unknown",
      primaryScore:top.score,
      secondaryDomains:Object.freeze(ranked.slice(0,3).map(x=>Object.freeze({domain:x.domain,score:x.score}))),
      confidence:"LOW",
      matchedSignals:Object.freeze([...top.matches,...second.matches]),
      ranked:Object.freeze(ranked)
    });
  }

  const secondary=ranked
    .slice(1)
    .filter(x=>x.score>=8 && x.score>=Math.max(8,Math.floor(top.score*0.6)))
    .slice(0,3)
    .map(x=>Object.freeze({domain:x.domain,score:x.score,matchedSignals:x.matches}));
  const gap=top.score-(second?.score||0);
  const confidence=top.score>=20 && gap>=6 ? "HIGH" : top.score>=12 && gap>=3 ? "MEDIUM" : "LOW";
  return Object.freeze({
    version:LEGAL_DOMAIN_ROUTER_VERSION,
    routingState:"RESOLVED",
    primaryDomain:top.domain,
    primaryScore:top.score,
    secondaryDomains:Object.freeze(secondary),
    confidence,
    matchedSignals:Object.freeze(top.matches),
    ranked:Object.freeze(ranked)
  });
}

export function guideRecordDomain(record){
  return CATEGORY_DOMAIN[String(record?.category_code||"")]||"unknown";
}

function proceduralTrigger(question,sourceDomain){
  const q=normalizeLegalDomainText(question);
  if(sourceDomain==="civil_procedure"){
    const triggers=["sud","tuzba","tuzbeno baranje","parnica","dokaz","sudska zastita","zpp"];
    return triggers.find(t=>q.includes(t))||null;
  }
  if(sourceDomain==="criminal_procedure"){
    const triggers=["krivicna postapka","policija","pritvor","obvinet","osomnicen","krivicna prijava"];
    return triggers.find(t=>q.includes(t))||null;
  }
  if(sourceDomain==="criminal_substantive"){
    const triggers=["krivicno delo","krivicen zakonik","krivicna odgovornost"];
    return triggers.find(t=>q.includes(t))||null;
  }
  if(sourceDomain==="administrative_law"){
    const triggers=["upraven","upravna","upravno","institucija","administracija"];
    return triggers.find(t=>q.includes(t))||null;
  }
  return null;
}

export function assessSourceDomainCompatibility(classification,sourceDomain,{question="",sourceId=""}={}){
  const domain=LEGAL_DOMAIN_IDS.includes(sourceDomain)?sourceDomain:"unknown";
  if(!classification || classification.routingState!=="RESOLVED" || classification.primaryDomain==="unknown"){
    return Object.freeze({
      allowed:false,state:"UNRESOLVED",sourceDomain:domain,
      reason:"query_domain_unresolved",sourceId,authorityClassChanged:false
    });
  }
  if(domain==="unknown"){
    return Object.freeze({
      allowed:false,state:"UNRESOLVED",sourceDomain:domain,
      reason:"source_domain_unresolved",sourceId,authorityClassChanged:false
    });
  }
  if(domain===classification.primaryDomain){
    return Object.freeze({
      allowed:true,state:"COMPATIBLE_PRIMARY",sourceDomain:domain,
      reason:"matches_primary_domain:"+classification.primaryDomain,sourceId,authorityClassChanged:false
    });
  }
  if((classification.secondaryDomains||[]).some(x=>x.domain===domain)){
    return Object.freeze({
      allowed:true,state:"COMPATIBLE_SECONDARY",sourceDomain:domain,
      reason:"matches_explicit_secondary_domain:"+domain,sourceId,authorityClassChanged:false
    });
  }
  const rule=CROSS_DOMAIN_RULES[classification.primaryDomain]?.[domain];
  if(rule){
    const trigger=proceduralTrigger(question,domain);
    if(trigger){
      return Object.freeze({
        allowed:true,state:"COMPATIBLE_CROSS_DOMAIN",sourceDomain:domain,
        reason:rule+";trigger="+trigger,sourceId,authorityClassChanged:false
      });
    }
  }
  return Object.freeze({
    allowed:false,state:"INCOMPATIBLE",sourceDomain:domain,
    reason:"source_domain_"+domain+"_not_compatible_with_primary_"+classification.primaryDomain,
    sourceId,authorityClassChanged:false
  });
}

export function assessGuideDomainCompatibility(question,record,classification=classifyLegalDomain(question)){
  const sourceId=String(record?.id||"");
  const sourceDomain=guideRecordDomain(record);
  const q=normalizeLegalDomainText(question);
  const title=normalizeLegalDomainText(record?.display_title||record?.title||"");
  if(title && title.length>=10 && (q===title || q.includes(title))){
    return Object.freeze({
      allowed:true,state:"COMPATIBLE_EXPLICIT",sourceDomain,
      reason:"explicit_guide_title:"+sourceId,sourceId,authorityClassChanged:false
    });
  }
  return assessSourceDomainCompatibility(classification,sourceDomain,{question,sourceId});
}

export function filterGuideRecordsForLegalDomain(records,question,wantedIds=[]){
  const wanted=new Set((Array.isArray(wantedIds)?wantedIds:[]).map(String));
  const classification=classifyLegalDomain(question);
  const decisions=[];
  const allowed=[];
  const blocked=[];
  for(const record of (Array.isArray(records)?records:[])){
    const id=String(record?.id||"");
    if(wanted.size && !wanted.has(id)) continue;
    const compatibility=assessGuideDomainCompatibility(question,record,classification);
    const row=Object.freeze({id,record,compatibility});
    decisions.push(row);
    if(compatibility.allowed) allowed.push(record);
    else blocked.push(record);
  }
  return Object.freeze({
    version:LEGAL_DOMAIN_ROUTER_VERSION,
    classification,
    allowed:Object.freeze(allowed),
    blocked:Object.freeze(blocked),
    decisions:Object.freeze(decisions)
  });
}
