import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const C=require("../assets/legal-formatter-v10.4/lfcore.js");

test("Legal Formatter v10.4 exact engine exposes governed Consolidator API",()=>{
  assert.equal(C.version,"10.4.0");
  for(const fn of [
    "parseBaseLaw","parseAmendments","consolidate","validate",
    "verifyConsolidationFidelity","resolveDuplicates","resolveReferences",
    "buildEditorialFootnotes","buildRenumberPlan","buildResolutionWorkflow",
    "applyResolutionsToLaw","buildPublicationPackage",
    "buildFullAmendmentRegister","buildChangeMap"
  ]) assert.equal(typeof C[fn],"function",fn);
});

test("editorial resolution preserves original number and records no silent change",()=>{
  const law=C.parseBaseLaw(
    "КРИВИЧЕН ЗАКОНИК\n"+
    "Член 96-к\nСе применуваат одредбите од членот 101-а од овој законик.\n"+
    "Член 165-в\nПрв.\n"+
    "Член 165-в\nВтор. казна сторител кривично дело "+Array(50).join("Член X ")
  );
  const meta={
    duplicateResolutions:{
      "165-в":{
        choice:"mark_second_as_probable_165-г",
        resolutionBy:"Адвокат Зоран Стојанкиќ",
        resolutionDate:"2026-06-06",
        resolutionReason:"Очигледна грешка во нумерацијата",
        sourceReference:"Сл.в. XX/YY"
      }
    },
    referenceResolutions:{
      "96-к->101-а":{
        classification:"editorial_footnote",
        editorialTarget:"100-а",
        resolutionBy:"Адвокат Зоран Стојанкиќ",
        resolutionDate:"2026-06-06",
        resolutionReason:"101-а не постои како активен член",
        sourceReference:"Сл.в. XX/YY"
      }
    }
  };

  const pending=C.buildResolutionWorkflow(law,{},{});
  assert.equal(pending.allResolved,false);
  assert.ok(pending.pendingDuplicates.includes("165-в"));
  assert.ok(pending.pendingReferences.includes("96-к->101-а"));

  const workflow=C.buildResolutionWorkflow(law,{},meta);
  assert.equal(workflow.allResolved,true);
  assert.equal(workflow.renumberPlan[0].editorialNumber,"165-г");
  assert.ok(workflow.audit.every(row=>row.silentChange===false));

  const annotated=C.applyResolutionsToLaw(law,workflow);
  const edited=annotated.articles.find(a=>a.editorialNumber==="165-г");
  assert.ok(edited);
  assert.equal(edited.number,"165-в");
  assert.equal(edited.originalNumber,"165-в");
  assert.ok(Array.isArray(edited.editorialFootnotes));
  assert.ok(edited.editorialFootnotes.length>0);
});

test("AI Advokat vNext routes Consolidator to deterministic v10.4 workspace",()=>{
  const page=fs.readFileSync("consolidator/index.html","utf8");
  const vnext=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");

  assert.match(page,/assets\/legal-formatter-v10\.4\/lfcore\.js/);
  assert.match(page,/buildResolutionWorkflow/);
  assert.match(page,/applyResolutionsToLaw/);
  assert.match(page,/silentChange:false/);
  assert.match(vnext,/window\.open\('\/consolidator\/'/);
  assert.doesNotMatch(vnext,/CONSOLIDATOR MODE/);
});
