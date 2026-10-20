// Governed processors for case-law discovery registers and official court bulletins.
// These helpers preserve source identifiers verbatim and never promote a bulletin
// excerpt/headnote into a complete originating judgment.

export const CASE_LAW_PUBLICATION_PROCESSOR_VERSION="1.0.0";

function clean(value=""){
  return String(value||"").normalize("NFKC").replace(/\r\n?/g,"\n");
}
function compact(value=""){
  return clean(value).replace(/\s+/g," ").trim();
}
function uniqueBy(items,keyFn){
  const seen=new Set();
  const out=[];
  for(const item of items){
    const key=keyFn(item);
    if(seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

const REGISTER_CASE_RE=/(?<![\p{L}\p{N}])((?:ГЖ|ТСЖ|гж|тсж)\s*[-–—]?\s*[0-9]{1,7}(?:\s*\/\s*[0-9]{1,4})?)(?![\p{L}\p{N}])/gu;

export function assessDiscoveryCaseIdentifier(rawValue){
  const raw=compact(rawValue);
  const noSpaces=raw.replace(/\s+/g,"");
  const m=noSpaces.match(/^((?:ГЖ|ТСЖ|гж|тсж))[-–—]?([0-9]{1,7})(?:\/([0-9]{1,4}))?$/u);
  if(!m){
    return Object.freeze({
      raw,
      normalizedLookupKey:null,
      quality:"review_required",
      flags:Object.freeze(["unrecognized_case_identifier_shape"]),
      sourceValuePreserved:true
    });
  }
  const flags=[];
  const prefix=m[1];
  const number=m[2];
  const year=m[3]||null;
  if(!year) flags.push("missing_year_separator_or_year");
  else if(!/^\d{2}$|^\d{4}$/.test(year)) flags.push("year_component_unexpected_length");
  if(prefix!==prefix.toUpperCase()) flags.push("source_case_style_variant");
  if(number.length>=6 && !year) flags.push("possible_concatenated_number_and_year");
  const quality=flags.some(x=>x!=="source_case_style_variant")?"review_required":(flags.length?"style_review":"valid_shape");
  const normalizedLookupKey=year
    ? `${prefix.toUpperCase()}-${number}/${year}`
    : `${prefix.toUpperCase()}-${number}`;
  return Object.freeze({
    raw,
    normalizedLookupKey,
    quality,
    flags:Object.freeze(flags),
    sourceValuePreserved:true
  });
}

export function extractCaseLawDiscoveryRegister(textInput,{sourceId="supplied-case-law-discovery-register"}={}){
  const text=clean(textInput);
  const records=[];
  const lines=text.split("\n");
  let currentTopic=null;
  let currentSubtopic=null;

  for(let i=0;i<lines.length;i++){
    const line=compact(lines[i]);
    if(!line) continue;
    const matches=[...line.matchAll(REGISTER_CASE_RE)];
    if(matches.length===0){
      if(line.length<=160 && !/[.;:]$/u.test(line)){
        if(!currentTopic) currentTopic=line;
        else currentSubtopic=line;
      }
      continue;
    }
    for(const match of matches){
      const assessed=assessDiscoveryCaseIdentifier(match[1]);
      records.push(Object.freeze({
        source_id:sourceId,
        record_type:"case_law_discovery_target",
        topic:currentTopic,
        subtopic:currentSubtopic,
        source_case_identifier:assessed.raw,
        normalized_lookup_key:assessed.normalizedLookupKey,
        identifier_quality:assessed.quality,
        identifier_quality_flags:assessed.flags,
        source_line:i+1,
        discovery_only:true,
        originating_decision_verified:false,
        human_review_required:true,
        production_eligible:false
      }));
    }
  }

  return Object.freeze({
    processor_version:CASE_LAW_PUBLICATION_PROCESSOR_VERSION,
    source_id:sourceId,
    record_type:"case_law_discovery_register",
    record_count:records.length,
    review_required_count:records.filter(r=>r.identifier_quality==="review_required").length,
    records:Object.freeze(records),
    human_gate_required:true,
    source_values_preserved:true
  });
}

const BULLETIN_CASE_RE=/(?<![\p{L}\p{N}])((?:Квп\d*|Кзз|Рев\d*|Рев|Уж|Узп|Псж|Псс|Гж|Тсж)\.?\s*бр\.?\s*[0-9]{1,6}\s*\/\s*[0-9]{2,4})(?![\p{L}\p{N}])/giu;

function bulletinSubtype(context){
  const c=compact(context).toLocaleLowerCase("mk");
  if(/општ(?:а|ата)\s+седниц|начелен\s+став/.test(c)) return "general_session_conclusion";
  if(/правно\s+мислење/.test(c)) return "legal_opinion";
  if(/заклучок/.test(c)) return "department_conclusion";
  if(/сентенц/.test(c)) return "headnote_sentenca";
  if(/разумен\s+рок/.test(c)) return "reasonable_time_decision";
  if(/значајн(?:а|и)\s+одлук/.test(c)) return "significant_decision";
  if(/пресуда|решение|одлука/.test(c)) return "judgment_excerpt";
  return "bulletin_case_reference";
}

export function extractSupremeCourtBulletinReferences(textInput,{sourceId="mk-supreme-court-bulletin"}={}){
  const text=clean(textInput);
  const rows=[];
  for(const match of text.matchAll(BULLETIN_CASE_RE)){
    const raw=compact(match[1]);
    const start=Math.max(0,(match.index||0)-700);
    const end=Math.min(text.length,(match.index||0)+raw.length+900);
    const context=text.slice(start,end);
    rows.push({
      source_id:sourceId,
      record_type:bulletinSubtype(context),
      source_case_identifier:raw,
      normalized_lookup_key:raw.replace(/\s+/g,"").replace(/БР/giu,"бр").toUpperCase(),
      context_excerpt:compact(context).slice(0,1200),
      publication_source_type:"official_case_law_bulletin",
      full_judgment_available:false,
      originating_decision_binding_verified:false,
      discovery_only:true,
      human_review_required:true,
      production_eligible:false
    });
  }
  const records=uniqueBy(rows,x=>x.source_case_identifier+"|"+x.record_type)
    .map(x=>Object.freeze(x));
  return Object.freeze({
    processor_version:CASE_LAW_PUBLICATION_PROCESSOR_VERSION,
    source_id:sourceId,
    record_type:"official_case_law_bulletin",
    record_count:records.length,
    records:Object.freeze(records),
    rule:"A bulletin headnote, sentence, opinion, conclusion or excerpt is not represented as the complete originating decision.",
    human_gate_required:true
  });
}
