import { WORKFLOW_TEMPLATES } from "./proactive-legal-agents.js";

export const OPERATING_DESK_VERSION="1.0.0";

const SECURE_CASE=Object.freeze({
  id:"secure_case",
  label:"Secure Case Workspace",
  href:"/casepilot-workspace.html",
  reason:"Оригинални, доверливи или идентификувачки материјали прво одат во заштитен предметен простор."
});

const TASKS=Object.freeze({
  new_matter:Object.freeze({
    id:"new_matter",label:"Нов предмет",group:"предмет",
    primary:Object.freeze({id:"casepilot",label:"CasePilot Matter Space",href:"/casepilot-workspace.html"}),
    workflow:"litigation_case_review",
    objective:"Изгради проверлива карта на предметот: факти, спорни прашања, докази, празнини, релевантно право, adverse authority и review-ready следни чекори.",
    inputs:Object.freeze(["материјали за предметот","основна цел на анализата"]),
    outputs:Object.freeze(["matter map","risk register","source manifest","review-ready note"]),
    steps:Object.freeze(["регистрирај материјали и provenance","изгради timeline/claims/evidence","истражи важечко право и reviewed case law","провери adverse authority","Human Gate"])
  }),
  contract_review:Object.freeze({
    id:"contract_review",label:"Проверка на договор",group:"договор",
    primary:Object.freeze({id:"ai_contract",label:"AI CONTRACT",href:"/ai-contract.html"}),
    workflow:"contract_review",
    objective:"Извлечи обврски, рокови, плаќања, престанок, одговорност, доверливост/IP, применливо право и спорни или недостасувачки клаузули; подготви review-ready ризици.",
    inputs:Object.freeze(["договор или договорен нацрт","позиција/playbook ако постои"]),
    outputs:Object.freeze(["clause table","risk register","open questions","redline notes"]),
    steps:Object.freeze(["внеси договор","извлечи клаузули и обврски","спореди со playbook","провери правни референци","Human Gate пред редлајн/прифаќање"])
  }),
  document_review:Object.freeze({
    id:"document_review",label:"Пакет документи / due diligence",group:"документи",
    primary:Object.freeze({id:"review_tables",label:"Professional Tools · Review Tables",href:"/professional-tools.html#batch-review"}),
    workflow:"due_diligence_review",
    objective:"Класифицирај пакет документи, извлечи клучни полиња, рокови и правни референци, означи празнини и недоследности и создади review-ready табела.",
    inputs:Object.freeze(["збир на документи"]),
    outputs:Object.freeze(["review table","exceptions register","source manifest"]),
    steps:Object.freeze(["класифицирај документи","извлечи клучни полиња","означи недоследности","провери извори/референци","Human Gate"])
  }),
  legal_research:Object.freeze({
    id:"legal_research",label:"Правно истражување",group:"истражување",
    primary:Object.freeze({id:"hybrid",label:"Hybrid Legal Intelligence",href:"/hybrid-legal-intelligence.html"}),
    workflow:"legal_research_memo",
    objective:"Истражи го правното прашање source-first, рангирај authority, провери jurisdiction/version/effective date и подготви memo со поддржани и неподдржани тврдења.",
    inputs:Object.freeze(["правно прашање","релевантни факти без непотребни идентификатори"]),
    outputs:Object.freeze(["authority map","research memo","claim-to-source check"]),
    steps:Object.freeze(["дефинирај прашање","истражи примарни извори","провери case law/ECHR ако е релевантно","провери верзија и adverse authority","Human Gate"])
  }),
  evidence_review:Object.freeze({
    id:"evidence_review",label:"Факти, докази и противречности",group:"докази",
    primary:Object.freeze({id:"fact_graph",label:"Fact & Evidence Graph",href:"/fact-evidence-graph.html"}),
    workflow:"evidence_review",
    objective:"Поврзи ги материјалните тврдења со докази, идентификувај контрадикции, празнини и adverse evidence и подготви прашања за човечка проверка.",
    inputs:Object.freeze(["claims/evidence set"]),
    outputs:Object.freeze(["evidence map","contradiction register","gap register","follow-up questions"]),
    steps:Object.freeze(["изгради claim map","врзи evidence","најди противречности","најди празнини","Human Gate"])
  }),
  law_change:Object.freeze({
    id:"law_change",label:"Промена на закон / регулатива",group:"важечко право",
    primary:Object.freeze({id:"consolidator",label:"Current-Law Watch / Consolidator",href:"/consolidator/"}),
    workflow:"regulatory_change_review",
    objective:"Откриј candidate промена, спореди верзии и effective-date контекст, мапирај влијание и задржи change state како непотврден додека Authority Verification и Human Gate не го одобрат.",
    inputs:Object.freeze(["идентификуван правен извор или тема"]),
    outputs:Object.freeze(["version comparison","impact note","verification queue"]),
    steps:Object.freeze(["набљудувај извор","спореди fingerprint/version","провери authority и effective date","подготви impact note","Human Gate пред current-law употреба"])
  }),
  hearing:Object.freeze({
    id:"hearing",label:"Подготовка за рочиште",group:"литигaција",
    primary:Object.freeze({id:"casepilot",label:"CasePilot Matter Space",href:"/casepilot-workspace.html"}),
    workflow:"litigation_case_review",
    objective:"Подготви hearing-ready работен пакет: live issues, facts/sources, прашања за сведоци/вештаци, adverse points, процесни ризици и структуриран аргумент за адвокатска проверка.",
    inputs:Object.freeze(["верификувана matter map","релевантни документи и рокови"]),
    outputs:Object.freeze(["hearing pack","question sets","risk checklist","source manifest"]),
    steps:Object.freeze(["провери live issues","провери факти и извори","стрес-тестирај аргументи","подготви прашања/checklist","Human Gate"])
  }),
  employment_review:Object.freeze({
    id:"employment_review",label:"Работен однос / employment matter",group:"предмет",
    primary:Object.freeze({id:"hybrid",label:"Hybrid Legal Intelligence",href:"/hybrid-legal-intelligence.html"}),
    workflow:"employment_review",
    objective:"Изгради фактичка временска линија, провери релевантни извори, рокови и ризици и подготви review-ready employment matter note.",
    inputs:Object.freeze(["факти и документи","работно-правно прашање"]),
    outputs:Object.freeze(["fact timeline","risk map","source-backed review note"]),
    steps:Object.freeze(["timeline","source research","risk map","verification","Human Gate"])
  }),
  compliance_review:Object.freeze({
    id:"compliance_review",label:"Compliance / усогласеност",group:"усогласеност",
    primary:Object.freeze({id:"hybrid",label:"Hybrid Legal Intelligence",href:"/hybrid-legal-intelligence.html"}),
    workflow:"compliance_review",
    objective:"Дефинирај scope, провери важечки извори, мапирај контроли и празнини и подготви review-ready compliance note без тврдење за сертификација.",
    inputs:Object.freeze(["scope","релевантни политики/контроли"]),
    outputs:Object.freeze(["control map","gap register","verification note"]),
    steps:Object.freeze(["scope","source check","control map","gap review","Human Gate"])
  }),
  contract_monitoring:Object.freeze({
    id:"contract_monitoring",label:"Следење договорни обврски",group:"мониторинг",
    primary:Object.freeze({id:"runtime",label:"Proactive Runtime",href:"/proactive-agent-runtime.html"}),
    workflow:"obligation_monitoring",
    objective:"Извлечи договорни обврски и рокови, создади review queue и Human Nudges; не испраќај известувања или надворешни пораки без посебно овластување.",
    inputs:Object.freeze(["портфолио/договори","одобрени рокови и обврски"]),
    outputs:Object.freeze(["obligation register","deadline queue","human nudges"]),
    steps:Object.freeze(["portfolio scope","obligation extract","deadline queue","change check","Human Gate"])
  }),
  authority_monitoring:Object.freeze({
    id:"authority_monitoring",label:"Следење промени во authority",group:"мониторинг",
    primary:Object.freeze({id:"runtime",label:"Proactive Runtime",href:"/proactive-agent-runtime.html"}),
    workflow:"authority_update",
    objective:"Следи candidate промени во authority за конкретен matter scope, спореди влијание и создади verification/Human Nudge queue.",
    inputs:Object.freeze(["matter scope","одобрени authority sources"]),
    outputs:Object.freeze(["change queue","authority comparison","impact note"]),
    steps:Object.freeze(["change scan","authority compare","impact note","verification","Human Gate"])
  }),
  translation:Object.freeze({
    id:"translation",label:"Правен превод",group:"јазик",
    primary:Object.freeze({id:"bot",label:"AI Advokat · Translator / Chat",href:"/bot/"}),
    workflow:null,
    objective:"Преведи го правниот текст со зачувување на имиња, броеви, членови, цитати и правен ефект; означи терминолошка неизвесност за човечка проверка.",
    inputs:Object.freeze(["текст без непотребни лични податоци"]),
    outputs:Object.freeze(["draft legal translation","terminology review flags"]),
    steps:Object.freeze(["избери јазик","преведи","провери имиња/броеви/членови","терминолошка проверка","Human Gate"])
  }),
  drafting:Object.freeze({
    id:"drafting",label:"Подготовка на правен нацрт / memo",group:"излез",
    primary:Object.freeze({id:"bot",label:"AI Advokat · Professional Chat",href:"/bot/"}),
    workflow:null,
    objective:"Подготви review-ready правен нацрт само од проверени факти и извори; непотврдените точки означи ги како отворени прашања.",
    inputs:Object.freeze(["цел на документот","проверени факти/извори"]),
    outputs:Object.freeze(["review-ready draft","open issues","source checklist"]),
    steps:Object.freeze(["дефинирај deliverable","внеси проверени факти/извори","создади draft","провери citations/versions","Human Gate пред испраќање/поднесување"])
  }),
  training:Object.freeze({
    id:"training",label:"Обука / вежбање",group:"обука",
    primary:Object.freeze({id:"guide",label:"Водилка за Зоки",href:"/zoki-legal-ai-guide.html"}),
    workflow:null,
    objective:"Вежбај со синтетички или јавни факти и научи ја правилната патека без доверливи податоци.",
    inputs:Object.freeze(["синтетичко сценарио"]),
    outputs:Object.freeze(["practice result","self-check","Human Gate habit"]),
    steps:Object.freeze(["избери задача","користи TRAINING/јавни материјали","следи ја патеката","спореди со expected output","Human Gate"])
  })
});

