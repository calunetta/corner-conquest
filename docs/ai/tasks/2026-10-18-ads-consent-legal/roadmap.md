# Roadmap: Ads, consent and legal (epic)

Status: DRAFT
Inputs: triage.md (tier XL, 4 phases)

This is a roadmap, not a plan. Each phase below is its own L-tier task: before it starts,
run architect-a/architect-b again on that phase alone to produce that phase's own
`plan.md` (contracts, file plan, test plan) and `progress.md`, per CLAUDE.md "Phases".
Do not start building from this document directly.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `RootLayout` | `src/app/layout.tsx:21-35` | Wraps every route in `PlayerProvider`/`TooltipProvider`; a consent banner or CMP script mounts here. |
| `Home` | `src/app/page.tsx:7-28` | Lobby shell: `h-screen w-screen ... overflow-hidden` (`src/app/page.tsx:24`); an ad slot must fit inside the existing `flex h-full w-full flex-col` content div (`src/app/page.tsx:26`), not add page scroll. |
| `nextConfig` | `next.config.ts:5-33` | No `headers()` or CSP config exists today. A CMP/ad script needs CSP additions (script-src, frame-src, connect-src for the ad network and the CMP vendor) added here in Phase 1. |
| `signInWithGoogle`, `AuthAccount` | `src/modules/session/services/account.service.ts:28-31` | Google sign-in only stores `uid` and `displayName` (`account.service.ts:23`, `toAuthAccount`); no existing account-deletion function — Phase 0 must add one. |
| `src/modules/session/index.ts` | `src/modules/session/index.ts:1-8` | Module's public API; a deletion-entry UI (e.g. in a settings/account view) is wired through here, not a deep import. |
| Module layout convention | `.claude/skills/component-architecture/SKILL.md` | New consent/ads code follows `src/modules/<domain>/components/<Name>/` with `.tsx/.hook.ts/.styles.ts/.map.ts/.types.ts/.fixtures.ts/index.ts`; `.service.ts` is the only place `@/lib/firebase` may be imported (`eslint.config.mjs:43`). |
| `isTestbedEnabled` | `src/testbed/testbed.config.ts:6-8` | Existing precedent for a `NEXT_PUBLIC_*`-gated build-time flag; the ads feature flag in Phase 1 should follow the same pattern (read once in a small flag helper, not scattered `process.env` checks). |
| `LEGACY_PATHS` | `eslint.config.mjs:12-23` | `src/features/**` and `src/lib/**` are exempt from strict lint; nothing in this epic touches them except reading `account.service.ts`'s existing exports. |
| No existing ads/consent/privacy/terms code | Grep across `src/` for `ads\|consent\|privacy\|terms\|cmp\|gdpr\|tcf` (excluding tests) returned no hits outside unrelated matches (`monster-catalog`, `tile-variants`, dev-tools) | Confirms this is greenfield; no legacy code to migrate or delete. |
| `docs/README.md` index | `docs/README.md:19-24` | `docs/architecture/structure-and-state.md` (§2/§3), `systems-and-visuals.md` (§6.7 UI/UX) are the files `docs-sync` updates when Phase 0/1 change layout or add a module. |

