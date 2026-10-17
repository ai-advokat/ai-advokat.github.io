# Privacy-safe use of the public research box

The AI Researcher field is **public legal research**, not a confidential client channel.

**Do not paste or upload in the public chat:**

- names of parties or clients;
- national ID numbers (ЕМБГ), addresses, phone numbers;
- health data;
- details of active matters, especially criminal ones;
- privileged or confidential information;
- passports, identity cards, criminal-record certificates, contracts or case documents.

The public chat is text-only for general legal research. Concrete case documents belong in Secure Case Workspace.

**Ask in general terms.** For example: “Which ZRO articles regulate the notice period for termination?” rather than a description of a specific person's case.

**What the portal does:**

- FREE public chat is routed to Workers AI and does not automatically spill into paid OpenAI.
- General public-chat attachments are rejected in the browser and again on the server before provider execution.
- The question is sent to the AI Advokat API to search the corpus and, where allowed, to the configured provider.
- The membership key, if used, stays only in the current browser session (`sessionStorage`) and is sent only to the AI Advokat API.
- Deprecated `AIADV-OWNER-` keys are rejected server-side and cannot authenticate a membership.
- Rate limiting and quotas use a hashed identifier. The IP address is not stored.
- Analytics run only after consent.

See `privacy-policy.html` for the full policy.


## Secure Case Workspace retention

A case may carry an explicit `retentionUntil` date. New workspaces reject a retention date that is already expired. A deletion request moves the case to `delete_pending`; destructive cleanup remains a separately governed operation. The portal does not promise automatic deletion until an audited cleanup workflow is activated.
