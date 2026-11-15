// R22: opt-in, source-conscious next-turn suggestions for both chat surfaces.
// No network requests, no autonomous legal action, no copying of user facts into
// generated prompts. The existing chat privacy checks still govern submission.
export const PROACTIVE_CONVERSATION_VERSION="AI_ADVOCAT_PROACTIVE_CONVERSATION_R22";

const MK=Object.freeze({
  general:{
    question:"За да продолжиме попрецизно, која е државата, релевантниот датум и што сакате да постигнете? Не внесувајте лични идентификатори.",
    options:[
      ["Разјасни ги фактите","Во продолжение на разговорот постави ми најмногу три кратки прашања за фактите што недостигаат. Не претпоставувај околности или лични податоци."],
      ["Провери правни извори","За претходното прашање оддели ги потврдените официјални правни извори, нивната верзија и датумот на важност. Ако нешто не е проверено, означи го како непроверено."],
      ["Предложи безбедни чекори","За претходното прашање предложи кратка листа на информации и документи што треба да ги провери човек. Не поднесувај ништо и не тврди дека е извршено правно дејство."]
    ]
  },
  procedural:{
    question:"Кој е видот на актот, во која постапка е донесен и кога е доставен? Овие податоци се потребни пред анализа на рок.",
    options:[
      ["Прашај ме за рокот","Постави ми најмногу три прашања за видот на актот, постапката и датумот на доставување пред да анализираш правен рок. Не измислувај рокови."],
      ["Провери важечки закон","За претходната постапка оддели ги релевантните официјални извори и важечките верзии, со Human Gate за секој непотврден рок или член."],
      ["Подготви чек-листа","Направи работна листа за адвокатска проверка: рок, надлежност, доставување, докази и можни процесни ризици. Без автоматско поднесување."]
    ]
  },
  employment:{
    question:"Дали постои писмен договор или решение, кој датум е релевантен и дали спорот е во тек?",
    options:[
      ["Прашај за фактите","Постави ми три кратки прашања за работниот однос, писмениот документ и датумите без барање лични идентификатори."],
      ["Провери ЗРО и извори","Продолжи со претходната работноправна тема, провери официјален извор и важечка верзија на законот. Разликувај факти од претпоставки."],
      ["План за проверка","Подготви работна чек-листа за документи, рокови и прашања што треба да ги провери адвокат. Не давај непроверен конечен правен заклучок."]
    ]
  },
  formal:{
    question:"Кој е видот на барањето, кои факти и докази се потврдени и што останува за адвокатска проверка?",
    options:[
      ["Разјасни барање","Постави ми најмногу три прашања за видот на поднесокот, релевантните факти и докази без лични идентификатори."],
      ["Провери основ и надлежност","За претходното барање оддели проверена правна основа, надлежност и рокови од непроверени претпоставки. Барај Human Gate."],
      ["Подготви работен нацрт","Предложи само структура на работен поднесок со празни полиња за факти и докази. Не измислувај членови и не поднесувај документ."]
    ]
  },
  contract:{
    question:"Кој е предметот на договорот, дали постои писмен текст и кој услов е спорен?",
    options:[
      ["Разјасни клаузули","Постави ми најмногу три прашања за видот на договорот, спорната клаузула и релевантните датуми, без доверливи идентификатори."],
      ["Провери правна рамка","За претходната договорна тема идентификувај официјални извори и разликувај потврдена правна обврска од општа насока."],
      ["Листа за ревизија","Подготви работна листа на договорни ризици, документи и прашања за адвокатска ревизија. Не тврди дека договор е правно проверен."]
    ]
  }
});
const EN=Object.freeze({
  general:{
    question:"To continue accurately, which jurisdiction, relevant date and outcome matter? Please avoid personal identifiers.",
    options:[
      ["Clarify the facts","Based on our conversation, ask me up to three concise questions about missing facts. Do not assume personal information or legal conclusions."],
      ["Check official sources","For our previous question, distinguish verified primary legal sources and effective dates from unverified claims. State any verification gaps."],
      ["Plan next steps","Suggest a short checklist for human legal review. Do not file, send, sign or claim to have taken any action."]
    ]
  },
  procedural:{
    question:"What type of decision was issued, in which procedure, and on what date was it served?",
    options:[
      ["Clarify deadlines","Ask up to three questions about the decision type, procedure and service date before considering a deadline. Do not invent deadlines."],
      ["Verify governing law","For the prior procedural question, identify official law and version evidence, and clearly mark any unverified article or date."],
      ["Prepare a review checklist","Prepare an attorney review checklist for service, deadlines, jurisdiction, evidence and procedural risks. Do not submit anything."]
    ]
  },
  employment:{
    question:"Is there a written agreement or decision, what date matters, and is a dispute ongoing?",
    options:[
      ["Clarify work facts","Ask up to three concise questions about the employment relationship, written records and dates without personal identifiers."],
      ["Verify labour law","For our employment question, check primary labour-law sources and applicable versions. Separate confirmed facts from assumptions."],
      ["Prepare a checklist","Make a working checklist of employment documents, potential deadlines and attorney review questions. Avoid unsupported legal conclusions."]
    ]
  },
  formal:{
    question:"What kind of filing is involved, which facts are confirmed and what evidence is still missing?",
    options:[
      ["Clarify the filing","Ask up to three questions about the filing type, known facts and available evidence without personal identifiers."],
      ["Verify the legal basis","For the proposed filing, distinguish verified legal basis, jurisdiction and deadlines from unverified claims. Require human review."],
      ["Draft an outline","Prepare only a working structure with blank fields for facts and evidence. Do not invent article numbers or submit any filing."]
    ]
  },
  contract:{
    question:"What is the contract type, is there a written text and which clause or obligation is disputed?",
    options:[
      ["Clarify contract facts","Ask up to three questions about the contract type, disputed clause and relevant dates without confidential identifiers."],
      ["Verify source law","For our contract issue, distinguish official governing law and verified requirements from general guidance."],
      ["Review risk checklist","Prepare a working checklist of contract risks, relevant documents and questions for a lawyer. Do not claim the contract is cleared."]
    ]
  }
});

