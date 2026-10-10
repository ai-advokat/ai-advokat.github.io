// AI Advokat CasePilot -> governed export adapter v1.
// Converts a validated CasePilot matter into the existing CasePilot export model.
// It does not itself approve Human Gate or change workspace state.

import { CASEPILOT_MATTER_VERSION, matterReadiness } from "./casepilot-matter.js";

export const CASEPILOT_EXPORT_ADAPTER_VERSION="1.0.0";

function locator(anchor){
  if(!anchor) return "";
  return [`page ${anchor.page}`,anchor.paragraph?String(anchor.paragraph):null].filter(Boolean).join(" · ");
}

function sourceRef(anchor,sourceById){
  if(!anchor) return null;
  const source=sourceById.get(anchor.sourceId);
  if(!source) throw new Error("casepilot_export_unknown_source");
  return {
    id:source.id,
    title:source.title,
    locator:locator(anchor)
  };
}

function item({heading="",text,status="",sources=[]}){
  return {
    heading:String(heading||""),
    text:String(text||""),
    status:String(status||""),
    sources:sources.filter(Boolean)
  };
}

export function casePilotMatterToExportReport(matter,{summary=""}={}){
  if(!matter||matter.version!==CASEPILOT_MATTER_VERSION) throw new Error("casepilot_export_matter_required");

  const readiness=matterReadiness(matter);
  if(readiness.sourceProblems.length) throw new Error("casepilot_export_source_integrity_failed");

  const docs=matter.objects.documents;
  const sourceById=new Map(docs.map(d=>[d.id,d]));
  const sections=[];

  sections.push({
    id:"timeline",
    title:"Хронологија",
    items:matter.objects.timeline.map(x=>item({
      heading:[x.date,x.id].filter(Boolean).join(" · "),
      text:x.text,
      status:x.status,
      sources:[sourceRef(x.source,sourceById)]
    }))
  });

  sections.push({
    id:"participants",
    title:"Учесници",
    items:matter.objects.participants.map(x=>item({
      heading:x.name,
      text:`Улога: ${x.role}`,
      status:"SOURCE_LINKED",
      sources:[sourceRef(x.source,sourceById)]
    }))
  });

  sections.push({
    id:"legal-issues",
    title:"Правни прашања",
    items:matter.objects.legal_issues.map(x=>item({
      heading:x.title,
      text:x.question,
      status:"PROFESSIONAL_REVIEW_REQUIRED",
      sources:[]
    }))
  });

  sections.push({
    id:"claims",
    title:"Тврдења",
    items:matter.objects.claims.map(x=>item({
      heading:x.id,
      text:x.text,
      status:x.status,
      sources:[sourceRef(x.source,sourceById)]
    }))
  });

  sections.push({
    id:"evidence",
    title:"Докази",
    items:matter.objects.evidence.map(x=>item({
      heading:x.title,
      text:[`Тип: ${x.evidenceType}`,x.notes].filter(Boolean).join("\n"),
      status:"SOURCE_LINKED",
      sources:[sourceRef(x.source,sourceById)]
    }))
  });

  const evidenceById=new Map(matter.objects.evidence.map(x=>[x.id,x]));
  const claimById=new Map(matter.objects.claims.map(x=>[x.id,x]));
  sections.push({
    id:"claim-evidence",
    title:"Claim → Evidence матрица",
    items:matter.objects.claim_evidence.map(x=>{
      const claim=claimById.get(x.claimId);
      const evidence=evidenceById.get(x.evidenceId);
      const counter=x.counterevidenceIds.map(cid=>evidenceById.get(cid)).filter(Boolean);
      return item({
        heading:`${x.claimId} → ${x.evidenceId}`,
        text:[
          `Support type: ${x.supportType}`,
          x.weakness?`Weakness: ${x.weakness}`:null,
          counter.length?`Counterevidence: ${counter.map(e=>e.id).join(", ")}`:null
        ].filter(Boolean).join("\n"),
        status:"PROFESSIONAL_REVIEW_REQUIRED",
        sources:[
          claim?sourceRef(claim.source,sourceById):null,
          evidence?sourceRef(evidence.source,sourceById):null,
          ...counter.map(e=>sourceRef(e.source,sourceById))
        ]
      });
    })
  });

  sections.push({
    id:"contradictions",
    title:"Противречности",
    items:matter.objects.contradictions.map(x=>item({
      heading:x.id,
      text:[
        `A: ${x.left.text}`,
        `B: ${x.right.text}`,
        x.meaning?`Значење: ${x.meaning}`:null,
        x.question?`Прашање: ${x.question}`:null
      ].filter(Boolean).join("\n"),
      status:x.status,
      sources:[sourceRef(x.left.source,sourceById),sourceRef(x.right.source,sourceById)]
    }))
  });

  sections.push({
    id:"evidence-gaps",
    title:"Недостасувачки докази",
    items:matter.objects.evidence_gaps.map(x=>item({
      heading:x.id,
      text:[
        x.issue,
        `Зошто е материјално: ${x.whyMaterial}`,
        x.collectionPlan?`План: ${x.collectionPlan}`:null
      ].filter(Boolean).join("\n"),
      status:x.status,
      sources:[]
    }))
  });

  sections.push({
    id:"procedural-risks",
    title:"Процесни ризици",
    items:matter.objects.procedural_risks.map(x=>item({
      heading:`${x.title} · ${x.severity}`,
      text:[x.description,x.mitigation?`Контрола: ${x.mitigation}`:null].filter(Boolean).join("\n"),
      status:"HUMAN_REVIEW_REQUIRED",
      sources:[x.legalBasis?sourceRef(x.legalBasis,sourceById):null]
    }))
  });

  sections.push({
    id:"hearing-questions",
    title:"Подготовка за рочиште",
    items:matter.objects.hearing_questions.map(x=>item({
      heading:`${x.targetType} · ${x.targetId}`,
      text:[x.question,`Цел: ${x.purpose}`].join("\n"),
      status:x.status,
      sources:[sourceRef(x.source,sourceById)]
    }))
  });

  sections.push({
    id:"ai-findings",
    title:"AI Findings Register",
    items:matter.objects.ai_findings.map(x=>item({
      heading:x.id,
      text:[
        x.text,
        x.lawyerDecision?`Lawyer decision: ${x.lawyerDecision}`:"Lawyer decision: PENDING",
        x.correctedText?`Corrected text: ${x.correctedText}`:null,
        x.lawyer?`Reviewer: ${x.lawyer}`:null
      ].filter(Boolean).join("\n"),
      status:x.lockedForProfessionalUse?"PROFESSIONAL_REVIEW_REQUIRED":"LAWYER_REVIEWED",
      sources:x.sources.map(a=>sourceRef(a,sourceById))
    }))
  });

  const sourceManifest=docs.map(d=>({
    id:d.id,
    title:d.title,
    locator:"",
    version:matter.caseVersion,
    sha256:d.sha256
  }));

  const provenance=[];
  for(const c of matter.objects.claims){
    provenance.push({
      claimId:c.id,
      sourceId:c.source.sourceId,
      locator:locator(c.source),
      note:c.status
    });
  }
  for(const f of matter.objects.ai_findings){
    for(const a of f.sources){
      provenance.push({
        claimId:f.id,
        sourceId:a.sourceId,
        locator:locator(a),
        note:f.lawyerDecision?`lawyer_decision:${f.lawyerDecision}`:f.status
      });
    }
  }

  return Object.freeze({
    adapterVersion:CASEPILOT_EXPORT_ADAPTER_VERSION,
    caseId:matter.matterId,
    title:matter.title,
    caseVersion:matter.caseVersion,
    summary:String(summary||""),
    sections:Object.freeze(sections),
    sourceManifest:Object.freeze(sourceManifest),
    provenance:Object.freeze(provenance),
    readiness,
    humanGate:Object.freeze({
      status:"pending",
      reviewer:"",
      decidedAt:"",
      decisionRef:""
    })
  });
}
