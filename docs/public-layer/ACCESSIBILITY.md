# Accessibility notes

**Implemented.** Target: WCAG 2.2 AA where practical.

*Navigation and structure*
- Skip links on every page. “Прескокни до главната содржина” is preserved on the homepage.
- One `h1` per page and no skipped heading levels. Footer headings are `h2`.
- Real `<button>`s for interactive cards. There are no `role="button"` articles.
- Breadcrumb `<nav>` and language-correct headings (`lang="mk"`) on Scholar pages.

*Forms*
- Visible or screen-reader labels for every control: search, filters, question, law, date and membership key.
- Help text is linked with `aria-describedby`.
- Membership: `fieldset`/`legend`, a required marker with text, `aria-invalid` on e-mail errors, and the result is focused and announced (`role="status"`).

*Focus*
- A visible `:focus-visible` ring on all controls, with ≥ 3:1 contrast in both themes.

*Live regions and dialogs*
- Live regions for search status, AI results, membership key state and copy confirmations.
- Refusals and errors are rendered as text, never only as colour.
- The Zenodo dialog is `hidden` when closed. Focus moves into it, Tab is trapped, and Escape returns focus to the opener.
- The source workspace receives focus when opened and returns focus to the card that opened it.
- The mobile menu closes on link activation or Escape.

*Visual*
- Contrast: `--muted` darkened to `#56667a` (≥ 4.8:1 on every light surface). The dark-theme `.tag` colour was fixed; it was 2.0:1.
- Touch targets of at least 32–44 px for menu, chips and buttons.
- `prefers-reduced-motion` disables smooth scrolling and transitions.
- The theme toggle exposes `aria-pressed`.

**Checked automatically** (`test/public-layer.test.mjs`): labels, a single h1, heading order, image alt text, skip-link targets, `rel` on `target="_blank"`, no positive `tabindex`, and colour-token contrast.

**Manual checks still recommended:**
- screen-reader pass with NVDA or VoiceOver;
- 200% zoom;
- Windows High Contrast.