const TOPICS=Object.freeze([
  ["procedural",/(?:притвор|пресуд|жалб|доставувањ|рок|судск[ио]\s+акт|решение|appeal|detention|deadline|service\s+of\s+process|court\s+order)/iu],
  ["employment",/(?:работен\s+однос|работодавач|вработувањ|отказ|плата|employment|dismissal|labou?r\s+law|salary)/iu],
  ["formal",/(?:тужб|поднесок|приговор|пријав[аи]|петици|lawsuit|legal\s+claim|complaint|filing|petition)/iu],
  ["contract",/(?:договор|анекс|клаузул|обврск|contract|agreement|clause)/iu]
]);

// Follow-up buttons are privacy-safe deterministic proposals, not model
// answers. They inherit the last user topic only for explicitly elliptical
// turns; previous AI content must never become an assumed source or fact.
const ELLIPTICAL_USER_TURN_RE=/^(?:(?:а|па|но|и|and|but)\s+)?(?:зошто|како\s+тоа|што\s+со|што\s+ако|што\s+следно|а\s+ако|а\s+сега|објасни\s+подетално|појасни|продолжи|не[,.]?\s*мислев|мислам\s+на|why|how\s+so|what\s+(?:about|if|next)|i\s+meant|please\s+elaborate)/iu;
const MK_LATIN_ELLIPTICAL_RE=/^(?:(?:a|pa|no|i)\s+)?(?:zosto|shto\s+(?:so|ako|sledno)|sto\s+(?:so|ako|sledno)|kako\s+toa|a\s+ako|ne[,.]?\s*mislev|mislam\s+na|prodolzi|pojasni)/iu;

function topicFromConversation(question,history=[]){
  const current=String(question||"").slice(0,3000);
  const explicit=TOPICS.find(([,pattern])=>pattern.test(current))?.[0]||null;
  if(explicit) return explicit;
  if(current.length>160 || (!ELLIPTICAL_USER_TURN_RE.test(current) && !MK_LATIN_ELLIPTICAL_RE.test(current))) return "general";
  const userTurns=(Array.isArray(history)?history:[])
    .filter(turn=>turn?.role==="user")
    .map(turn=>String(turn?.text||"").slice(0,2000))
    .filter(text=>text && text!==current)
    .slice(-8);
  for(const text of userTurns.reverse()){
    const topic=TOPICS.find(([,pattern])=>pattern.test(text))?.[0];
    if(topic) return topic;
  }
  return "general";
}

export function suggestLegalNextTurns({question="",answer="",language="mk",history=[]}={}){
  const result=String(answer||"").trim();
  if(result.length<16 || /^(?:AI одговор не е издаден|Нема одговор|Сервисен статус|No AI answer|Service unavailable)/iu.test(result)) return null;
  const q=String(question||"").slice(0,3000);
  const subject=topicFromConversation(q,history);
  const locale=String(language||"mk").toLowerCase()==="mk"?"mk":"en";
  const chosen=(locale==="mk"?MK:EN)[subject];
  return {
    version:PROACTIVE_CONVERSATION_VERSION,
    category:subject,
    language:locale,
    question:chosen.question,
    options:chosen.options.map(([label,prompt])=>({label,prompt})),
    requiresUserClick:true,
    sendsAutomatically:false,
    humanReviewRequired:true
  };
}
