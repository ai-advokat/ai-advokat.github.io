import test from "node:test";
import assert from "node:assert/strict";
import {
  CASEPILOT_MATTER_VERSION,
  createMatter,
  documentRecord,
  timelineEvent,
  claim,
  evidenceItem,
  claimEvidenceLink,
  contradiction,
  evidenceGap,
  proceduralRisk,
  hearingQuestion,
  aiFinding,
  decideAIFinding,
  addMatterObject,
  matterReadiness
} from "../src/casepilot-matter.js";

const SHA="a".repeat(64);

function baseMatter(){
  let m=createMatter({matterId:"CASE-001",title:"Тест предмет"});
  m=addMatterObject(m,"documents",documentRecord({id:"DOC-1",title:"Пресуда",sha256:SHA,pageCount:10}));
  m=addMatterObject(m,"documents",documentRecord({id:"DOC-2",title:"Исказ",sha256:"b".repeat(64),pageCount:5}));
  return m;
}

test("creates a locked CasePilot matter v2",()=>{
  const m=createMatter({matterId:"CASE-001",title:"Предмет"});
  assert.equal(m.version,CASEPILOT_MATTER_VERSION);
  assert.equal(m.humanGate.professionalUse,"locked");
  assert.equal(m.humanGate.filing,"forbidden");
  assert.equal(m.humanGate.signature,"forbidden");
});

test("source-linked matter objects require registered source/page anchors",()=>{
  let m=baseMatter();
  m=addMatterObject(m,"timeline",timelineEvent({
    id:"EV-1",date:"2026-10-10",text:"Настан",sourceId:"DOC-1",page:2
  }));
  m=addMatterObject(m,"claims",claim({
    id:"CL-1",text:"Тврдење",sourceId:"DOC-1",page:3
  }));
  m=addMatterObject(m,"evidence",evidenceItem({
    id:"E-1",title:"Доказ",sourceId:"DOC-2",page:1
  }));
  m=addMatterObject(m,"claim_evidence",claimEvidenceLink({
    id:"L-1",claimId:"CL-1",evidenceId:"E-1",supportType:"supports"
  }));
  const ready=matterReadiness(m);
  assert.equal(ready.sourceProblems.length,0);
  assert.equal(ready.professionalUseReady,false);
});

test("readiness catches unknown sources and out-of-range pages",()=>{
  let m=baseMatter();
  m=addMatterObject(m,"timeline",timelineEvent({
    id:"EV-2",text:"Настан",sourceId:"DOC-1",page:99
  }));
  m=addMatterObject(m,"claims",claim({
    id:"CL-2",text:"Тврдење",sourceId:"DOC-X",page:1
  }));
  const ready=matterReadiness(m);
  assert.ok(ready.sourceProblems.some(x=>x.error==="page_out_of_range"));
  assert.ok(ready.sourceProblems.some(x=>x.error==="source_not_registered"));
});

test("claim-evidence links cannot silently point to missing objects",()=>{
  let m=baseMatter();
  m=addMatterObject(m,"claim_evidence",claimEvidenceLink({
    id:"L-X",claimId:"CL-MISSING",evidenceId:"E-MISSING"
  }));
  const ready=matterReadiness(m);
  assert.ok(ready.sourceProblems.some(x=>x.error==="claim_not_found"));
  assert.ok(ready.sourceProblems.some(x=>x.error==="evidence_not_found"));
});

test("contradictions preserve both exact source anchors",()=>{
  let m=baseMatter();
  m=addMatterObject(m,"contradictions",contradiction({
    id:"CON-1",
    left:{text:"Верзија А",sourceId:"DOC-1",page:2},
    right:{text:"Верзија Б",sourceId:"DOC-2",page:4},
    meaning:"Материјална разлика"
  }));
  const x=m.objects.contradictions[0];
  assert.equal(x.status,"disputed");
  assert.equal(x.left.source.sourceId,"DOC-1");
  assert.equal(x.right.source.page,4);
  assert.equal(matterReadiness(m).sourceProblems.length,0);
});

test("AI findings remain locked until a lawyer records a decision",()=>{
  let m=baseMatter();
  const f=aiFinding({
    id:"AI-1",
    text:"Работен AI заклучок",
    sources:[{sourceId:"DOC-1",page:2}]
  });
  m=addMatterObject(m,"ai_findings",f);
  assert.equal(matterReadiness(m).unreviewedAIFindings,1);

  const approved=decideAIFinding(f,{
    decision:"accepted",
    lawyer:"Adv. Reviewer",
    decidedAt:"2026-10-10T18:40:00Z"
  });
  let m2=baseMatter();
  m2=addMatterObject(m2,"ai_findings",approved);
  assert.equal(matterReadiness(m2).unreviewedAIFindings,0);
  assert.equal(approved.lockedForProfessionalUse,false);
});

test("corrected AI findings require corrected text",()=>{
  const f=aiFinding({
    id:"AI-2",
    text:"Неточен работен заклучок",
    sources:[{sourceId:"DOC-1",page:1}]
  });
  assert.throws(()=>decideAIFinding(f,{decision:"corrected",lawyer:"A",decidedAt:"2026-10-10T18:40:00Z"}),/text_required/);
  const corrected=decideAIFinding(f,{
    decision:"corrected",
    lawyer:"A",
    decidedAt:"2026-10-10T18:40:00Z",
    correctedText:"Коригиран заклучок"
  });
  assert.equal(corrected.correctedText,"Коригиран заклучок");
});

test("professional objects remain working drafts and review-bound",()=>{
  const gap=evidenceGap({id:"G-1",issue:"Недостига документ",whyMaterial:"Влијае на факт"});
  const risk=proceduralRisk({id:"R-1",title:"Рок",description:"Можен процесен рок",severity:"high"});
  const q=hearingQuestion({
    id:"Q-1",targetType:"witness",targetId:"P-1",
    question:"Кога го видовте настанот?",purpose:"Проверка на хронологијата",
    sourceId:"DOC-2",page:2
  });
  assert.equal(gap.status,"missing");
  assert.equal(risk.humanReviewRequired,true);
  assert.equal(q.status,"working_draft");
});
