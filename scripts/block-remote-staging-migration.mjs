console.error([
  "BLOCKED: remote staging D1 migration is not available through this npm command.",
  "Use db:migrate:staging:local for local-only validation.",
  "Any remote D1 migration requires a separately recorded Human Gate and evidence pack."
].join("\n"));
process.exit(2);
