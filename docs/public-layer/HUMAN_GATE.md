# What “Human Gate” means on the portal

This page explains how the portal *shows* the Human Gate. The rule itself is defined in `ai-use-policy.html` (section 4) and in the corpus-safety rules. This page does not change it.

**On the AI Researcher.**

- Every answer and every refusal carries the reminder that AI output is research assistance and that professional human review is mandatory before reliance.
- The version box shows the Human Gate state of the version used: approved, reviewed, pending review or rejected.
- A version is called **current** only when it is marked current **and** its Human Gate state is *approved*.
- If it is marked current but not approved, the UI says so explicitly: “Marked as current but NOT confirmed through the Human Gate”.

**On article labels.**

- “Current · verified” appears only for `current_consolidated` text with an *approved* review.
- Historical, version-review, source-text and repealed articles are labelled as such and never as current.

**On publications.**

- “ZENODO · PUBLISHED” and a DOI link appear only for records that are formally published.
- Drafts are labelled “Draft · not published” and never show a DOI as published. This includes drafts with a reserved DOI.

**On membership.** Every activation, including a trial, is decided by a human after the request. Nothing is activated or charged automatically.

**What the UI must never do:**

- promote a status;
- hide a refusal;
- present a draft as published;
- present a version-review item as current law.
