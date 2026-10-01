// Loads the Worker (src/*.js, authored as ES modules for Wrangler) under Node's test
// runner without adding dependencies: the sources are copied into a temp directory
// marked "type":"module" and imported from there.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function loadWorker() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-advokat-worker-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }));
  for (const file of fs.readdirSync("src").filter((f) => f.endsWith(".js"))) {
    fs.copyFileSync(path.join("src", file), path.join(dir, file));
  }
  const worker = await import(pathToFileURL(path.join(dir, "index.js")).href);
  const security = await import(pathToFileURL(path.join(dir, "security.js")).href);
  return { worker: worker.default, workerModule: worker, security };
}
