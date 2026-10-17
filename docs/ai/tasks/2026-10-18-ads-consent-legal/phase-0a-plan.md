# Plan: Phase 0A — Privacy policy and terms pages

Status: APPROVED
Inputs: triage.md, roadmap.md (Phase 0 scope + Review)

## Goal and acceptance criteria
- [ ] `/privacy` renders a privacy-policy draft covering: operator identity placeholder, data collected (Google sign-in `uid`/`displayName`, game state in Firestore), processors (Firebase/Google), Google ad cookies and consent via Google Funding Choices, minors (players may be under 16; no personalized ads for them), retention, deletion rights, contact placeholder.
- [ ] `/terms` renders a terms-of-service draft covering acceptance of terms, service description, Google sign-in accounts, acceptable use, disclaimer of warranties, limitation of liability, changes to terms, governing law placeholder, minors/parental consent note, contact placeholder.
- [ ] Both pages are visibly marked "DRAFT — pending lawyer review" and "not legal advice", dark-theme, readable on mobile widths.
- [ ] Both routes render without a signed-in player (no `PlayerProvider`/session dependency).
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `RootLayout` | `src/app/layout.tsx:20-37` | Wraps every route (including new ones) in `<html className="dark ...">`, `PlayerProvider`, `TooltipProvider`, `Toaster`. New routes inherit dark theme and the Outfit font automatically; they must not re-wrap `<html>`/`<body>`. No session/provider wiring needed for a static page. |
| `Home` | `src/app/page.tsx:1-36` | Only existing precedent for `src/app/*/page.tsx`: `'use client'`, default export, Tailwind classes inline (no `.styles.ts` split — that convention is `src/modules/**` only, not `src/app` routes). Its `h-screen overflow-hidden` wrapper (line 31) is local to `Home`'s own JSX, not in the layout, so it does not constrain other routes. |
| `TestbedLayout` | `src/app/testbed/layout.tsx:1-13` | Shows a nested `src/app/<route>` page can be a plain server component (no `'use client'`) with a typed `Metadata` export; precedent for giving `/privacy` and `/terms` their own `export const metadata`. |
| dark theme tokens | `src/app/globals.css:47-77` | `.dark` class (set on `<html>` in `RootLayout`) defines `--background`, `--foreground`, `--card`, `--muted-foreground`, `--border` etc. Use `bg-background text-foreground`, `text-muted-foreground`, `border-border` — never raw hex — per CLAUDE.md. |
| `Card`, `CardHeader`, `CardContent` | `src/components/ui/card.tsx:1-30` (and continuing) | Existing shadcn primitive using `bg-card text-card-foreground border` — reuse for each page's content container instead of inventing a new box. |
| jest config | `jest.config.js:18` | `testPathIgnorePatterns` does not exclude `src/app/`; a `.test.tsx` next to a route `page.tsx` is picked up by `npm test` like any other test. No existing `src/app/*.test.tsx` precedent (`find src/app -name "*.test.tsx"` returned none outside `api/`), so this phase sets the pattern for route-page tests. |
| `docs/architecture/structure-and-state.md` §2 | `docs/architecture/structure-and-state.md:5-27` | Line `- \`src/app/\`: Core application, pages, and layout.` (around line 27) is the one line to extend for the new routes. |
| `docs/architecture/systems-and-visuals.md` §6.7 | `docs/architecture/systems-and-visuals.md:5-30` | Existing subsection for UI/UX; add a new subsection here for the legal pages rather than editing an unrelated one. |
| No existing privacy/terms code | `grep -rniE "privacy|terms" src/app` (excluding `node_modules`) returns no route hits | Confirms this is a new, not a migrated, pair of files. |

