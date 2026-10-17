# Player Avatars

Part of the architecture & game-rules docs. Index and directives: [`docs/README.md`](../README.md). Persistence rules (`accounts/{uid}.avatarId`, guests, `firestore.rules`) are in §3.1 ("Avatar").

## 6.16. Player Avatars (`src/modules/avatars/`)

- **Catalog (`avatar-catalog.ts`):** 25 built-in human avatars with ids `human-01` to `human-25` (`AVATAR_IDS`). Each id maps to `/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_NN.png` (`AVATAR_CATALOG`, `AVATAR_OPTIONS`). Only the id is stored. `isValidAvatarId` checks membership. `toAvatarSrc(avatarId, fallbackSrc)` returns the catalog image for a valid id and the caller's fallback otherwise. The id list in `firestore.rules` (`isKnownAvatarId`) must match `AVATAR_IDS`.
- **Lobby header control (`AvatarPickerButton`):** mounted in the Lobby header (`src/modules/lobby/components/Lobby/Lobby.tsx`), beside the commander greeting. The trigger shows the chosen avatar's thumbnail, or a users icon when none is chosen. Its text reads "Change Avatar" from the `sm` breakpoint up; below that only the icon shows, with a screen-reader label.
- **Picker dialog:** a grid of the 25 avatars. Clicking one saves it through `usePlayer().setAvatarId`. The clicked cell shows a spinner while the save runs, and "Done" is disabled during the save. If the save fails, the dialog stays open and shows "Couldn't save your avatar. Try again." (`AvatarPickerButton.hook.ts`).
- **Lobby rows (`LobbyGameRow`):** each player's circle shows the avatar image inside the player's color ring. A player with no `avatarId` shows the first letter of their name on their color (`toPlayerAvatars` in `LobbyGameRow.map.ts` returns `avatarSrc: null`).
- **HUD (`PlayerInfo`) and victory dialog (`VictoryDialog`):** show the avatar image inside the color ring. With no avatar set they show the color's idle sprite, as before (`PlayerInfo.map.ts`, `VictoryDialog.map.ts`, `toPlayerIdleSprite`).
- **Source of the id:** the creator's and a joiner's avatar id from `usePlayer` is passed into the match when the game is created (`initializeGame`) or joined (`joinOpenGame`, `Lobby.hook.ts`), and stored on that player's `Player.avatarId`. Bots are created without one.
