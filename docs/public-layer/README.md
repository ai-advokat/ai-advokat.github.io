# AI Advokat: public-layer documentation

These documents describe the **public, non-corpus layer** of AI Advokat: the homepage, the AI Researcher interface, membership, Scholar pages, accessibility and metadata.

They explain existing behaviour; they **do not** change the corpus-safety, security or Human Gate rules. When anything here disagrees with those rules, the following sources win:

- `ai-use-policy.html`
- `legal-notice.html`
- `privacy-policy.html`
- the README section "Corpus safety"
- `src/`

| Document | For |
|---|---|
| [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) | Anyone who needs the big picture |
| [AI_RESEARCHER_HELP.md](AI_RESEARCHER_HELP.md) | Users of the AI Researcher (MK + EN) |
| [LEGAL_BASE.md](LEGAL_BASE.md) | Legal Base section: layers, card states, panels, status vocabulary |
| [ZPP_TIMELINE.md](ZPP_TIMELINE.md) | ZPP version timeline: official metadata, status wording, review date |
| [HUMAN_GATE.md](HUMAN_GATE.md) | Users and reviewers: what “Human Gate” means on the portal |
| [PRIVACY_SAFE_USAGE.md](PRIVACY_SAFE_USAGE.md) | Users: what not to paste into the public research box |
| [MEMBERSHIP_ONBOARDING.md](MEMBERSHIP_ONBOARDING.md) | Users and the operator: how membership is requested and activated |
| [PUBLICATION_GOVERNANCE.md](PUBLICATION_GOVERNANCE.md) | Editors: how publication status is shown and changed |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | Developers and reviewers |
| [UI_NOTES.md](UI_NOTES.md) | Developers: deployment-neutral front-end rules and tests |

`docs/**` is excluded from the deployed static assets (`.assetsignore`). It is repository documentation, not a portal page.