## Decisions
- Both pages are plain server components (no `'use client'`): they render static text only, no state, no hooks, no browser APIs. Rejected: client components — would add an unneeded directive and bundle cost for content that never changes at runtime.
- No `.styles.ts` / `.map.ts` / `.hook.ts` split: `component-architecture`'s file-per-responsibility convention applies to `src/modules/**` components, not to `src/app` route files, which CLAUDE.md already treats as default-exported, self-contained pages (see `Home` in `src/app/page.tsx`, which inlines its own Tailwind classes). Splitting a static content page into 5 files for one responsibility (render text) would violate KISS for no benefit. Rejected: forcing a `src/modules/legal/` component split — these are not reusable, stateful, or variant-driven UI; they are one-off marketing/legal copy pages.
- Shared content constants (page title, "last updated" placeholder date, contact placeholder) are inlined per page, not extracted into a shared file: each page's copy must be reviewed and edited independently by a lawyer later, and the only "shared" piece is the DRAFT banner JSX, which is 3 lines — extracting it into a third file for both pages to import is a pass-through layer for near-zero duplication. Rejected: a shared `LegalDraftBanner` component (one component, two call sites, under the "extract at the third copy" rule in `kiss-dry-solid`).
- No testbed preview: a testbed preview is for a `src/modules/**` component with interactive states (`.preview.tsx` registered in `src/testbed/registry.ts`). `/privacy` and `/terms` are static `src/app` routes with no props, no variants and no interactivity — there is nothing a preview would show that visiting the route directly does not. Verified with `ui-verify` (browser check) instead, per Definition of Done item 2 ("checked with skill `ui-verify`" applies to "new or changed components"; these are pages, verified directly at their route). Rejected: wrapping the content in a fake `.preview.tsx` just to satisfy a checklist — that is a pass-through layer, no new information.
- Render tests live next to the page as `page.test.tsx` (no existing convention to follow under `src/app`, but this matches `component-architecture`'s "tests ship with the code" and Jest already picks up `*.test.tsx` anywhere under `src/`). Rejected: a separate `src/app/__tests__/` folder — no existing precedent, adds indirection.
- `docs-sync` work (both architecture doc edits) is listed in the File plan for visibility but is explicitly `docs-sync`'s stage, not implementer-b's; no `CLAUDE.md` edit is planned (out of scope — the user approves those separately).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/app/privacy/page.tsx` | new | Privacy-policy draft content, server component, default export | implementer-b |
| `src/app/privacy/page.test.tsx` | new | Render test: page renders without crashing, DRAFT banner and all required sections present | tester-b |
| `src/app/terms/page.tsx` | new | Terms-of-service draft content, server component, default export | implementer-b |
| `src/app/terms/page.test.tsx` | new | Render test: page renders without crashing, DRAFT banner and all required sections present | tester-b |
| `docs/architecture/structure-and-state.md` | edit (§2) | Add `/privacy` and `/terms` to the `src/app/` bullet | docs-sync |
| `docs/architecture/systems-and-visuals.md` | edit (§6.7) | New subsection documenting the legal pages: route list, DRAFT/not-legal-advice status, no session dependency | docs-sync |

6 files total.

## Contracts
```tsx
// src/app/privacy/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy · Corner Conquest',
};

export default function PrivacyPolicyPage(): JSX.Element {
  // Static JSX only. Required content sections, each its own <section> with a
  // heading (h2) so the render test can assert on visible text:
  // 1. DRAFT banner: "DRAFT — pending lawyer review. This is not legal advice."
  // 2. Operator identity: "[Operator legal name and address placeholder]"
  // 3. Data we collect: Google sign-in uid and displayName (via Firebase
  //    Authentication), game state stored in Firestore (player choices, match
  //    history) — no payment or precise-location data collected in this phase.
  // 4. Processors: Google/Firebase (Firebase Authentication, Firestore,
  //    Firebase Hosting or equivalent).
  // 5. Advertising cookies and consent: ads are not yet enabled (feature-flagged,
  //    off by default); when enabled, ad cookies and any personalization choice
  //    are governed by consent collected through Google Funding Choices (a
  //    TCF-certified Consent Management Platform), not a custom banner.
  // 6. Minors: players may be under 16; such players are never served
  //    personalized ads, consistent with child-directed ad settings.
  // 7. Retention: data is kept while the account is active; deletion removes it
  //    (see "Your rights").
  // 8. Your rights / deletion: "[Deletion mechanism placeholder — see
  //    docs/ai/tasks/2026-10-18-ads-consent-legal/roadmap.md Phase 0 for the
  //    planned account-deletion feature]"; until that ships, state that a
  //    deletion request can be made via the contact below.
  // 9. Contact: "[Contact email placeholder]".
  return <></>; // implementer-b fills in; no other exports, no 'use client'.
}
```

```tsx
// src/app/terms/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service · Corner Conquest',
};

