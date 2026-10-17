# Plan: Phase 0B — Consent (Google Funding Choices loader + thin TCF reader)

Status: APPROVED
Inputs: triage.md, roadmap.md (Phase 0 scope + Review), phase-0a-plan.md (conventions), user decision: CMP is Google Funding Choices

## Goal and acceptance criteria
- [ ] Google Funding Choices' own consent script is loaded in `src/app/layout.tsx` through a small module component, gated by an env var holding the Google-generated script URL (see "Open questions — blocking" below: the exact URL could not be verified this session).
- [ ] No custom consent banner is built; Funding Choices renders its own EEA/UK message once its script loads (Decision 1).
- [ ] A thin, read-only consent-signal module exists (`getConsentSignal` / `subscribeToConsentSignal` / `useConsentSignal`) that reads the IAB TCF v2.2 `__tcfapi` signal the CMP itself maintains — it stores nothing of its own beyond an in-memory mirror of the last event, so there is one source of truth (architect-b's requirement, roadmap.md "Review" → Claim 3's related finding).
- [ ] Nothing in this sub-phase gates ads, renders an ad slot, or adds an ad-network script. Phase 1 (ads module) is untouched.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.
- [ ] `docs/architecture/structure-and-state.md` §2 and `docs/architecture/systems-and-visuals.md` §6.7 document the new module and the layout wiring.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `RootLayout` | `src/app/layout.tsx:20-37` | `<html className="dark ...">` → `<body>` → `PlayerProvider` → `TooltipProvider` → `{children}`, then `<Toaster />` as the last child of `<body>`. The loader mounts as a sibling, e.g. right before `<Toaster />`, needing one new import line and one new JSX line. |
| `useBoardBackground` | `src/modules/shared/use-board-background.ts:1-28` | Exact precedent for the store/hook split this plan reuses: `'use client'` at the top of a `.ts` (not `.tsx`) hook file, `React.useState` seeded from the store's current value, `React.useEffect` that subscribes and returns the unsubscribe function. |
| `board-background-store.ts` | `src/modules/shared/board-background-store.ts:1-56` | Precedent for a flat (non-`components/<Name>/`) store file: plain module-level `let` state, a `listeners` array, `subscribeToBoardBackgroundState` returning an unsubscribe closure. This plan's `consent-signal-store.ts` mirrors this shape, substituting the IAB `__tcfapi` event for `localStorage`. |
| `src/modules/shared/index.ts:1-15` | `src/modules/shared/index.ts` | Confirms flat view/logic files (no `components/<Name>/` wrapper) are exported straight from the module's `index.ts` when a component has no styles/map files of its own (e.g. `FightIcon`, `InfoIcon`) — precedent for this plan's flat `funding-choices-loader.tsx`. |
| `Script` (next/script) | `node_modules/next/dist/client/script.js:1`, `node_modules/next/dist/client/script.d.ts:1-20` | The library file itself starts with `'use client'`; `Script(props: ScriptProps): JSX.Element | null`, props include `src`, `strategy: 'afterInteractive' | 'lazyOnload' | 'beforeInteractive' | 'worker'`, `id`. Because the client directive lives inside `next/script` itself, a Server Component (no `'use client'`) can render `<Script>` directly — confirmed by reading the installed package, not assumed. |
| IAB TCF v2.2 `__tcfapi` | verified via WebFetch of the IAB Tech Lab's own CMP API v2 spec (`InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework`, `TCFv2/IAB Tech Lab - CMP API v2.md`) | `__tcfapi(command, version, callback, parameter)` is always present as a window function once a TCF-compliant CMP (Funding Choices included) has initialized. `'addEventListener'` (not the TCF v2.2-deprecated `'getTCData'`) registers `callback(tcData, success)`, firing once immediately and again on every TC-string change. `tcData.tcString`, `tcData.gdprApplies` (`true`/`false`/`undefined`), `tcData.eventStatus` (`'tcloaded'`/`'cmpuishown'`/`'useractioncomplete'`) are the fields this plan's reader uses. This is the IAB's own spec, not a Google-specific invention, so it is stable across any TCF-certified CMP, not just Funding Choices. |
| `docs/architecture/structure-and-state.md:16` | exact line | `` `src/app/`: Core application, pages, and layout. Public legal routes `/privacy` ... `/terms` ... `` — already extended by Phase 0A; this phase adds the `src/modules/consent/` bullet to §2's `src/modules/` paragraph, not this line. |
| `docs/architecture/systems-and-visuals.md:5,30-33` | `## 6.7. UI/UX and Other Interactions`, `#### Legal Pages (...)` | The existing "Legal Pages" subsection (added by Phase 0A) is the last one before `## 6.8`; this phase's docs-sync adds a new `#### Consent (Google Funding Choices)` subsection after it. |
| No existing consent code | `grep -rniE "tcfapi|funding.?choices|consent" src/modules src/app` (excluding this task's own files) returns no hits | Confirms this module is new, not a migration. |
| `LEGACY_PATHS`, `MODULE_FILES`, `RESTRICTED_IMPORTS` | `eslint.config.mjs:12-23,41,43-55` | `src/modules/**/*.{ts,tsx}` is linted under the strict ruleset; `@/lib/firebase` is firestore-only in `*.service.ts` (not used here — this module has no Firestore I/O); `@/modules/*/*` deep imports are banned, so `layout.tsx` must import from `@/modules/consent`, not a deep path. `max-lines` is 150 (blank/comments excluded) — every file below is well under that. |

## Decisions
- **No custom consent banner.** Funding Choices renders its own EEA/UK consent message once its script is present on the page (per Google's documentation on the CMP's purpose). A second, hand-built banner would either duplicate or race the CMP's own UI and become a second source of truth for the same user choice — the exact anti-pattern architect-b flagged in roadmap.md's review. Rejected: a custom `ConsentBanner` component (roadmap.md's original sketch) — superseded by the user's CMP choice; KISS says don't build UI a certified vendor already renders for free.
- **No "privacy choices" revisit-consent link in 0B.** Reopening Funding Choices' own consent UI from a custom link requires calling a specific Google JS API (commonly `googlefc`-namespaced in other CMP integrations), and no fetchable Google documentation page in this session gave a verified function name or signature for it (see "Open questions" below). Shipping an invented API call would silently no-op or throw. The existing `/privacy` page (Phase 0A, `src/app/privacy/page.tsx`) is left as the place such a link will go once the exact API is confirmed from the user's own Ad Manager/AdSense "Privacy & messaging" setup — out of scope for this sub-phase. Rejected: guessing a `googlefc.*` method name — violates "don't invent an API."
- **The script URL is not hardcoded.** No Google documentation page reachable by WebFetch in this session gave a concrete `<script src="...">` snippet or hostname for a standalone Funding Choices embed (see "Open questions — blocking"). One verified Google developer page (`developers.google.com/funding-choices/fc-api-docs`) states that "for most cases you don't need to re-tag at all" because an existing AdSense or Google Publisher Tag already deploys the consent message — meaning the publisher-specific URL, if one exists for a site with no ad tag yet, is generated inside the user's own Ad Manager/AdSense "Privacy & messaging" setup flow, not a fixed public constant. The loader therefore reads its `src` from `NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC` and renders nothing when that env var is unset, so merging this phase cannot ship a wrong or invented URL, and the feature stays inert (satisfies "gate nothing else in 0B; no ads load here") until the user pastes in their real snippet's URL. Rejected: hardcoding a remembered-but-unverified domain (e.g. a `fundingchoicesmessages.google.com` path) — the anti-hallucination rule bars shipping an unverified URL; rejected: blocking this plan entirely on getting that URL — the reader/store half of this phase (which Phase 1's `AdSlot` needs) does not depend on it and can proceed now.
- **Consent-signal module is a thin reader, not a store of app-made decisions.** `consent-signal-store.ts` holds only an in-memory mirror of the last `__tcfapi` `addEventListener` callback payload (`tcString`, `gdprApplies`, `status`) and never writes anything back to `localStorage` or Firestore — the CMP's own TCF implementation is the only place consent is persisted. This directly satisfies architect-b's roadmap.md finding ("a second, independently-written app store risks becoming a stale or conflicting second source of truth"). Rejected: the roadmap's original `consent-choice-store.ts` sketch (granted/denied + timestamp persisted by the app) — superseded by reading the CMP's own signal instead of re-deriving it.
- **Flat files, no `components/<Name>/` folder.** `funding-choices-loader.tsx` has no styles, map or hook of its own (it is one conditional `<Script>` render), and `consent-signal-store.ts` / `use-consent-signal.ts` are logic-only, mirroring `src/modules/shared`'s flat layout for single-purpose files (`fight-icon.tsx`, `board-background-store.ts` + `use-board-background.ts`) rather than nesting each in its own `components/<Name>/index.ts` folder, which would add a pass-through `index.ts` per file for no benefit. Rejected: the `components/FundingChoicesLoader/` folder shape from `component-architecture`'s general example — that layout is for domains with multiple, prop-driven components; this is `src/modules/consent`'s first and, for now, only piece per side (loader vs. reader).
- **Two phases in this one plan**, because the full scope (loader + reader) is 10 files across production code, tests and docs-sync, over the "about 6 files" phase-sizing guideline this task was asked to respect. The loader (what actually turns Funding Choices on) and the reader (infrastructure Phase 1's `AdSlot` will consume, per roadmap.md Phase 1 scope — "AdSlot.hook.ts reads the consent store from `src/modules/consent`") are independently shippable and testable, so they split cleanly along the only real join (the shared `index.ts`), unlike Phase 0A/0C's split by feature. Rejected: one six-file phase that drops the reader (defers a roadmap.md requirement) or drops the loader (ships nothing a user can see) — both fail this sub-phase's own acceptance criteria.

## Open questions
- **Blocking for production use (not for merging this plan or starting Phase 1 ads)**: the exact Google Funding Choices script URL/snippet. WebFetch in this session could not confirm it — `developers.google.com/funding-choices/fc-api-docs` and `/funding-choices` describe the JS API and SDKs but give no installation snippet or hostname; `support.google.com/adsense/answer/9713475`, `/13554116`, `/9994701`, `/9942154` all returned HTTP 404; `support.google.com/admanager/answer/9681920` (Additional Consent spec page) only links onward to the real "Privacy & messaging" setup topic without fetching it. The one concrete fact obtained: per `fc-api-docs`, most publishers need no separate tag at all because their existing AdSense/GPT tag already delivers the message — which may mean there is no generic standalone Funding Choices `<script>` src independent of an ad tag, in which case this loader stays a documented no-op until Phase 1 adds the AdSense/GPT tag, and Phase 1's own plan must re-examine whether `FundingChoicesLoader` is still needed separately or should be folded into Phase 1's ad-tag loader. The user must get the actual generated snippet from their own Ad Manager/AdSense "Privacy & messaging" tab (it is account/publisher-specific) before Phase 1 writes the CSP domain list — **this also means roadmap.md's instruction to "list the exact external script domains... Phase 1B's CSP needs them" cannot be completed by this plan; it is deferred to whoever has access to that account.**
- Whether Funding Choices needs `tagForChildDirectedTreatment`-equivalent signaling, per roadmap.md's Risks section — still unresolved, still the user's call, not touched by this sub-phase (no ad request is made here).
- The exact API to reprogrammatically reopen the CMP's consent UI (for a future "privacy choices" link) — not resolved this session (see Decisions above); revisit once the user has their real Ad Manager/AdSense snippet, which usually documents this alongside the embed snippet itself.

## File plan
### Phase 1: Funding Choices loader
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/consent/funding-choices-loader.tsx` | new | Reads `NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC`; renders `<Script src={...} strategy="afterInteractive" id="funding-choices">` when set, otherwise renders nothing | implementer-b |
| `src/modules/consent/index.ts` | new | Public API: exports `FundingChoicesLoader` | implementer-a |
| `src/app/layout.tsx` | edit | Import `FundingChoicesLoader` from `@/modules/consent`; render `<FundingChoicesLoader />` as a sibling inside `<body>`, before `<Toaster />` | implementer-b |
| `src/modules/consent/funding-choices-loader.test.tsx` | new | Render test: env var set → `<script>` tag with that `src` is in the document; env var unset → no such tag | tester-b |
| `docs/architecture/structure-and-state.md` | edit (§2) | Add a `src/modules/consent/` bullet describing `FundingChoicesLoader` and the env-var gate | docs-sync |
| `docs/architecture/systems-and-visuals.md` | edit (§6.7) | New `#### Consent (Google Funding Choices)` subsection: no custom banner, loader-only, env-var-gated, no ads load yet | docs-sync |

6 files.

### Phase 2: Consent-signal reader (thin TCF mirror, for Phase 1's `AdSlot` to consume later)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/consent/consent-signal-store.ts` | new | Registers one `__tcfapi('addEventListener', 2, ...)` listener (guarded for SSR/no-CMP); holds the last `ConsentSignal` in memory; `getConsentSignal`, `subscribeToConsentSignal` | implementer-a |
| `src/modules/consent/use-consent-signal.ts` | new | `useConsentSignal()` hook: `useState` seeded from `getConsentSignal()`, `useEffect` subscribing via `subscribeToConsentSignal` | implementer-a |
| `src/modules/consent/index.ts` | edit | Add exports: `useConsentSignal`, `getConsentSignal`, type `ConsentSignal` | implementer-a |
| `src/modules/consent/consent-signal-store.test.ts` | new | Logic test: no `__tcfapi` → `status: 'unknown'`; a fake `__tcfapi` invoking its callback with a sample `tcData` → store updates and notifies subscribers | tester-a |
| `src/modules/consent/use-consent-signal.test.ts` | new | Hook test (`@testing-library/react-hooks`-equivalent, i.e. `renderHook` from `@testing-library/react`): returns the store's current value; updates when the store notifies | tester-a |
| `docs/architecture/structure-and-state.md` | edit (§2) | Extend the `src/modules/consent/` bullet (added in Phase 1) with `consent-signal-store.ts` / `useConsentSignal` | docs-sync |

6 files.

12 files total across both phases (production + tests + docs-sync), matching the "about 6 files per phase" guideline per phase, not per sub-task.

## Contracts
```ts
// src/modules/consent/consent-signal-store.ts

/** Mirrors the IAB TCF v2.2 __tcfapi signal; never independently persisted. */
export interface ConsentSignal {
  /** 'unknown' until the first __tcfapi callback fires (no CMP present, or not yet initialized). */
  status: 'unknown' | 'ready';
  /** TCData.gdprApplies: true, false, or undefined (unknown) — passed through verbatim. */
  gdprApplies: boolean | undefined;
  /** TCData.tcString, or null before one exists. */
  tcString: string | null;
}

/** Current in-memory mirror; does not itself register the __tcfapi listener (call ensureSubscribed first, as subscribeToConsentSignal does). */
export function getConsentSignal(): ConsentSignal;

/**
 * Registers the window.__tcfapi('addEventListener', 2, ...) listener on first call (idempotent),
 * subscribes `listener` to every update, and returns an unsubscribe function. No-op signal
 * (`status: 'unknown'`) when window.__tcfapi is not a function (SSR, or CMP script not loaded).
 */
export function subscribeToConsentSignal(listener: (signal: ConsentSignal) => void): () => void;
```

```ts
// src/modules/consent/use-consent-signal.ts
'use client';

export function useConsentSignal(): ConsentSignal;
// Same subscribe/useEffect shape as useBoardBackground (src/modules/shared/use-board-background.ts):
// useState(getConsentSignal()) seed, useEffect(() => subscribeToConsentSignal(setSignal), []).
```

```tsx
// src/modules/consent/funding-choices-loader.tsx
import Script from 'next/script';

/**
 * Renders Google Funding Choices' consent script when NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC is
 * set; renders nothing otherwise (no ads, no CMP, in local/dev/test unless the env var is set).
 * The exact URL is not hardcoded here — see phase-0b-plan.md "Open questions — blocking".
 */
export function FundingChoicesLoader(): JSX.Element | null;
```

```ts
// src/modules/consent/index.ts (final shape, after both phases)
export { FundingChoicesLoader } from './funding-choices-loader';
export { useConsentSignal } from './use-consent-signal';
export { getConsentSignal } from './consent-signal-store';
export type { ConsentSignal } from './consent-signal-store';
```

## Phases
### Phase 1: Funding Choices loader
1. implementer-a writes `src/modules/consent/index.ts` exporting `FundingChoicesLoader` (haiku acceptable — one export line).
2. implementer-b writes `src/modules/consent/funding-choices-loader.tsx` per the contract (haiku acceptable — one conditional render, no business logic).
3. implementer-b edits `src/app/layout.tsx`: add the import and one `<FundingChoicesLoader />` line before `<Toaster />`.
4. tester-b writes `src/modules/consent/funding-choices-loader.test.tsx` (haiku acceptable): set/unset the env var with `process.env.NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC` around each test, assert on `document.querySelector('script[src="..."]')` or on `next/script`'s rendered output via RTL's `container`.
5. docs-sync updates both architecture docs.
6. Run `npm run typecheck`, `npm run lint`, `npm test`.
7. `ui-verify`: load the app locally with the env var unset (default) — confirm no console error, no new network request, no visual change. (A real script load cannot be verified in `ui-verify` until the user supplies a real URL — note that limit in the phase's progress log instead of skipping the check silently.)

### Phase 2: Consent-signal reader
1. implementer-a writes `src/modules/consent/consent-signal-store.ts` per the contract (sonnet recommended: the SSR/no-CMP guard and the idempotent-listener-registration logic are easy to get subtly wrong, e.g. double-registering on every `subscribeToConsentSignal` call).
2. implementer-a writes `src/modules/consent/use-consent-signal.ts`, mirroring `use-board-background.ts`'s shape exactly (haiku acceptable once step 1 exists).
3. implementer-a edits `src/modules/consent/index.ts` to add the three new exports.
4. tester-a writes `src/modules/consent/consent-signal-store.test.ts`: mock `window.__tcfapi` as a jest function that synchronously invokes its callback with a fixture `tcData`; assert `getConsentSignal()` updates and subscribers are notified; assert the no-`__tcfapi` case returns `status: 'unknown'` and never throws.
5. tester-a writes `src/modules/consent/use-consent-signal.test.ts` using `renderHook` from `@testing-library/react`, reusing the same `__tcfapi` mock pattern.
6. docs-sync extends the `src/modules/consent/` bullet in `structure-and-state.md`.
7. Run `npm run typecheck`, `npm run lint`, `npm test`.
8. No `ui-verify` needed — nothing visual changes in this phase; no UI consumes the hook yet.

Model escalation: Phase 2 step 1 (`consent-signal-store.ts`) needs sonnet; every other step is mechanical enough for haiku.

## Test plan
- tester-a (logic, first):
  - `consent-signal-store.test.ts`: no `window.__tcfapi` → `getConsentSignal()` returns `{ status: 'unknown', gdprApplies: undefined, tcString: null }`, no throw. A fake `__tcfapi` that calls back synchronously with `{ tcString: 'ABC', gdprApplies: true, eventStatus: 'tcloaded' }` → `getConsentSignal()` reflects it and every subscriber registered via `subscribeToConsentSignal` is called with the new value. Two independent `subscribeToConsentSignal` calls each get their own working unsubscribe (unsubscribing one does not affect the other). Calling `subscribeToConsentSignal` twice does not register a second `__tcfapi` listener (assert the fake `__tcfapi` mock was called exactly once).
  - `use-consent-signal.test.ts`: `renderHook(() => useConsentSignal())` returns the store's seeded value; triggering the mocked `__tcfapi` callback after render updates the hook's return value; unmounting calls the store's returned unsubscribe (spy on it).
- tester-b (view):
  - `funding-choices-loader.test.tsx`: with `NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC` set to a fixture URL before import, rendering `<FundingChoicesLoader />` results in a `<script>` tag (via `next/script`'s test-visible output) with that `src`. With the env var unset, rendering produces no such tag and no console error.

## Preview states
- None. Neither `FundingChoicesLoader` (no visible UI, renders a `<script>` tag or nothing) nor the consent-signal reader (no UI at all, consumed by `AdSlot` in a later phase) has a state a testbed preview would usefully show. Consistent with Phase 0A's precedent of skipping a preview for a component with no visual states.

## Risks
- The blocking open question (exact script URL/domain) means this phase, once merged, does nothing visible in production until the user supplies `NEXT_PUBLIC_FUNDING_CHOICES_SCRIPT_SRC` — by design, so the plan can proceed without inventing a URL, but flag this clearly in the commit message and `progress.md` so it is not mistaken for "ads consent now live."
- If the "no standalone script, only via the ad tag" reading of `fc-api-docs` turns out to be correct, `FundingChoicesLoader` as designed here may be unnecessary and get superseded by Phase 1's ad-tag loader — re-confirm before Phase 1 writes its own plan, don't assume this file is final.
- `window.__tcfapi` typing: this plan augments the global `Window` interface inside `consent-signal-store.ts`. If any other file in the repo later declares `__tcfapi` differently, TypeScript will error on the conflicting declaration — implementer-a should grep for `__tcfapi` before adding the augmentation (expected: no hits, per "No existing consent code" in Verified context).

## Review (architect-b)

### Path/symbol verification
All cited paths and symbols confirmed by direct read, not trusted from the plan:
- `src/app/layout.tsx:20-37` — `RootLayout`, `<body>` → `PlayerProvider` → `TooltipProvider` → `{children}`, `<Toaster />` as last child of `<body>` at line 33. Matches exactly; "mount as a sibling right before `<Toaster />`" is accurate.
- `src/modules/shared/use-board-background.ts:1-28` and `board-background-store.ts:1-59` — both read in full. `'use client'` at the top of a `.ts` hook file, `React.useState` seeded from the store, `React.useEffect` subscribing and returning the unsubscribe closure; store is a flat module with `listeners: BoardBackgroundListener[]`, `subscribeToBoardBackgroundState` returning an unsubscribe closure. Precedent claim is accurate (the consent store is simpler — no hydration-from-storage step — correctly not copied, since there is nothing to hydrate from `localStorage`).
- `src/modules/shared/index.ts:1-15` — 15 lines, flat exports (`FightIcon`, `InfoIcon`, etc.) with no `components/<Name>/` wrapper. Confirms the precedent for a flat `funding-choices-loader.tsx`, though note it's being transplanted from `shared` (cross-module code) to `consent`'s own first file — a reasonable, explicitly-justified extension of the same convention, not a literal copy.
- `next/script` — `node_modules/next/dist/client/script.d.ts`: `ScriptProps` includes `strategy?: 'afterInteractive' | 'lazyOnload' | 'beforeInteractive' | 'worker'`, `id?: string`; `declare function Script(props: ScriptProps): JSX.Element | null`. Exact match to the plan's cited signature.
- `eslint.config.mjs:39-55` — `MODULE_FILES = 'src/modules/**/*.{ts,tsx}'`, `deepModuleImport` bans `@/modules/*/*`, `firestore` restriction on `@/lib/firebase`/`firebase/*`, `max-lines: 150` with `skipBlankLines`/`skipComments`. All as cited; none of this plan's files approach 150 lines by design (all are single-purpose).
- `grep -rniE "tcfapi|funding.?choices|consent" src/modules src/app` (excluding this task's own test/content files) — only hits are Phase 0A's `src/app/privacy/page.tsx` content and its test, which *mention* Funding Choices as prose, not code. No existing `__tcfapi` type declaration anywhere in the repo (`grep -rn "__tcfapi"` outside `node_modules` returns nothing) — the planned `Window` augmentation in `consent-signal-store.ts` has no conflict to collide with today. "Greenfield" claim holds.
- Roadmap's `CMP ID 280 → 300` fix: not restated anywhere in phase-0b-plan.md (confirmed via grep for "280"/"300"/"CMP ID" — no hits), so there's nothing here to propagate the wrong number. Not applicable to this sub-phase's scope.

No invented path or symbol found.

### Decision 1: env var unset as a no-op, blocking production use but not merging
**Acceptable.** The alternative — hardcoding a remembered-but-unverified Funding Choices URL — would violate anti-hallucination directly (no fetchable Google page in this session gave a concrete snippet; `support.google.com` answer pages returned 404). An env-var gate that renders nothing by default is the same pattern already in the repo (`isTestbedEnabled`, `src/testbed/testbed.config.ts:6-8`, cited correctly in roadmap.md), and the plan is explicit in three places (Decisions, Open questions, Risks) that this means no CMP is live until the user supplies the real URL — so no one merging or reading `progress.md` can mistake inert code for a shipped consent flow. The reader half (Phase 2) does not depend on the loader being live (a thin `__tcfapi` reader is correct, and harmless, whether or not Funding Choices has actually loaded — it correctly degrades to `status: 'unknown'`). Shipping the inert loader now and wiring the real URL later is lower-risk than blocking the whole sub-phase on the user visiting their Ad Manager account.

### Decision 2: two-phase split
**Right call, correctly justified.** 6 files each (counted directly from both File plan tables), split at the only real internal seam (loader vs. reader, joined only by `index.ts`), matching CLAUDE.md's "about 6 files" per-phase guideline that the roadmap's own review already flagged this epic must respect. The reader phase doesn't block on the loader phase's open question, so the split doesn't trade correctness for size — it's a genuine decoupling, not an arbitrary cut.

### Decision 3: TCF `__tcfapi` usage, thin reader, test double
**Appropriate design, directly answers the roadmap's own finding.** roadmap.md's Review, Claim 3 ("a second, independently-written app store risks becoming a stale or conflicting second source of truth") is the finding this plan exists to resolve, and it does: `consent-signal-store.ts` only mirrors the CMP's own `addEventListener` callback in memory, writes nothing to `localStorage`/Firestore, and `getConsentSignal`/`subscribeToConsentSignal` are a pure read path. This is the correct shape — no reducer-like duplication, no race with the CMP's own persisted TC string. The `'addEventListener'` command choice (over the TCF-v2.2-deprecated `'getTCData'`) is sourced from the IAB's own spec (WebFetch citation in Verified context), not Google-specific, so it's portable if the CMP vendor changes later — good DRY/decoupling instinct, consistent with roadmap.md's framing of the CMP choice as a recommendation, not a lock-in.
A test double is needed and the plan has one: `consent-signal-store.test.ts` mocks `window.__tcfapi` as a jest function invoking its callback synchronously (Test plan, tester-a section) — this is the right boundary (mock the one global the CMP injects, not Firestore or a service), and the test list is concrete enough to catch the real risk flagged in Risks (double-registration): "assert the fake `__tcfapi` mock was called exactly once" after two `subscribeToConsentSignal` calls. No gap found.
One real, non-blocking risk correctly self-flagged by the plan (Risks, third bullet): the `Window.__tcfapi` global augmentation lives in a single file; implementer-a must grep before adding it (already in the plan as an instruction, verified above there's nothing to conflict with today).

### Other findings
- Module boundaries respected: no `@/lib/firebase` import anywhere in this plan's files, no `@/features/*` import, no deep `@/modules/*/*` import — `layout.tsx` imports `FundingChoicesLoader` from `@/modules/consent` (the public index), matching `eslint.config.mjs`'s `deepModuleImport` rule.
- KISS: no npm package added (Funding Choices is a hosted script via `next/script`, already installed); no custom consent UI duplicating what Funding Choices renders itself. Matches roadmap.md's own "no CMP npm SDK" decision.
- Test plan asserts exact outcomes (store shape, call counts, unsubscribe independence), not ranges — consistent with the testing skill.
- Preview states: correctly skipped — neither component has a visible state a testbed preview would add value to (same precedent Phase 0A set).

VERDICT: APPROVED
