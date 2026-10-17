# Triage: Player avatar selection from built-in Human Avatars

Request: Let each player pick one of the 25 built-in human avatars (`public/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_01.png` … `Avatars_25.png`, 256x256 PNG, currently unused), shown in the match lobby, the in-game HUD (PlayerInfo) and the victory dialog. Each avatar has a stable id; Firestore stores only the id, the client maps it to the bundled image.
Type: feature
Tier: L
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet, preview-a=sonnet, preview-b=sonnet
Phases: 3

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Firestore shape change: `Player` (`src/lib/types/player.ts:19`) gains an avatar id field, and the account document `accounts/{uid}` (`src/modules/session/services/account.service.ts:87`) gains a preference field. Both are written from more than one path.
- Cross-module: `src/lib/types`, `src/modules/session` (account + player join), `src/modules/lobby/components/LobbyGameRow/LobbyGameRow.tsx:75` (first-letter fallback to replace), `src/modules/hud/components/PlayerInfo/PlayerInfo.tsx:38` (`spriteSrc` avatar), `src/modules/session/components/VictoryDialog/VictoryDialog.tsx:52` (winner avatar).
- Visible UI: yes (new selection control and new avatar rendering in three places) → ui-designer pair before the architects.
- Gameplay: no. No rule, number, card, monster or bot change → no game-designer pair.
- Data signal and risk signal: a new per-match field must be readable by every client (lobby and victory show other players' avatars), so it has to live on the match `Player` entry, not only on the account. Firestore rules may need to allow the new fields; `firestore.rules` is in scope only for field validation of the avatar id.
- Monster portraits in `public/tiny-swords/Enemy Pack/*/*_Avatar.png` are not player avatars and are excluded.
- Verified no existing avatar-selection, avatar-id or player-avatar catalog code: grep for `avatar` in `src` hits only the Radix `src/components/ui/avatar.tsx` primitive and the three view files above.
- `docs-sync` is mandatory: a `Player` shape change is documented in `docs/architecture/structure-and-state.md` and the lobby/HUD/victory behavior in `docs/architecture/systems-and-visuals.md`.

## Scope
- In:
  - Static catalog in `src/modules/avatars/` mapping stable ids (e.g. `human-01` … `human-25`) to the bundled image paths. Only the id is persisted.
  - Avatar picker in the lobby (create/join flow) with a default for players who pick none.
  - Persist the chosen id on the match `Player` entry (`avatarId`) so every client sees it, and as the preferred id on `accounts/{uid}` for logged-in users.
  - Render the avatar in `LobbyGameRow`, `PlayerInfo` and `VictoryDialog`, with the current color ring kept and the first-letter fallback used only when no id is set.
  - Validation of the id in `firestore.rules` (allow-list of known ids) and rule tests.
  - Testbed previews for the picker and the three avatar renderings.
- Out:
  - Purchasable special avatars (e.g. seasonal/Christmas): deferred to a later task; the catalog gets a `locked`/`price` slot only if architect-a decides it costs nothing now.
  - User uploads of any kind.
  - Monster portraits (`Enemy Pack/*_Avatar.png`).
  - Any change to game rules, combat, bots or `GameState` beyond the new `Player` field.
  - The account link/identity flow itself (`2026-10-09-games-identity-rules`, `2026-10-09-persistent-account-auth`); this task only adds a field and reads it.

## Open questions
- Persistence split (recommended, confirm before Phase 1): the chosen id is saved on the account (`accounts/{uid}.avatarId`) as the default, and copied onto the match `Player.avatarId` when the player joins, so other players can render it. Guests have no account yet: they choose per match only. Confirm this split, or tell me to store it only on the match entry.
- Guest identity: the identity task (`2026-10-09-games-identity-rules`) is still in Phase 2. If anonymous auth changes `playerId`, the `accounts/{uid}` key moves with it. architect-a should read that task's `progress.md` before Phase 1 and build the account write behind the existing account service so the key change does not leak into the UI.
- Default avatar for a player who picks none: a deterministic default (e.g. the avatar that matches the seat index) versus the current color sprite. Recommended: keep the color sprite as the fallback in HUD/victory, first letter in lobby, so existing matches render unchanged.