export default function TermsOfServicePage(): JSX.Element {
  // Static JSX only. Required sections, each its own <section> with an h2:
  // 1. DRAFT banner: "DRAFT — pending lawyer review. This is not legal advice."
  // 2. Acceptance of terms.
  // 3. The service: free-to-play multiplayer strategy game; features
  //    (including non-personalized ads and an optional ad-free purchase) may
  //    be added later and will be reflected here before launch.
  // 4. Accounts: sign-in via Google (Firebase Authentication); the player is
  //    responsible for activity under their account.
  // 5. Minors: players may be under 16 and should have a parent or guardian's
  //    permission to use the service.
  // 6. Acceptable use: no cheating, abuse, or disrupting other players'
  //    matches.
  // 7. Disclaimer of warranties ("as is", no uptime guarantee).
  // 8. Limitation of liability.
  // 9. Changes to these terms.
  // 10. Governing law: "[Governing law / jurisdiction placeholder]".
  // 11. Contact: "[Contact email placeholder]".
  return <></>; // implementer-b fills in; no other exports, no 'use client'.
}
```

Shared layout guidance for both files (not a separate contract, applies to each independently):
- Root element: `<main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">`.
- Content wrapped in a single `<Card>`/`<CardContent>` (from `@/components/ui/card`), `className="mx-auto max-w-3xl space-y-6"` on the `<Card>` or an inner wrapper — exact Tailwind values are implementer-b's choice as long as they use theme tokens (`bg-card`, `text-card-foreground`, `text-muted-foreground`, `border-border`), not raw hex, and the page does not overflow horizontally at a 360px viewport.
- DRAFT banner: a visually distinct block (e.g. `bg-destructive/10 border border-destructive/40 text-destructive-foreground` or `text-muted-foreground` with an icon — implementer-b's call) containing the literal text "DRAFT" and "not legal advice" so `page.test.tsx` can assert on it with `getByText(/draft/i)` and `getByText(/not legal advice/i)`.
- A "Back to Corner Conquest" link (`next/link`, `href="/"`) above or below the content on both pages.

## Phases
### Phase 1 (only phase in this sub-phase plan): Legal pages
1. implementer-b writes `src/app/privacy/page.tsx` per the contract above. (sonnet recommended: legal copy needs careful wording, not mechanical scaffolding)
2. implementer-b writes `src/app/terms/page.tsx` per the contract above. (sonnet recommended, same reason)
3. tester-b writes `src/app/privacy/page.test.tsx` and `src/app/terms/page.test.tsx` (haiku acceptable: mechanical render + text assertions).
4. docs-sync updates `docs/architecture/structure-and-state.md` §2 and `docs/architecture/systems-and-visuals.md` §6.7.
5. Run `npm run typecheck`, `npm run lint`, `npm test`.
6. `ui-verify`: visit `/privacy` and `/terms` in the browser at desktop and a mobile width (e.g. 375px), confirm dark theme, no horizontal scroll, DRAFT banner visible.

Model escalation: steps 1-2 (implementer-b) need sonnet for the legal-copy wording; steps 3-4 can run on haiku.

## Test plan
- tester-b (view):
  - `src/app/privacy/page.test.tsx`: renders `<PrivacyPolicyPage />` with `@testing-library/react`; asserts the DRAFT banner text, "not legal advice" text, and presence of each required topic as visible text (operator identity placeholder, "uid", "displayName", "Firestore", "Google Funding Choices", minors/under 16, deletion/contact placeholder).
  - `src/app/terms/page.test.tsx`: same pattern — DRAFT banner, "not legal advice", acceptance-of-terms language, Google sign-in mention, minors/parental-permission mention, governing-law and contact placeholders.
  - No `tester-a` cases: no logic, map, hook or service file in this sub-phase.

## Preview states
- None. Justification: see Decisions — these are static `src/app` route pages with no props or variants, not `src/modules/**` components; `ui-verify` on the live route substitutes for a testbed preview.

## Risks
- Placeholder legal text could be mistaken for final copy if the DRAFT banner is missed — mitigated by requiring the banner text in both the contract and the render test, so a future edit that removes it breaks `npm test`.
- This plan does not implement the account-deletion feature referenced in the privacy copy (that is a separate sub-phase per roadmap.md Phase 0); the privacy text must say deletion is planned, not already available, to avoid overstating what exists.

## Review (architect-b)

### Path/symbol verification
All cited paths and symbols verified directly, independent of the roadmap's (already-reviewed) citations:
- `src/app/layout.tsx:20-37` — `RootLayout` confirmed: wraps `{children}` in `<html className="dark ...">` → `<body>` → `PlayerProvider` → `TooltipProvider` → `Toaster`. Matches "New routes inherit dark theme... no session/provider wiring needed."
- `src/app/page.tsx:1-36` — `Home` confirmed: `'use client'`, default export, inline Tailwind, no `.styles.ts`. `overflow-hidden` wrapper is local to `Home`'s own `<div>` (line 31), not in the layout. Matches.
- `src/app/testbed/layout.tsx:1-13` — confirmed: plain server component (no `'use client'`), `export const metadata: Metadata`. Valid precedent for a typed `Metadata` export on a nested route.
- `src/app/globals.css` — `.dark` block is lines 46-79 (plan cites 47-77; off by one at the start, off by two at the end — trivial drift, not a defect). `--background`, `--foreground`, `--card`, `--muted-foreground`, `--border`, `--destructive`/`--destructive-foreground` all confirmed present.
- `src/components/ui/card.tsx` — `Card`/`CardHeader`/`CardContent` etc. confirmed exported (line 79, `export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }`), using `bg-card text-card-foreground border` (line 12). Matches.
- `jest.config.js:18` — confirmed: `testPathIgnorePatterns` lists `node_modules/`, `e2e/*.spec.ts`, `firestore.rules.test.ts`, one `__tests__/test-utils/` folder, `.agents/` — nothing excludes `src/app/`. No `testMatch` override in `customJestConfig`, so Jest's default pattern (`**/?(*.)+(spec|test).[jt]s?(x)`) applies repo-wide via `next/jest`. Existing `src/app/api/*/route.test.ts` files (shown as modified in git status, e.g. `src/app/api/icon-editor/overrides/route.test.ts`) are proof this pattern already runs under `npm test` today. A `page.test.tsx` next to `page.tsx` will be collected the same way. Claim confirmed correct.
- `docs/architecture/structure-and-state.md:16` — `` `src/app/`: Core application, pages, and layout. `` confirmed, exact text.
- `docs/architecture/systems-and-visuals.md:5` — `## 6.7. UI/UX and Other Interactions` confirmed as the right section to extend.
- `grep -rniE "privacy|terms" src/app` (re-run fresh) — zero hits. Greenfield claim confirmed.
- `find src/app -name "*.test.tsx" | grep -v /api/` — zero hits, confirming "no existing `src/app/*.test.tsx` precedent" as stated.

No invented path or symbol found.

### File count
6 files, matches the plan's own count and CLAUDE.md's "about 6 files" phase-sizing guideline: `src/app/privacy/page.tsx`, `src/app/privacy/page.test.tsx`, `src/app/terms/page.tsx`, `src/app/terms/page.test.tsx`, plus two docs-sync edits. Correctly split out of the roadmap's oversized Phase 0 per the roadmap's own review (`roadmap.md` lines 107-122, recommending ~3-4 files for a "legal pages" sub-phase — this plan's 6 includes the tests the roadmap's count excluded, which is the more honest number).

### DRAFT / not-legal-advice marking
Both contracts (page.md lines 58, 92) specify the literal banner text "DRAFT — pending lawyer review. This is not legal advice." as item 1 of each page's required sections, and the Test plan (line 131-132) requires `page.test.tsx` to assert on it with `getByText(/draft/i)` / `getByText(/not legal advice/i)`. The Risks section (line 139) explicitly ties the banner's presence to the render test so a future edit that silently drops it breaks `npm test`. This satisfies the "visibly marked" acceptance criterion with an enforceable regression guard, not just a comment.

### Account-deletion overstatement
Checked against the actual code: `src/modules/session/services/account.service.ts` has no `deleteAccount` export today (confirmed via the roadmap's own verified-context review, independently re-grepped: no match for `deleteAccount` in the file). The privacy contract (lines 73-76) correctly does **not** claim self-service deletion exists — it specifies a placeholder referencing the not-yet-built feature and says "until that ships, state that a deletion request can be made via the contact below." This matches the roadmap's Risk ("the privacy text must say deletion is planned, not already available"). No overstatement found.

### Legal-topic coverage vs. roadmap/triage
Triage's scope for Phase 0 is "legal pages and consent banner"; the roadmap's Phase 0 goal section doesn't give a line-item content checklist beyond: data collected (uid/displayName), processors (Firebase/Google), minors/no personalized ads, CMP-based consent (Google Funding Choices, pending the roadmap's own CMP-ID correction), and account deletion (planned, not yet built). This plan's acceptance criteria (lines 7-8) and contracts cover all of those for privacy, plus the terms topics triage/roadmap imply (Google sign-in accounts, minors) and the standard terms boilerplate (acceptable use, warranty disclaimer, liability, governing law) that no other task-folder document currently specifies but that no reasonable privacy/terms draft could omit. Nothing in roadmap.md or triage.md asks for a legal topic that this plan's contracts are missing.

One cross-check: the CMP-ID correction from `roadmap.md`'s own review (ID 280 → 300, roadmap.md:100-101) is not referenced anywhere in this sub-phase's content — correctly so, since this sub-phase's privacy copy only needs to name "Google Funding Choices" generically (contract line 68: "a TCF-certified Consent Management Platform"), not cite a specific CMP ID. No drift risk here.

### Design
- Decisions section correctly scopes `component-architecture`'s file-per-responsibility split to `src/modules/**`, not `src/app` routes, consistent with `Home`'s own precedent (inline classes, no `.styles.ts`) and with CLAUDE.md's description of `src/app` route files as self-contained.
- No preview justified: these are static, propless, variant-free pages; `ui-verify` on the live route is a reasonable substitute and is scheduled as phase step 6.
- Rejecting a shared `LegalDraftBanner` component for a 3-line JSX block used twice is consistent with `kiss-dry-solid`'s "extract at the third copy" rule.
- Both builders are the same role (implementer-b/tester-b only) with no implementer-a/tester-a split — correct, since there is no logic/map/hook/service file in this sub-phase (Test plan line 133 states this explicitly).

### Verdict
VERDICT: APPROVED
- Non-blocking, fold in: `globals.css` `.dark` block is lines 46-79, not 47-77 as cited in Verified context — immaterial to the plan's correctness, flag for whoever next edits that citation.
