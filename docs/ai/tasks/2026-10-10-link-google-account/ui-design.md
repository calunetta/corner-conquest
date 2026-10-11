# UI design: Link Google account from guest, Google logo on sign-in buttons

## Spec (ui-designer-a)

### Purpose and user story
As a guest player (anonymous Firebase Auth user), I want to link my current session to a Google account so that I can recover my commander identity on another device without losing my current uid, games, or stats.
As any player looking at a "Sign in with Google" button, I want to see the recognizable Google "G" mark so the action reads as trustworthy at a glance.

### Placement and layout

**New component 1 — `GoogleIcon`**
- Inline SVG, official four-color Google "G" mark (no wordmark), viewBox `0 0 18 18`, default rendered size 18×18 px, accepts a `className` for sizing overrides. Verified: no such asset exists today (`Glob 'public/**/*google*'` → none; `react-icons`/`FcGoogle` not in `package.json` dependencies).
- Used in two places: the existing Login "Sign in with Google" button, and the new `LinkGoogleAccountButton`.

**Change 1 — Login "Sign in with Google" button**
- File: `src/modules/session/components/Login/Login.tsx:66-74`, class `styles.googleButton` in `Login.styles.ts:18`.
- Desktop and mobile (same card at both sizes, `Login.styles.ts:3` `max-w-md`): add `<GoogleIcon className="h-4 w-4" />` before the text "Sign in with Google", with a horizontal gap between icon and label. The button keeps its current full-width, `variant="outline"` look; only its internal content gains a leading icon and `gap-2` (previously text-only, no flex gap needed).
- No new state: the button already has default/disabled (`isLoading`) states; the icon renders identically in both.

**New component 2 — `LinkGoogleAccountButton`**
- Path: `src/modules/session/components/LinkGoogleAccountButton/` (`.tsx`, `.hook.ts`, `.styles.ts`, `.types.ts`, `.fixtures.ts`, `.preview.tsx`, tests), matching the anatomy used by `Login` and `RejoinMatchPanel` (verified: `src/modules/lobby/components/RejoinMatchPanel/`).
- Placement, desktop (1280×720): inside `LobbyView`'s header-right area, `src/modules/lobby/components/Lobby/Lobby.tsx:39-47` (`styles.headerRight`). Insert it between the existing `playerInfo` block and the `Logout` button:
  `[Commander / Welcome, {username}!]  [Link Google Account]  [Logout]`
  Only rendered when `isGuest` is true (component is absent from the tree otherwise — not merely hidden — so no empty gap and no focus-order surprise for signed-in accounts).
- Placement, mobile (390×844): `Lobby.styles.ts:5` already stacks `headerContent` to `flex-col` below the `sm` breakpoint, so `headerLeft` (title/description) sits above `headerRight` (player info + buttons) on its own row, full width. Within `headerRight` (`flex items-center gap-3 self-end`), at widths below 640 px the row must not overflow or force horizontal scroll:
  - `LinkGoogleAccountButton` collapses to **icon-only**: `GoogleIcon` (20×20 px) inside a `size="icon"` ghost/outline button (44×44 px touch target, meets WCAG 2.5.5), `aria-label="Link your Google account"`. No visible text label on mobile.
  - `Logout` keeps its icon + "Logout" text (already short enough not to overflow).
  - `headerRight` gains `flex-wrap justify-end` so if the row still doesn't fit (e.g. very long username), it wraps to a second line instead of clipping or scrolling.
- This is a lobby-screen (not in-game) change, so the `MAP_COLS`×`MAP_ROWS` grid-visibility rule does not apply here; no map is on screen in the lobby.

**New component usage 3 — Error dialog**
- `LinkGoogleAccountButton` owns its own `AlertDialog` for the two failure states, following the exact pattern already in `Login.tsx:115-125` (reuse `AlertDialog`/`AlertDialogContent`/`AlertDialogHeader`/`AlertDialogTitle`/`AlertDialogDescription`/`AlertDialogFooter`/`AlertDialogAction`, `src/components/ui/alert-dialog.tsx`). This is the same visual pattern, not a second new one.

### States