export function listOperatingTasks(){
  return Object.values(TASKS).map(t=>Object.freeze({id:t.id,label:t.label,group:t.group,workflow:t.workflow}));
}

export function getOperatingTask(id){
  return TASKS[String(id||"")]||null;
}

export function buildOperatingPlan(taskId,{sensitivity="public"}={}){
  const task=getOperatingTask(taskId);
  if(!task) throw new TypeError("operating_desk_unknown_task");
  if(!["public","confidential"].includes(sensitivity)) throw new TypeError("operating_desk_invalid_sensitivity");
  if(task.workflow && !WORKFLOW_TEMPLATES[task.workflow]) throw new TypeError("operating_desk_unknown_workflow_template");

  const secureRequired=sensitivity==="confidential";
  const secureFirst=secureRequired && task.primary.id!=="casepilot";
  const firstAction=secureFirst?SECURE_CASE:task.primary;
  const nextActions=[];
  if(secureFirst) nextActions.push(Object.freeze({
    ...task.primary,
    label:"По Secure Case · "+task.primary.label+" · само со редигиран/одобрен извод"
  }));
  if(task.workflow){
    nextActions.push(Object.freeze({
      id:"agent_runtime",
      label:"Agent workflow · "+WORKFLOW_TEMPLATES[task.workflow].label,
      href:"/proactive-agent-runtime.html?source=operating-desk&task="+encodeURIComponent(task.id)+"&template="+encodeURIComponent(task.workflow)
    }));
  }

  return Object.freeze({
    version:OPERATING_DESK_VERSION,
    taskId:task.id,
    taskLabel:task.label,
    sensitivity,
    privacyRoute:secureRequired?"secure_case_first":"standard_bounded_route",
    firstAction,
    nextActions:Object.freeze(nextActions),
    workflowTemplate:task.workflow,
    objective:task.objective,
    inputs:task.inputs,
    outputs:task.outputs,
    steps:task.steps,
    humanGate:Object.freeze({
      required:true,
      externalTransmission:"locked",
      filing:"locked",
      signature:"locked",
      contractAcceptance:"locked",
      canonicalPromotion:"locked"
    })
  });
}
