import test from "node:test";
import assert from "node:assert/strict";
import {collectIcsidRecentEvents} from "../scripts/icsid-recent-event-intake.mjs";

test("collector resolves relative case links for all configured source pages", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async url => {
    requested.push(url);
    return {ok: true, text: async () => '<div>October 19, 2026</div><a href="/cases/case-database/case-detail?CaseNo=ARB/22/28">Example case</a>'};
  };
  try {
    const {events, coverage} = await collectIcsidRecentEvents();
    assert.equal(requested.length, 4);
    assert.equal(coverage.length, 4);
    assert.deepEqual(events.map(row => row.event_type), ["registered", "tribunal_constituted", "document_published", "concluded"]);
    for (const row of events) {
      assert.equal(row.source_url, "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/22/28");
      assert.equal(row.production_eligible, false);
      assert.equal(row.human_review_required, true);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
