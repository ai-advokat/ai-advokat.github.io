import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {caseExportBlocks} from "../src/case-export.js";

const renderer = fileURLToPath(new URL("./render-synthetic-case-export-pdf.py", import.meta.url));

export function renderSyntheticCaseResponsePdf(model) {
  return execFileSync(process.env.CASE_RESPONSE_PDF_PYTHON || "python3", [renderer], {
    input:JSON.stringify(caseExportBlocks(model)), timeout:15000, maxBuffer:4*1024*1024
  });
}