| State | What the player sees | Trigger |
|---|---|---|
| Hidden | No button rendered in `headerRight` | `isGuest` is `false` (player already has a linked/permanent account) |
| Default (desktop) | Outline button, `GoogleIcon` + "Link Google Account" label, same visual weight as `Logout` | `isGuest` is `true`, idle |
| Default (mobile, <640px) | Icon-only outline/ghost button, `GoogleIcon` only, `aria-label="Link your Google account"` | `isGuest` is `true`, idle, viewport < 640 px |
| Loading | Button disabled; icon replaced by `Loader2` spinner (`animate-spin`, matches `Login.styles.ts:14` `loadingIcon`); label (desktop) becomes "Linking…" | Player clicked the button; `linkWithGoogle()` promise pending |
| Cancelled | Returns silently to Default; no dialog, no error | Google popup closed by the user, or a concurrent popup request was superseded (Firebase `auth/popup-closed-by-user` / `auth/cancelled-popup-request`) |
| Error — account already in use | `AlertDialog` opens: title "Account Already Linked", body "This Google account is already linked to a different Corner Conquest profile. Sign out and sign in with that Google account instead, or link a different one." Single "OK" action closes it; button returns to Default. | `linkWithGoogle()` rejects with Firebase error code `auth/credential-already-in-use` |
| Error — generic failure | `AlertDialog` opens: title "Linking Failed", body "Could not link your Google account. Please try again." Single "OK" action. | `linkWithGoogle()` rejects with any other error |
| Success | Button unmounts (component is removed because `isGuest` becomes `false` once `player.hook.ts` reflects the now-linked account); no dialog, no toast — the button's disappearance from `headerRight` is the confirmation. | `linkWithGoogle()` resolves |

