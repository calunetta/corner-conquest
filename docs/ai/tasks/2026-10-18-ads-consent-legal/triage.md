# Triage: Ads, consent and legal pages (epic)

Request: Add non-personalized ads on the lobby/home screen (feature flag, off by default), a consent banner (EEA/UK needs a TCF-certified CMP), and privacy policy and terms pages. Players may be minors.
Type: feature
Tier: XL
Pipeline: architect-a architect-b
Overrides: none
Phases: 4

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Four phases spanning new domains: legal pages (`src/app/`, new), consent (new `src/modules/consent/`), ads (new `src/modules/ads/`), and a payment feature (Phase 3).
- Layout impact: `src/app/page.tsx` is a single `h-screen overflow-hidden` shell; an ad slot changes the lobby layout.
- `src/app/layout.tsx` is shared by every route; the consent banner and any ad script load there.
- Data: Google sign-in via `src/lib/firebase.ts` and `src/modules/session/services/account.service.ts` stores uid and displayName; a deletion path is needed.
- Minors can play: personalized ads are off; the child-directed setting applies.
- Phase 3 needs business decisions (payment provider, price, tax handling) that the agents cannot make.

## Scope
- In: Phase 0 legal pages and consent banner (CMP). Phase 1 ads module, lobby-only, gated on consent and a flag. Phase 2 no added analytics; revenue tracked in the ad network's dashboard. Phase 3 planned only, blocked on decisions.
- Out: in-game board ads, chat, analytics SDKs, payment integration until decided, legal sign-off (a lawyer must review the drafts).

## Open questions
- Phase 3: payment provider, price, and merchant-of-record choice.
- Ad network account and publisher ID (needed before Phase 1 goes live).
- Consent banner: which TCF-certified CMP to use (a homemade banner does not satisfy AdSense in EEA/UK).