## Decisions
- Each phase is its own task folder/plan, because an XL epic exceeds the "about 6 files" phase-plan sizing rule even once; bundling all 4 into one plan.md would blow past that and hide the Phase-3 business blockers. Rejected: one combined plan.md for all 4 phases (too large, mixes a blocked phase with buildable ones).
- Ads code lives in a new `src/modules/ads/`; consent/legal in a new `src/modules/consent/` plus new `src/app/privacy/` and `src/app/terms/` routes — not folded into `src/modules/session` or `src/modules/lobby`, because consent gating and ad loading are both reusable outside the lobby later and are a distinct domain (SRP). Rejected: putting the consent banner inside `src/modules/lobby` (couples an app-wide legal requirement to one feature module).
- CMP: recommend Google-owned **Google Funding Choices / Ad Manager's "Privacy & messaging"** CMP, since the ad network candidate is AdSense/Ad Manager and Google's own CMP is pre-integrated with it and is in the IAB TCF v2.2 vendor list (Google's own CMP appears on the public IAB TCF certified-CMP list; per architect-b's review the exact entry and ID must be re-checked on Google's AdSense TCF help page before Phase 0 implementation, since list status can change. Google does not check CMPs for full legal compliance, so this is not a compliance guarantee). Rejected: a general-purpose third-party CMP (Cookiebot, OneTrust, Usercentrics) — all are also TCF-certified and viable, but add a paid vendor relationship the user has not asked for; Google's CMP is free and loads as a script tag like any other CMP, so switching later is possible without a deep rewrite if the user prefers a paid vendor. This choice is a recommendation for the user to confirm, not a locked decision — flag it as an open question in Phase 0's own plan.md.
- The CMP loads as a `<script>` tag (async, in `src/app/layout.tsx` or a dedicated consent component), the same mechanism as any ad-network script `next.config.ts` would need a CSP exception for anyway. No npm package needed for Funding Choices; it's a Google-hosted script. Rejected: a CMP npm SDK — none is required for Funding Choices; adding one would be an unjustified dependency (kiss-dry-solid: "a new dependency needs a written reason").
- Phase 2 adds no analytics SDK; ad revenue is read from the ad network's own dashboard (AdSense/Ad Manager reporting). This is a decision recorded here, not a code change — triage.md's Scope already excludes analytics SDKs.
- Phase 3 (ad-free purchase) is planned only: list the decisions needed, write no contracts, no file plan beyond a placeholder. Per task instructions, do not design payment integration.

## Phase 0: Legal pages and consent
**Goal:** `/privacy` and `/terms` routes exist, a consent banner gates ad personalization and records the player's choice, and signed-in Google users have a working account-deletion path. No ads load yet.

### Scope and files (for that phase's own plan.md to detail)
- Sizing: this phase exceeds about 6 files and must be split into at least two sub-phases (A legal pages, B consent module, C account deletion) recorded in its own `progress.md`. Re-verify every line number fresh before writing its plan.md.
- Account deletion must also decide whether to redact a player's data embedded in non-uid-keyed `games/{gameId}` documents, not only the `accounts` and `usernames` collections.
- New routes: `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` (default-exported route components, per CLAUDE.md "Named exports only; default exports are for `src/app` route files"). Content is a legal draft — **a lawyer must review before launch**; mark this explicitly in that phase's plan.md and progress.md, it is not an engineering sign-off.
- New module `src/modules/consent/`: a `ConsentBanner` component (`components/ConsentBanner/ConsentBanner.tsx` + `.hook.ts` + `.styles.ts` + `.types.ts` + `index.ts`), a `consent-choice.store.ts` (or `.service.ts` if it persists to Firestore/localStorage — decide in that phase's plan based on whether consent must survive across devices for a signed-in user, which TCF typically does not require; localStorage per browser is the simpler, KISS-compliant default) recording: ad personalization consent (`granted`/`denied`), timestamp, and TCF consent string once the CMP returns one.
- `src/app/layout.tsx:24-34`: minimal edit to mount `<ConsentBanner />` (or the CMP script loader) inside `<body>`, alongside existing `PlayerProvider`/`Toaster`. List this edit in Phase 0's File plan; keep it to the one new line plus import.
- Account deletion: a new exported function in `src/modules/session/services/account.service.ts` (e.g. `deleteAccount(uid): Promise<void>`) that deletes the Firebase Auth user and any Firestore docs keyed by `uid` — that phase's plan.md must enumerate which Firestore collections key by `uid` (grep `src/modules/*/services/*.service.ts` for `doc(db,` calls keyed by a player/user id) before writing the contract. A UI entry point (e.g. a "Delete account" action) goes in a new or existing session component, wired through `src/modules/session/index.ts`.
- `docs/architecture/structure-and-state.md` (§2, new module) and `systems-and-visuals.md` (§6.7, new legal routes + consent banner in the UI) — docs-sync, mandatory.

### Open question for Phase 0's own plan
- Exact CMP vendor (Google Funding Choices vs. a paid alternative) — confirm with the user before wiring the script, since it affects the CSP domains added in Phase 1 and possibly Phase 0 if the banner itself is CMP-rendered rather than a custom banner.
- Whether deletion must also revoke the linked Google OAuth grant (`revokeAccess`) or only delete the Firebase user — a legal/product decision, not an engineering default.

## Phase 1: Ads module
**Goal:** a feature-flagged, consent-gated, non-personalized ad slot renders in the lobby only, behind `NEXT_PUBLIC_ADS_ENABLED` (default off) and a publisher ID from a `NEXT_PUBLIC_*` env var.

### Scope and files (for that phase's own plan.md to detail)
- Sizing: this phase exceeds about 6 files and must be split into at least two sub-phases (A AdSlot and flag, B CSP and layout wiring) recorded in its own `progress.md`. Re-verify every line number fresh before writing its plan.md.
- New module `src/modules/ads/`: `components/AdSlot/AdSlot.tsx` (view), `.hook.ts` (reads the consent store from `src/modules/consent`, reads the feature flag, decides whether to request a non-personalized ad), `.styles.ts`, `.types.ts`, `index.ts`. A small `ads.config.ts` (flat file, not under `components/`, following the `game-board`-style "logic-only" layout for config) analogous to `src/testbed/testbed.config.ts:6-8`, exporting `isAdsEnabled(): boolean` reading `process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'`.
- `src/app/page.tsx:7-28`: minimal edit, rendering `<AdSlot />` only inside the `Lobby` branch (`src/app/page.tsx:26`, the `!activeGameId` / signed-in path), never during `GameBoard`. Must not change the shell's `h-screen overflow-hidden` behavior (`src/app/page.tsx:24`) — the slot's `.styles.ts` needs a fixed height so it can't push the shell into scroll.
- `next.config.ts:5-33`: add a `headers()` function (none exists today) with a CSP covering the ad network's and CMP's script/frame/connect domains. That phase's plan must list the exact domains once the ad network (AdSense vs. Ad Manager) and CMP vendor (Phase 0's open question) are both confirmed — cannot be finalized until then.
- `src/app/layout.tsx`: if the ad network's base script (e.g. AdSense's `adsbygoogle.js`) must load site-wide rather than per-slot, that load is gated behind both the flag and consent in the same hook/loader used by `AdSlot.hook.ts`, not duplicated.
- `docs/architecture/systems-and-visuals.md` (§6.7, lobby layout change) — docs-sync, mandatory.

