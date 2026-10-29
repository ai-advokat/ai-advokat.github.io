console.error([
  "BLOCKED: remote staging Cloudflare/D1 access is not available through this npm command before HG2-C Human Gate.",
  "Use only local repository validation until the activation pack is complete and the dedicated staging credential path is approved.",
  "No remote D1 read/write, migration, Worker deploy, binding, route, domain, AI binding, or production action is authorised by this command."
].join("\n"));
process.exit(2);
