# Plan: Phase 1A — AdSlot component and flag (no ad network, no CSP, no lobby placement)

Status: APPROVED
Inputs: triage.md, roadmap.md (Phase 1 scope + Review), phase-0b-plan.md (consent reader this
plan consumes), progress.md

## Goal and acceptance criteria
- [ ] `src/modules/ads/` exists with an `AdSlot` component that renders nothing unless
      `NEXT_PUBLIC_ADS_ENABLED === 'true'` AND the consent signal from `src/modules/consent`
      allows a non-personalized ad request.
- [ ] No ad network script, no CSP change, no edit to `src/app/page.tsx` or `next.config.ts`
      — all deferred to Phase 1B (roadmap.md Phase 1 scope; task instructions for this plan).
- [ ] `ads.config.ts` follows the exact pattern of `isTestbedEnabled`
      (`src/testbed/testbed.config.ts:6-8`): a small flag helper, default off, read once.
- [ ] The hook's decision is driven only by the flag and `useConsentSignal()`
      (`src/modules/consent/index.ts`); it does not call any ad network.
- [ ] `AdSlot.preview.tsx` shows the 4 states requested: flag off; flag on + consent unknown;
      flag on + consent denied; flag on + consent granted.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.
- [ ] `docs/architecture/structure-and-state.md` §2 documents the new module (docs-sync).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `isTestbedEnabled` | `src/testbed/testbed.config.ts:6-8` | `export function isTestbedEnabled(): boolean { return process.env.NODE_ENV !== 'production'; }` — the exact shape `ads.config.ts`'s flag helper follows, per this task's instructions. |
| `testbed.config.test.ts` | `src/testbed/testbed.config.test.ts:1-40` | Precedent for testing a `process.env`-driven helper: `Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true })`, restored in `afterEach`. `ads.config.test.ts` reuses this shape for `NODE_ENV` and plain `process.env.NEXT_PUBLIC_ADS_ENABLED = '...'` / `delete` for the public var (see next row). |
| `funding-choices-loader.test.tsx` | `src/modules/consent/funding-choices-loader.test.tsx:1-32` | Precedent for testing a `NEXT_PUBLIC_*` var directly via `process.env[NAME] = value` / `delete process.env[NAME]` in `afterEach`, with no module-reset needed — confirms the same pattern works for `NEXT_PUBLIC_ADS_ENABLED` in this plan's tests (no Next.js build-time inlining happens under Jest). |
| `useConsentSignal`, `getConsentSignal`, `ConsentSignal` | `src/modules/consent/index.ts:1-4` | Public API this plan's hook imports. `ConsentSignal` (`src/modules/consent/consent-signal-store.ts:1-8`): `{ status: 'unknown' \| 'ready'; gdprApplies: boolean \| undefined; tcString: string \| null }`. `status` is `'ready'` once any successful `__tcfapi` callback has fired — the store does not expose the TCF `eventStatus` field (`consent-signal-store.ts:11-14`'s `TcData` interface has only `tcString`/`gdprApplies`), so `'ready'` cannot distinguish "banner shown, no decision yet" from "user finished." This plan's gating logic (Decisions, below) is written to fail closed given that gap. |
| `use-consent-signal.test.ts` | `src/modules/consent/use-consent-signal.test.ts:1-47` | Confirms `renderHook`/`act` from `@testing-library/react` is the established pattern for testing a hook that wraps a subscribable store; `AdSlot.hook.test.ts` mocks `@/modules/consent` directly instead (narrower: this plan's hook does not need the real `__tcfapi` plumbing, only `useConsentSignal`'s return value). |
| `ComponentPreview`, `PreviewState` | `src/testbed/testbed.types.ts:1-18` | `{ slug, title, group, devTool?, states: { name, render }[] }` — the preview this plan writes. |
| `src/testbed/registry.ts:1-11,56-` | registry file | Flat array of imported `*Preview` constants; this plan adds one import line and one array entry (`adSlotPreview`), following the existing pattern (e.g. `lobbyPreview` at line 40). |
| `PlayerStandings` worked example | `.claude/skills/component-architecture/reference/example.md:225-356` | View-layer precedent this plan follows: `NameView` (pure, props-only) + `Name` (one-line connected wrapper calling the hook), `styles.ts` exporting a `styles` object, `.preview.tsx` importing `NameView` (never the connected component) with fixtures. |
| `RESTRICTED_IMPORTS` | `eslint.config.mjs:39-55` | `*.hook.ts` files may import another module's public index (`@/modules/consent`) — only `@/modules/*/*` (a *deep* path) is banned, and only `@/lib/firebase`/`@/features/*` are separately restricted. `AdSlot.hook.ts` importing `from '@/modules/consent'` is therefore allowed. `max-lines: 150` (blank/comments excluded) applies to every new file below; none approach it. |
| No existing ads code | `grep -rniE "ads" src/modules src/app` (excluding unrelated matches, e.g. "loads", "threads") returns no hits for an ads module or `NEXT_PUBLIC_ADS_ENABLED` | Confirms this is greenfield; `src/modules/ads/` does not exist (`ls src/modules/ads` → No such file or directory). |
| `src/app/page.tsx:1-28` | lobby shell | Read for context only, **not edited in this phase**: `Home` renders `<Lobby onJoinGame={setActiveGameId} />` when signed in with no active game. Phase 1B wires `<AdSlot />` here; this plan's `AdSlot` is self-contained and not imported anywhere yet. |