### Tests and preview (for that phase's own plan)
- `AdSlot.hook.test.ts`: flag off → no ad request; flag on + consent denied → non-personalized request only; flag on + consent granted → personalized allowed (if the product wants that distinction — confirm against triage's "non-personalized ads" scope, which may mean non-personalized is the only mode ever requested regardless of consent, pending a legal decision in Phase 0).
- `AdSlot.preview.tsx`: states for flag-off (renders nothing, or a placeholder in dev), flag-on/consent-pending, flag-on/consent-denied, flag-on/consent-granted — use `.fixtures.ts`, no real ad-network calls in previews or tests (sandbox/mock the loader).

## Phase 2: Revenue tracking — decision, no code
No analytics SDK is added. Ad revenue, impressions and click-through are read from the ad network's own dashboard (AdSense/Ad Manager reporting UI), which already aggregates per-publisher-ID data once Phase 1's publisher ID is live. This avoids a second data-collection surface and the consent/privacy burden an analytics SDK would add on top of the ad consent already required in Phase 0. No files, no plan.md needed for this phase beyond recording this decision (done, above).

## Phase 3: Ad-free purchase — planning only, no payment design
Per instructions, do not design the payment integration. Before any plan.md is written for this phase, the user must decide:
- **Payment provider**: e.g. Stripe, Google Play Billing (if ever packaged as an app), or another processor. Affects SDK, fees, and whether a backend function (none currently exists outside Next.js API routes under `src/app/api/`) is needed to verify payment server-side.
- **Price and currency/region handling**: one-time purchase vs. subscription; whether price varies by region.
- **Merchant of record**: whether the user's own entity sells the ad-free upgrade directly (handling its own VAT/sales tax registration) or a merchant-of-record service (e.g. Stripe Tax, Paddle, Lemon Squeezy) handles tax compliance instead — materially changes the provider choice above.
- **Entitlement storage**: where "this account has purchased ad-free" is persisted — likely a field on the player's existing Firestore record read by `src/modules/session` (`AuthAccount`-adjacent data), but the exact document and security-rule shape is a design task for when the provider is chosen, since different providers deliver purchase confirmation differently (webhook vs. client SDK receipt).

This epic's Phase 3 is blocked on these decisions and is out of scope for architect/implementer work until the user supplies them (triage.md's Open questions already lists this).

