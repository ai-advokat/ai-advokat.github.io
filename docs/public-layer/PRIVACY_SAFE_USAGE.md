# Privacy-safe use of the public research box

The AI Researcher field is **public legal research**, not a confidential client channel.

**Do not paste:**

- names of parties or clients;
- national ID numbers (ЕМБГ), addresses, phone numbers;
- health data;
- details of active matters, especially criminal ones;
- privileged or confidential information.

**Ask in general terms.** For example: “Which ZRO articles regulate the notice period for termination?” rather than a description of a specific person's case.

**What the portal does:**

- The question is sent to the AI Advokat API to search the corpus.
- The membership key, if used, stays only in the current browser session (`sessionStorage`) and is sent only to the AI Advokat API.
- Rate limiting and quotas use a hashed identifier. The IP address is not stored.
- Analytics run only after consent.

See `privacy-policy.html` for the full policy.