## Decisions
- **No `AdSlot.types.ts` file.** The one shared type (`AdSlotDecision`) is exported directly from
  `AdSlot.hook.ts` and imported as a type into `AdSlot.tsx`, `AdSlot.fixtures.ts`, and the tests.
  This plan was asked to keep the *production* file list at 6 or fewer; a single two-field
  interface used by one hook and one view does not earn its own file under
  "Create only the files a component needs" (`component-architecture` skill). Rejected: a
  separate `.types.ts` per the general convention table — justified exception for this small a
  component, not a precedent for larger ones.
- **No component-level `index.ts`.** `src/modules/ads/index.ts` (the module's public API) imports
  `AdSlot` directly from `./components/AdSlot/AdSlot` (a relative import inside the same module,
  not a deep cross-module import). A second `components/AdSlot/index.ts` that only re-exports the
  same thing would be a pass-through file forbidden by `kiss-dry-solid` ("no files... that only
  pass data through"), since this module has exactly one component today. Rejected: adding it for
  consistency with multi-component modules — no second component exists yet to justify the extra
  indirection.
- **Ad network: recommend AdSense, but add none in 1A.** roadmap.md's Phase 0 decision already
  chose Google Funding Choices as the CMP; AdSense (or Ad Manager) is Google's own ad network and
  is pre-integrated with Funding Choices, so recommending it avoids a second vendor relationship
  — consistent with roadmap.md's own reasoning for the CMP choice. This plan adds no AdSense
  script, tag, or publisher ID: that is Phase 1B's job once CSP domains can be finalized (roadmap.md
  Phase 1 scope: "cannot be finalized until [the CMP vendor and ad network are] both confirmed").
  Rejected: Ad Manager directly — more setup (requires a network code, typically used by larger
  publishers with direct-sold inventory) for no benefit over AdSense at this stage; the user can
  switch before Phase 1B without any 1A code changing, since 1A never references a network.
- **Placeholder, dev-only, gated by the same decision as a real ad.** `AdSlot` renders a labelled
  placeholder (`"Ad slot (dev placeholder — non-personalized)"`) when the hook's gate passes AND
  `NODE_ENV !== 'production'`; it renders nothing in production (no real network script exists yet,
  so claiming to show an ad there would be false) and nothing whenever the gate fails, in any
  environment. This gives the 4 preview states real visual content for the one case that should
  show something, instead of 4 indistinguishable "renders nothing" states, while guaranteeing
  production never paints a fake ad box. Phase 1B replaces the placeholder's render branch with
  the real ad tag once the network and CSP are set — the gate (flag + consent) does not change.
  Rejected: rendering nothing in every 1A state — technically simplest, but gives `ui-verify` and
  the preview catalog nothing to visually confirm, and the task explicitly asked which of the two
  options to recommend.
- **Request mode is a constant, not computed.** `AdSlotDecision.requestMode` is always the literal
  `'non-personalized'` — triage.md's scope is "non-personalized ads" unconditionally (not
  "personalized once consent is granted"), so there is no second mode to branch on. Phase 1B's
  future ad-loader code reads this field when it builds the real ad request. Rejected: a
  `'personalized' | 'non-personalized'` union — no requirement in triage.md or the roadmap ever
  asks for personalized ads; adding the branch would be speculative (`kiss-dry-solid`).