## Risks
- CMP vendor and CSP domains in Phase 1 can't be finalized until Phase 0's CMP choice is confirmed by the user — sequence dependency, not a parallelizable pair.
- Minors playing: Phase 0's consent banner and Phase 1's ad requests must default to non-personalized / child-directed treatment; confirm with the user whether the game should also signal `tagForChildDirectedTreatment` to the ad network, since triage.md flags "Minors can play" but does not resolve this — raise it in Phase 0's own plan.md as an open question, not a default the architect picks alone.
- Legal draft content (privacy policy, terms) is not an engineering decision; flag lawyer review as a blocking step before Phase 0 ships to production, separate from the engineering Definition of Done.

## Review (architect-b)

### Path/symbol verification
All cited paths and symbols exist and are accurately described:
- `src/app/layout.tsx` — `RootLayout` default export at line 20 (roadmap says 21-35; off by one, trivial, folded in below), wraps children in `PlayerProvider`/`TooltipProvider`, `Toaster` at body level. Matches.
- `src/app/page.tsx` — `Home` default export at line 8 (roadmap says 7-28; off by one), `h-screen w-screen ... overflow-hidden` at line 31 (roadmap cites line 24 — drifted further; file has grown since the roadmap was drafted), `z-10 flex h-full w-full flex-col` at line 33. Lobby branch confirmed at `src/app/page.tsx:26` (`return <Lobby onJoinGame={setActiveGameId} />;`).
- `next.config.ts:1-35` — confirmed, no `headers()` function exists today. Claim is accurate.
- `src/modules/session/services/account.service.ts` — `signInWithGoogle` at line 28-31 (matches exactly), `AuthAccount` type at line 15-19, `toAuthAccount` at line 21. No `deleteAccount` export exists (confirmed via Read) — claim that Phase 0 must add one is correct.
- `src/modules/session/index.ts:1-8` — matches exactly, 8 named exports, no default.
- `src/testbed/testbed.config.ts:6-8` — `isTestbedEnabled` matches exactly, line for line.
- `eslint.config.mjs` — `LEGACY_PATHS` is lines 12-24 (roadmap says 12-23, off by one), confirmed `src/features/**` and `src/lib/**` are listed and exempted via `ignores: [...IGNORED_PATHS, ...LEGACY_PATHS]` at line 59.
- Greenfield claim: `grep -rniE "ads|consent|cmp|gdpr|tcf" src` (excluding tests) returns only unrelated matches (api routes, combat dialogs, game-board hooks using the word "cancel"/"consent"-adjacent substrings) — no existing ads/consent code. Confirmed.
- `doc(db, ...)` callers keyed by a player/user id for the account-deletion enumeration: `src/modules/session/services/account.service.ts:71,84,85` (`accounts/{authUid}`, `usernames/{username}` → `authUid`), `src/modules/session/services/player-session.service.ts:5,14,19` (`usernames/{username}`). Also present but not uid-keyed directly: `games/{gameId}` docs in `game-board.engine.service.ts`, `lobby.service.ts`, `bot-turn.service.ts`, `player-reclaim.service.ts`, `player-exit.service.ts` — these embed player data inside a shared game document rather than a per-uid doc, so "delete account" must also decide whether to redact a player's data from any game documents they're currently in. The roadmap's instruction to "enumerate which Firestore collections key by uid" undercounts: Phase 0's own plan.md must also address data embedded in non-uid-keyed `games/*` docs, not just top-level `accounts`/`usernames` collections. **Add this to Phase 0's open questions.**
- `docs/architecture/structure-and-state.md` and `systems-and-visuals.md` both exist. Confirmed.

