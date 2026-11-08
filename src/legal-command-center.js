// AI Advokat Command Center v1.
// Aggregates real run/memory/horizon states into a non-inflated operational snapshot.

import { horizonSummary } from "./horizon-scanning-engine.js";
import { matterMemoryAudit } from "./matter-memory.js";
import { verifyRunForReview } from "./proactive-legal-agents.js";

export const COMMAND_CENTER_VERSION="1.0.0";

export function commandCenterSnapshot({runs=[],horizonEvents=[],memories=[],verificationByRun={}}={}){
  if(!Array.isArray(runs)||!Array.isArray(horizonEvents)||!Array.isArray(memories)) throw new TypeError("command_center_arrays_required");
  const runStates=runs.map(run=>{
    const v=verificationByRun[run.runId]||{};
    const review=verifyRunForReview(run,v);
    return Object.freeze({runId:run.runId,templateId:run.templateId,state:run.state,readyForHumanReview:review.readyForHumanReview,blockers:review.blockers});
  });
  const unsafeMemories=memories.filter(m=>!matterMemoryAudit(m).safe).length;
  const horizon=horizonSummary(horizonEvents);
  return Object.freeze({
    version:COMMAND_CENTER_VERSION,
    generatedFromProvidedState:true,
    runs:Object.freeze(runStates),
    metrics:Object.freeze({
      totalRuns:runs.length,
      readyForHumanReview:runStates.filter(x=>x.readyForHumanReview).length,
      blockedRuns:runStates.filter(x=>x.blockers.length).length,
      horizonCandidateChanges:horizon.candidateChanges,
      horizonSourceErrors:horizon.sourceErrors,
      unsafeMemoryRecords:unsafeMemories
    }),
    humanGate:Object.freeze({
      pending:runStates.some(x=>x.readyForHumanReview)||horizon.humanReviewRequired,
      consequentialActionsLocked:true
    }),
    runtime:Object.freeze({
      scheduledFetch:"not_activated",
      externalTransmission:"forbidden",
      canonicalPromotion:"forbidden"
    })
  });
}