### Components and tokens
- Reuse: `Button` (`src/components/ui/button.tsx`, `variant="outline"` desktop / `size="icon"` mobile), `AlertDialog` family (`src/components/ui/alert-dialog.tsx`), `Loader2` from `lucide-react` (already imported in `Login.tsx:3` and `Lobby.tsx:7`).
- New: `GoogleIcon` (inline SVG component, no new visual pattern — it's a static icon like any `lucide-react` icon already used throughout).
- Tokens (all verified classes already in use elsewhere, no raw hex):
  - Button idle: `border-white/10 bg-black/40 text-foreground hover:bg-white/10` (matches `Login.styles.ts:18` `googleButton`, scaled down with `text-xs` to match `Lobby.styles.ts:18` `logoutButton` sizing since it sits next to Logout).
  - Button hover/disabled: existing `Button` component variants handle these; no custom override needed beyond the base classes above.
  - Dialog: no custom classes — `AlertDialogContent` etc. carry the existing dark-glass styling already seen on Login's dialog.
  - Focus ring: default `focus-visible:ring-2 focus-visible:ring-ring` from the `Button` primitive — no override.

### Copy
- Desktop button label: "Link Google Account"
- Mobile icon-only button `aria-label`: "Link your Google account"
- Loading label (desktop): "Linking…"
- Error dialog 1 — title: "Account Already Linked"; body: "This Google account is already linked to a different Corner Conquest profile. Sign out and sign in with that Google account instead, or link a different one."; action button: "OK"
- Error dialog 2 — title: "Linking Failed"; body: "Could not link your Google account. Please try again."; action button: "OK"
- Login button (unchanged text, icon added): "Sign in with Google"

### Interactions and motion
- Click/tap triggers `linkWithPopup` (service layer, not this spec's concern) — the button disables immediately and shows the spinner so a double-click cannot fire two concurrent popups.
- Keyboard: button is a standard `<button>` via the `Button` primitive — reachable by Tab, activates on Enter/Space, same as `Logout` next to it.
- Dialog open/close uses the existing `AlertDialog` (Radix) default transition — no custom motion. Respects `prefers-reduced-motion` the same way the rest of the app's Radix dialogs already do (no app-specific override exists to begin with — verified no `motion-reduce:` class is set on `AlertDialogContent` anywhere, so this introduces no new behavior).
- Spinner (`Loader2 animate-spin`) is decorative looping motion already used for every other loading state in this codebase (`Login.styles.ts:16`, `Lobby.tsx:67,106`); no reduced-motion variant exists for those today, so this stays consistent rather than inventing a new convention.

### Accessibility
- Desktop button: visible text label "Link Google Account" — no `aria-label` needed (text is the accessible name).
- Mobile icon-only button: `aria-label="Link your Google account"` (icon-only buttons must carry an aria-label per the project's accessibility rule) plus the icon itself gets `aria-hidden`.
- Button meets the 44×44 px touch-target minimum on mobile via `size="icon"` on the `Button` primitive (verified default icon-button sizing in `src/components/ui/button.tsx`; confirm exact class at implementation time).
- `GoogleIcon` is `aria-hidden="true"` wherever paired with visible text (Login button, desktop link button); when it is the sole content (mobile icon-only button) the button itself carries the `aria-label`, so the icon stays `aria-hidden` either way.
- Dialog: `AlertDialogTitle`/`AlertDialogDescription` give the dialog its accessible name/description automatically (Radix wiring already in place, same as Login's dialog). Focus moves into the dialog on open and returns to the trigger button on close, per Radix default behavior.
- Color is never the only signal: loading state changes both the icon (spinner) and the label text ("Linking…"); errors are communicated via dialog text, not color alone.
- Contrast: reusing `text-foreground` / `border-white/10` / `bg-black/40` tokens already verified ≥ 4.5:1 against the dark background by existing usage (`Login.styles.ts`, `Lobby.styles.ts`).

### Acceptance criteria
- [ ] At 1280×720, with a guest (anonymous) account, the Lobby header shows, left to right: commander info, "Link Google Account" button (outline, Google "G" icon + text), "Logout" button.
- [ ] At 1280×720, with a non-guest (already-linked) account, the Lobby header shows only commander info and "Logout" — no "Link Google Account" button present in the DOM.
- [ ] At 390×844, with a guest account, the header shows the icon-only Google-link button (no visible text) sized at least 44×44 px, next to "Logout"; the row does not overflow the viewport width or force horizontal scrolling.
- [ ] Clicking "Link Google Account" disables the button and shows a spinner (desktop label reads "Linking…") until the popup flow resolves.
- [ ] Simulating a `credential-already-in-use` rejection shows an `AlertDialog` titled "Account Already Linked" with the specified body text; clicking "OK" closes it and the button returns to its default enabled state.
- [ ] Simulating any other rejection shows an `AlertDialog` titled "Linking Failed" with the specified body text.
- [ ] Simulating a resolved `linkWithGoogle()` call (guest flips to non-guest) removes the button from the header with no dialog or toast shown.
- [ ] The existing Login page's "Sign in with Google" button (guest mode) renders the `GoogleIcon` immediately to the left of the "Sign in with Google" text, both at 1280×720 and 390×844.
- [ ] Keyboard-only: both the Login Google button and the Lobby Link-Google button are reachable via Tab and show a visible focus ring; Enter/Space activates them.

## Review (ui-designer-b)
VERDICT: APPROVED
- Placement, states, copy, tokens and mobile collapse all verified against existing files (`Login.tsx`, `Login.styles.ts`, `Lobby.tsx`, `Lobby.styles.ts`, `RejoinMatchPanel`); no invented primitives beyond the one new `GoogleIcon` pattern, which is the single allowed new pattern for this feature.
- Mobile icon-only collapse at <640px is the right call: three elements (commander info + two buttons) in a ~358px-wide row would otherwise overflow; `flex-wrap justify-end` is a reasonable safety net and doesn't conflict with any existing `Lobby.styles.ts` class.
- Cancelled-popup state (silent return to Default, no dialog) is correct and matches how Firebase's own popup-closed/cancelled-request codes are conventionally treated as non-errors; this is a case the triage's error-handling note didn't explicitly cover but the spec needed to disambiguate from the two listed failure dialogs.
- Error copy distinguishes "already in use" from generic failure, satisfying the triage requirement that `auth/credential-already-in-use` be surfaced, not swallowed.
- Acceptance criteria are each independently screenshot/test-checkable (presence/absence of the button, dialog title+body, button state transitions, icon placement).
- Accessibility section correctly flags the icon-only mobile button's required `aria-label` and ties contrast/touch-target claims to already-verified tokens rather than new ones.

## Final spec
The "Spec (ui-designer-a)" section above is approved as written and is the final spec for this feature.