Finding (fix, non-blocking): the line-number citations in "Verified context" have drifted by one-to-several lines since this roadmap was written (files changed under active development on this branch). Not a defect in the roadmap's reasoning, but whoever writes Phase 0/1's own plan.md must re-verify every line number fresh rather than trusting this roadmap's numbers — flag that instruction in each phase's own plan.md.

### Claim 1: Google Funding Choices as a TCF-certified CMP
**Cannot be fully confirmed; the roadmap's specific detail is wrong and must be corrected, not just hedged.**
- WebFetch of Google's AdSense TCF help page confirms: AdSense/Ad Manager/AdMob's "Privacy & messaging" European regulations message **is** certified under the IAB TCF requirement, and Google's own CMP entry on the public certified-CMP list is **"Google LLC CMP," TCF CMP ID 300** (not ID 280 as the roadmap states at line 28). The link between that certified-CMP-list entry and the specific "Privacy & messaging"/Funding Choices product is an inference from Google's own documentation, not an explicit same-page statement — Google's page also states "Google does not check CMPs for full compliance with the TCF or applicable privacy laws," so certification is not a compliance guarantee.
- **Fix required in the roadmap**: correct "CMP ID 280" to "CMP ID 300" (per Google's own AdSense TCF help page, as of this review) or remove the specific ID entirely and state only that Google's own CMP appears on the public TCF vendor list — do not restate ID 280 in Phase 0's own plan.md. This is exactly the kind of unverified specific the roadmap's own hedge ("unverified beyond that public registry") was meant to catch, but a wrong number is worse than no number: fix it before it propagates into Phase 0's plan.md.
- The broader claim — that Google's CMP can be used via script tag and is viable for AdSense in the EEA/UK — is reasonably well supported and the roadmap already flags it as a recommendation requiring user confirmation, not a locked decision. Leave that framing as is.

### Claim 2: Phase 0 and Phase 1 file counts
Both phases exceed CLAUDE.md's "about 6 files" phase-sizing guideline well before tests are added, and must be split further in their own `progress.md` once their phase-level plan.md is written.

**Phase 0** (counting only what's listed in the roadmap, excluding tests which aren't even enumerated yet):
1. `src/app/privacy/page.tsx` (new)
2. `src/app/terms/page.tsx` (new)
3. `src/modules/consent/components/ConsentBanner/ConsentBanner.tsx`
4. `ConsentBanner.hook.ts`
5. `ConsentBanner.styles.ts`
6. `ConsentBanner.types.ts`
7. `ConsentBanner/index.ts`
8. `consent-choice.store.ts` (or `.service.ts`)
9. `src/app/layout.tsx` (edit)
10. `src/modules/session/services/account.service.ts` (edit, new `deleteAccount`)
11. a new/existing session UI component for the deletion entry point
12. `docs/architecture/structure-and-state.md` (docs-sync)
13. `docs/architecture/systems-and-visuals.md` (docs-sync)

13 files before any test file (`ConsentBanner.hook.test.ts`, `.test.tsx`, `account.service.test.ts` additions) or preview. **Must split.** Recommended split for Phase 0's own `progress.md`: sub-phase A = legal pages (`/privacy`, `/terms`, docs-sync) — about 3 files; sub-phase B = consent module (`ConsentBanner` + its store + layout wiring + docs-sync) — about 7 files; sub-phase C = account deletion (`account.service.ts` + UI entry point + its tests) — about 4 files.

**Phase 1** (same undercount, excluding tests/preview):
1. `src/modules/ads/components/AdSlot/AdSlot.tsx`
2. `AdSlot.hook.ts`
3. `AdSlot.styles.ts`
4. `AdSlot.types.ts`
5. `AdSlot/index.ts`
6. `ads.config.ts`
7. `src/app/page.tsx` (edit)
8. `next.config.ts` (edit, new `headers()`)
9. `src/app/layout.tsx` (edit, conditional base-script loader)
10. `docs/architecture/systems-and-visuals.md` (docs-sync)

10 files before `AdSlot.hook.test.ts` and `AdSlot.preview.tsx`. **Must split.** Recommended split: sub-phase A = `AdSlot` component + `ads.config.ts` + tests/preview (lobby-only, no CSP yet, rendered behind the flag with a stub ad) — about 7 files; sub-phase B = `next.config.ts` CSP headers + `src/app/layout.tsx` base-script loader + docs-sync, once the CMP/ad-network domains are confirmed — about 4 files.

Both splits should be recorded in that phase's own `progress.md` when it is created, per CLAUDE.md "Phases"; the roadmap itself does not need to enumerate them (it correctly defers phase-level planning), but it should say explicitly that Phase 0 and Phase 1 each need at least two sub-phases, not leave that to be discovered mid-phase. **Add one sentence to each phase's "Scope and files" intro stating this.**

### Claim 3: CSP sequencing risk between Phase 0 and Phase 1
Confirmed as a real risk and already flagged correctly by the roadmap at two points (Phase 1's scope: "cannot be finalized until then"; Risks: "sequence dependency, not a parallelizable pair"). Verified `next.config.ts:1-35` has no `headers()` today, so there is no existing CSP to conflict with — the risk is purely that Phase 1 cannot write its CSP domain list until Phase 0's CMP vendor is chosen. No gap found in how the roadmap handles this.

One related design risk not yet flagged: Phase 0 proposes a standalone `consent-choice.store.ts` to persist the player's consent choice (granted/denied, timestamp, TCF string). If the chosen CMP is Google Funding Choices, the CMP itself already owns and persists the canonical TCF consent string (via `__tcfapi`/its own storage), and a second, independently-written app store risks becoming a stale or conflicting second source of truth for the same decision (DRY). **Add to Phase 0's open questions**: whether `consent-choice.store.ts` is a thin reader of the CMP's own consent signal (recommended) or an independent store, before that phase's plan.md writes its contract.

### Other findings
- Naming: `consent-choice.store.ts` doesn't match any file suffix in the `component-architecture` skill's table (`.tsx/.hook.ts/.styles.ts/.map.ts/.types.ts/.fixtures.ts/.service.ts/.reducer.ts`). Precedent in the repo (`src/modules/shared/board-background-store.ts`) uses a hyphenated flat-file name, not a dotted suffix. Trivial, folded in: rename to `consent-choice-store.ts` (or just decide the `.service.ts` route, since it is I/O) when Phase 0's plan.md is written.
- Everything else (module boundaries, `src/modules/consent` / `src/modules/ads` as new domains rather than folded into `session`/`lobby`, no analytics SDK in Phase 2, Phase 3 left as planning-only, `LEGACY_PATHS` untouched) is consistent with `component-architecture` and `kiss-dry-solid`. No reuse opportunity missed: grep confirms no existing ads/consent code to build on.

VERDICT: CHANGES REQUESTED
- Blocking: fix the Google CMP ID (280 → 300, or remove the specific number) before this roadmap is used to seed Phase 0's plan.md.
- Blocking: state explicitly in Phase 0 and Phase 1 that each needs at least two sub-phases in its own `progress.md` (file counts given above).
- Non-blocking, carry into Phase 0's plan.md: the account-deletion scope must also cover player data embedded in non-uid-keyed `games/*` documents, not just `accounts`/`usernames`; and the consent-store vs. CMP-signal duplication question above.
- Non-blocking, fold in: `consent-choice.store.ts` naming; re-verify all line numbers fresh when each phase's plan.md is written (this roadmap's numbers have already drifted).
