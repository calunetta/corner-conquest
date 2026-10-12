# Triage: bot Upgrade pre-check ignores canUseCard gate on Master Builder discount

Request: Fix bot-purchases.reducer.ts's Upgrade-cost pre-check, which reads `activeBot.masterBuilderActive` without gating on `canUseCard` (whether the bot already used a card this turn), unlike `handleUpgradeAction`'s actual cost calculation which does gate it — same bug shape as the Deploy bug fixed in docs/ai/tasks/2026-10-12-balance-simulator-vp-and-deploy-bugs.
Type: bug
Tier: S
Pipeline: tester-a implementer-a docs-sync
Overrides: tester-a=sonnet, implementer-a=sonnet

Phases: 1

## Why this tier
- Confirmed by direct code read (this session): `src/modules/game-rules/bot-purchases.reducer.ts:21-23` computes `upgradeCost` from `activeBot.masterBuilderActive` alone. `src/modules/game-rules/player-actions.reducer.ts:89-93` (`handleUpgradeAction`, the actual reducer the bot's action dispatches to) additionally requires `canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard)` before applying the discount.
- Mismatch scenario: if the bot used a special card earlier in the same turn (pushing `GameAction.UseCard` onto `actionsThisTurn`) and `masterBuilderActive` is true, the pre-check in `applyBotPurchases` still assumes the half-price discount and may pass `canAfford` at that lower cost, while `handleUpgradeAction` computes full cost (since `canUseCard` is false) and throws `Not enough wood` — a `reducerError` anomaly, same shape as the Deploy bug already fixed this week.
- Single file needs the fix (`bot-purchases.reducer.ts`); test goes in its existing sibling `bot-purchases.reducer.test.ts`, mirroring the existing Deploy repro pattern there. One layer (game-rules reducers), no UI, no Firestore shape change.
- Escalated tester-a and implementer-a to sonnet: game-rule reducer file, same risk class as the Deploy fix which also ran on sonnet.
- Per the flagging note, this was never confirmed reproducible by an actual test in the prior session — only by code-shape similarity. tester-a writes the failing repro first to confirm before implementer-a touches the fix.

## Scope
- In: `src/modules/game-rules/bot-purchases.reducer.ts` Upgrade-cost pre-check; its test file.
- Out: the Deploy fix (already shipped), any other bot-purchases cost pre-check not named here, UI/docs beyond behavior-accuracy sync if the fix changes documented bot behavior.

## Open questions
- none