- **Unknown or GDPR-applicable consent both fail closed; only an explicit `gdprApplies: false`
  passes.** `ConsentSignal` (above) cannot currently distinguish "user confirmed no personal data
  collection needed" from "banner is still showing" when `gdprApplies` is `true`, because the
  store doesn't parse the TCF string or expose `eventStatus` (see Verified context). Parsing
  per-purpose TCF consent is out of this plan's scope (phase-0b-plan.md deferred the same
  question). So: `status !== 'ready'` → don't render (true unknown); `status === 'ready' &&
  gdprApplies === true` → don't render (GDPR applies; this module cannot yet confirm consent, so
  it is treated as denied); `status === 'ready' && gdprApplies === false` → render (GDPR does not
  apply to this visitor, so no further consent gate is needed for a non-personalized request).
  This is a safe-by-default reading, consistent with "minors can play" (roadmap.md Risks) and
  "Non-personalized only" in this task's instructions. **Open question carried to a later phase**:
  once a real ad network needs actual EEA ad serving, someone must decide whether to parse the TCF
  string for Purpose 1 consent (extending `src/modules/consent`, out of this plan's scope) or rely
  on the ad network's own client library to self-gate via `__tcfapi` (many Google ad tags do this
  internally) — not decided here, flagged for whoever writes Phase 1B.
- **docs-sync covers `structure-and-state.md` §2 only, not `systems-and-visuals.md`.** The module
  exists but is not wired into any visible screen yet (no `src/app/page.tsx` edit in 1A), so there
  is no new UI/UX interaction to document in §6.7 — that update belongs with Phase 1B's lobby
  placement. Rejected: updating §6.7 now — would describe a UI surface that doesn't render
  anywhere yet.

## File plan
Core component files (6, the cap this plan was asked to respect):
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/ads/ads.config.ts` | new | `isAdsEnabled()` (flag, default off) and `isAdPlaceholderVisible()` (`NODE_ENV !== 'production'`), same pattern as `src/testbed/testbed.config.ts:6-8` | implementer-a |
| `src/modules/ads/components/AdSlot/AdSlot.hook.ts` | new | `useAdSlot()`: reads the flag and `useConsentSignal()`, returns an `AdSlotDecision` (also exports that type — see Decisions) | implementer-a |
| `src/modules/ads/components/AdSlot/AdSlot.fixtures.ts` | new | 4 deterministic `AdSlotDecision` fixtures shared by the hook/view tests and the preview | implementer-a |
| `src/modules/ads/components/AdSlot/AdSlot.styles.ts` | new | `styles` object: placeholder box classes, fixed height (no page scroll per roadmap.md's lobby note) | implementer-b |
| `src/modules/ads/components/AdSlot/AdSlot.tsx` | new | `AdSlotView({ showDevPlaceholder })` (pure) and `AdSlot()` (one-line, calls `useAdSlot()`) | implementer-b |
| `src/modules/ads/index.ts` | new | Public API: exports `AdSlot` | implementer-a |

Tests, preview and docs (required by this task, counted separately from the 6-file cap above):
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/ads/ads.config.test.ts` | new | `isAdsEnabled`/`isAdPlaceholderVisible` truth table, same shape as `testbed.config.test.ts` | tester-a |
| `src/modules/ads/components/AdSlot/AdSlot.hook.test.ts` | new | `useAdSlot()` gating matrix (flag × consent), mocking `@/modules/consent`'s `useConsentSignal` | tester-a |
| `src/modules/ads/components/AdSlot/AdSlot.test.tsx` | new | `AdSlotView`: renders the placeholder text when `showDevPlaceholder` is true, renders nothing otherwise | tester-b |
| `src/modules/ads/components/AdSlot/AdSlot.preview.tsx` | new | 4 states: flag off; flag on + consent unknown; flag on + consent denied; flag on + consent granted | preview-a |
| `src/testbed/registry.ts` | edit | Import `adSlotPreview` and add it to the `previews` array | preview-a |
| `docs/architecture/structure-and-state.md` | edit (§2) | Add a `src/modules/ads/` bullet: `AdSlot`, the flag, and the consent gate (no ad network yet) | docs-sync |

12 files total.

## Contracts
```ts
// src/modules/ads/ads.config.ts

/** Lobby ad slot is off by default. Same pattern as isTestbedEnabled (src/testbed/testbed.config.ts). */
export function isAdsEnabled(): boolean;

/**
 * True outside a production build. Governs the dev-only placeholder box that stands in for the
 * real ad network until Phase 1B wires one — never true in production, regardless of the flag.
 */
export function isAdPlaceholderVisible(): boolean;
```

```ts
// src/modules/ads/components/AdSlot/AdSlot.hook.ts
'use client';

/** What AdSlot should do, decided before any ad network exists. */
export interface AdSlotDecision {
  /**
   * True once the flag is on and the consent signal allows a non-personalized ad request
   * (see phase-1a-plan.md "Decisions": fails closed on 'unknown' and on gdprApplies === true).
   * Phase 1B's real ad tag renders when this is true, in every environment.
   */
  canRequestAd: boolean;
  /** canRequestAd && isAdPlaceholderVisible() — stands in for the real ad until Phase 1B. */
  showDevPlaceholder: boolean;
  /** Always 'non-personalized' (triage.md scope). Phase 1B's ad loader reads this field. */
  requestMode: 'non-personalized';
}

/** Decides whether AdSlot may request (or, today, placeholder-render) a non-personalized ad. */
export function useAdSlot(): AdSlotDecision;
```

```ts
// src/modules/ads/components/AdSlot/AdSlot.fixtures.ts
import type { AdSlotDecision } from './AdSlot.hook';

export const adsDisabledDecision: AdSlotDecision; // canRequestAd: false, showDevPlaceholder: false
export const consentUnknownDecision: AdSlotDecision; // flag on, canRequestAd: false, showDevPlaceholder: false
export const consentDeniedDecision: AdSlotDecision; // flag on, gdprApplies: true path, canRequestAd: false
export const consentGrantedDecision: AdSlotDecision; // flag on, gdprApplies: false path, canRequestAd: true, showDevPlaceholder: true
```

```tsx
// src/modules/ads/components/AdSlot/AdSlot.tsx
'use client';

/** Pure view: renders the dev placeholder or nothing, decided entirely by its prop. */
export function AdSlotView({ showDevPlaceholder }: Pick<AdSlotDecision, 'showDevPlaceholder'>): JSX.Element | null;

/** Connected component: one line, delegates to useAdSlot(). */
export function AdSlot(): JSX.Element | null;
```

```ts
// src/modules/ads/index.ts
export { AdSlot } from './components/AdSlot/AdSlot';
```

## Phases
Single phase (12 files, within this task's own scope; no further split needed — all files are
new except the registry edit, and none depend on code outside this module plus the already-merged
`src/modules/consent`).

### Phase 1: AdSlot component, flag, tests, preview
1. implementer-a writes `src/modules/ads/ads.config.ts` (haiku acceptable — two one-line functions, copying `isTestbedEnabled`'s shape).
2. implementer-a writes `src/modules/ads/components/AdSlot/AdSlot.hook.ts` per the contract (**sonnet recommended**: the fail-closed consent logic in Decisions is easy to get backwards, e.g. defaulting an unhandled case to `true` instead of `false`).
3. implementer-a writes `src/modules/ads/components/AdSlot/AdSlot.fixtures.ts` (haiku acceptable once step 2's type exists).
4. implementer-a writes `src/modules/ads/index.ts` (haiku acceptable — one export line).
5. implementer-b writes `src/modules/ads/components/AdSlot/AdSlot.styles.ts` (haiku acceptable).
6. implementer-b writes `src/modules/ads/components/AdSlot/AdSlot.tsx` per the contract (haiku acceptable — one conditional render plus a one-line connected wrapper).
7. tester-a writes `src/modules/ads/ads.config.test.ts` (haiku acceptable, same shape as `testbed.config.test.ts`).
8. tester-a writes `src/modules/ads/components/AdSlot/AdSlot.hook.test.ts` (**sonnet recommended**: must mock `@/modules/consent`'s `useConsentSignal` correctly and cover every branch in the fail-closed matrix; an easy place to accidentally assert the wrong default).
9. tester-b writes `src/modules/ads/components/AdSlot/AdSlot.test.tsx` (haiku acceptable, two render assertions using the fixtures).
10. preview-a writes `src/modules/ads/components/AdSlot/AdSlot.preview.tsx` and registers it in `src/testbed/registry.ts` (haiku acceptable).
11. docs-sync updates `docs/architecture/structure-and-state.md` §2.
12. Run `npm run typecheck`, `npm run lint`, `npm test`.
13. `ui-verify` on `/testbed/<slug>`: open each of the 4 states; confirm the first 3 render nothing (no console error) and the 4th shows the labelled placeholder box, at desktop and mobile size.

Model escalation: steps 2 and 8 (the fail-closed gating logic and its test) need sonnet; every other step is mechanical enough for haiku.

## Test plan
- tester-a (logic, first):
  - `ads.config.test.ts`: `isAdsEnabled()` false when `NEXT_PUBLIC_ADS_ENABLED` is unset or any
    value other than the string `'true'` (e.g. `'false'`, `'1'`); true only when it is exactly
    `'true'`. `isAdPlaceholderVisible()` true when `NODE_ENV` is `'development'` or `'test'`,
    false when `'production'` — same `Object.defineProperty` pattern as `testbed.config.test.ts`.
  - `AdSlot.hook.test.ts` (mock `@/modules/consent`'s `useConsentSignal` to return a fixed
    `ConsentSignal` per test; set/unset `NEXT_PUBLIC_ADS_ENABLED` and `NODE_ENV` per test):
    - flag off, any consent (including a "would otherwise pass" granted signal) → `canRequestAd: false`, `showDevPlaceholder: false`.
    - flag on, `{ status: 'unknown', gdprApplies: undefined, tcString: null }` → `canRequestAd: false`.
    - flag on, `{ status: 'ready', gdprApplies: true, tcString: 'ABC' }` → `canRequestAd: false` (fails closed; GDPR applies, no parsed consent).
    - flag on, `{ status: 'ready', gdprApplies: false, tcString: 'XYZ' }` → `canRequestAd: true`.
    - `showDevPlaceholder` equals `canRequestAd && isAdPlaceholderVisible()` in both a dev-like and a production `NODE_ENV`, for the one case where `canRequestAd` is true.
    - `requestMode` is `'non-personalized'` in every case, including when `canRequestAd` is false.
- tester-b (view):
  - `AdSlot.test.tsx` (render `AdSlotView` directly, with fixtures from `AdSlot.fixtures.ts`):
    renders the placeholder text when `showDevPlaceholder` is `true`; renders nothing (empty
    container, no error) for the other three fixtures.

## Preview states
- `AdSlot` (`AdSlotView`, via `AdSlot.fixtures.ts`):
  - "Flag off" — `adsDisabledDecision` — renders nothing.
  - "Flag on, consent unknown" — `consentUnknownDecision` — renders nothing.
  - "Flag on, consent denied (GDPR applies)" — `consentDeniedDecision` — renders nothing.
  - "Flag on, consent granted (GDPR does not apply)" — `consentGrantedDecision` — renders the
    labelled dev placeholder box.

## Risks
- The fail-closed reading of `gdprApplies: true` as "denied" means no EEA/UK visitor ever sees an
  ad under this plan's logic alone, even after they accept Funding Choices' banner, until a later
  phase parses the TCF string or the real ad network's own client library self-gates via
  `__tcfapi`. Flagged as an open question above, not resolved here — safe-by-default is the right
  call for a phase that ships no real ad network yet.
- `isAdPlaceholderVisible()` reading `NODE_ENV` means the placeholder box also shows up during
  `npm test` (`NODE_ENV=test`) and local `npm run dev`; this is intentional (dev-only, never
  production) but worth stating plainly in `progress.md` so no one mistakes it for a real ad
  rendering once the app is run locally with the flag on.

## Review (architect-b)

### Path/symbol verification
All cited paths and symbols checked and accurate:
- `src/testbed/testbed.config.ts:6-8` — `isTestbedEnabled()` matches exactly, `process.env.NODE_ENV !== 'production'`.
- `src/modules/consent/consent-signal-store.ts:1-9` — `ConsentSignal` has exactly `status`/`gdprApplies`/`tcString`; `TcData` (lines 11-14) has only `tcString?`/`gdprApplies?`, no `eventStatus`. The plan's central claim — the store cannot distinguish "banner shown" from "user decided" — is correct: `handleTcData` (lines 44-52) sets `status: 'ready'` on every successful `__tcfapi` callback regardless of which TCF `eventStatus` triggered it, and that field is never read or stored.
- `src/modules/consent/index.ts:1-4` — exports `useConsentSignal`, `getConsentSignal`, `ConsentSignal` type. Matches.
- `src/modules/consent/use-consent-signal.ts:1-18` — confirms `useConsentSignal()` returns the live `ConsentSignal`, no extra fields.
- `eslint.config.mjs:39-55` — `deepModuleImport` pattern is `@/modules/*/*` (two segments after `/modules/`); `@/modules/consent` (one segment) does not match, so `AdSlot.hook.ts` importing the public index is allowed, as claimed.
- `src/app/page.tsx:25` — `return <Lobby onJoinGame={setActiveGameId} />;` confirmed, not edited by this plan.
- `src/testbed/registry.ts:43,101` — `lobbyPreview` import and array-entry pattern confirmed; adding `adSlotPreview` the same way is consistent.
- `src/modules/consent/funding-choices-loader.test.tsx:1-32` — confirms the direct `process.env[NAME] = value` / `delete process.env[NAME]` pattern in `afterEach`, no module reset. Matches the plan's testing precedent.
No invented paths found.

### Consent gate: fail-closed in the EEA — APPROVED for 1A
The plan's read of the store is correct, and the fail-closed design is the right call for this phase, not a gap to fix here.

**What the user sees, per region, under this plan's logic:**
- Outside GDPR scope (`gdprApplies === false` once `status: 'ready'`): sees the dev placeholder in non-production; would see a real ad once Phase 1B adds a network. No regression.
- GDPR applies (EEA/UK), before any TCF signal (`status: 'unknown'`): nothing renders. Correct — no decision exists yet.
- GDPR applies, after the visitor accepts the Funding Choices banner (`status: 'ready'`, `gdprApplies: true`): **nothing renders, indistinguishable from having declined.** This is the behavior flagged in the plan's Risks and Decisions sections, and it is real: every EEA/UK visitor is denied an ad slot forever under 1A's logic alone, consent notwithstanding.

**Why extending the consent-signal store now is not required:**
1. 1A ships no ad network and is not wired into `src/app/page.tsx` (confirmed above) — nothing user-visible in production depends on this gate yet. The cost of being wrong in either direction is zero in this phase.
2. Parsing the TCF string for Purpose 1 (or reading a finer-grained signal) is a real design task — it needs its own contract, its own tests for the TCF string format, and a decision on which purposes gate a "non-personalized" request. Bolting that onto this plan would blow the stated 6-file cap and mix an unrelated capability into a component that doesn't call an ad network.
3. The plan's own stated alternative — many ad tags (including Google's) self-gate via their own `__tcfapi` read when they build the real request — may make store-level TCF parsing unnecessary engineering work entirely once Phase 1B picks a network. Building it now risks being thrown away.
4. The failure direction is the safe one: under-serving ads (lost revenue) vs. over-serving without confirmed consent (legal exposure, user instructions call out minors specifically). A safe-by-default interim state is correct.
- Condition on the approval: the open question ("parse TCF string in the store, or rely on the network's own `__tcfapi` self-gating") must be carried into Phase 1B's own plan.md as a decision point before that phase is approved — the plan already does this (Decisions, "Open question carried to a later phase"); confirmed present, not just asserted.

### 6-file cap
Confirmed as claimed: `ads.config.ts`, `AdSlot.hook.ts` (exports `AdSlotDecision` inline, no separate `.types.ts`), `AdSlot.fixtures.ts`, `AdSlot.styles.ts`, `AdSlot.tsx`, `index.ts` (module-level, no `components/AdSlot/index.ts`) = 6 production files. Both omissions are justified under `component-architecture`'s "create only the files a component needs" and `kiss-dry-solid`'s "no pass-through files": a two-field interface used by exactly one hook and one view does not need its own file, and a single-component module's component-level index would only re-export what the module index already re-exports. No objection.

### Dev-only placeholder, production behavior
Confirmed by the contract (`AdSlot.hook.ts` section, lines 129-133 and 148): `isAdPlaceholderVisible()` is `NODE_ENV !== 'production'`, and `showDevPlaceholder = canRequestAd && isAdPlaceholderVisible()`. In a production build this is always `false` regardless of the flag or consent, so `AdSlotView` (contract: renders the placeholder or `null`) always renders `null` in production — no fake ad box ships. This is consistent with there being no real ad network yet. Correctly scoped; nothing to add before 1B swaps in the real tag.

### Other
- `requestMode: 'non-personalized'` as a literal constant, not a union: correct given triage.md's scope is unconditionally non-personalized; no speculative branch.
- docs-sync scope (structure-and-state.md §2 only, not systems-and-visuals.md): correct, since no screen renders `AdSlot` yet.

VERDICT: APPROVED
- No blocking findings. The EEA fail-closed behavior is an accepted, documented interim limitation, not a defect — Phase 1B's plan.md must resolve the open question (TCF parsing vs. network self-gating) before that phase can wire a real ad into the EEA.
