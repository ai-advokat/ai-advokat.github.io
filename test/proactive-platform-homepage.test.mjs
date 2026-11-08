import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const index=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const command=fs.readFileSync(new URL("../legal-command-center.html",import.meta.url),"utf8");
const agents=fs.readFileSync(new URL("../proactive-legal-agents.html",import.meta.url),"utf8");

test("homepage exposes proactive legal operations in desktop, mobile and featured module",()=>{
  const commandLinks=(index.match(/href="\/legal-command-center\.html"/g)||[]).length;
  const agentLinks=(index.match(/href="\/proactive-legal-agents\.html"/g)||[]).length;
  assert.ok(commandLinks>=3);
  assert.ok(agentLinks>=3);
  assert.match(index,/PROACTIVE LEGAL OPERATIONS/);
  assert.match(index,/Legal Command Center<\/h3>/);
});

test("command center wires all four governed platform modules",()=>{
  assert.match(command,/\.\/src\/matter-memory\.js/);
  assert.match(command,/\.\/src\/agent-builder\.js/);
  assert.match(command,/\.\/src\/horizon-scanning-engine\.js/);
  assert.match(command,/\.\/src\/legal-command-center\.js/);
  assert.match(command,/Scheduled fetch · LOCKED/);
  assert.match(command,/External actions · LOCKED/);
});

test("proactive agents preserve consequential Human Gate boundary",()=>{
  assert.match(agents,/Human Gate е архитектонска граница/);
  assert.match(agents,/не смее самостојно да создава правна обврска/);
});
