# Final review: Persistent account system (Google sign-in), phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: pass, no errors (`tsc --noEmit`, clean output).
- `npm run lint`: pass, no errors (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, clean output).
- `npm run test:rules`: not run — no Java 21 runtime in this environment (`java -version` → "Unable to locate a Java Runtime"; `/usr/bin/java` is a stub). Verified the rules logic by hand instead (see Plan adherence below); the full test suite in `firestore.rules.test.ts` was traced case by case against `firestore.rules`.
- `npm test`: not required for Phase 1 (no `.ts`/`.tsx` app code changed, only config + rules + rules test).
- ui-verify: not applicable, no UI in this phase.

## Plan adherence
Diffed against `plan.md`'s Contracts section (lines 101-171) and File plan (lines 52-56).

- `src/lib/firebase.ts`: matches the contract exactly — `getAuth`, `GoogleAuthProvider`, `signInWithPopup`, `signOut`, `onAuthStateChanged`, `connectAuthEmulator` added, `auth` export added, emulator wiring mirrors the existing Firestore block (`src/lib/firebase.ts:49-55`).
- `firebase.json`: `auth` emulator block added at `127.0.0.1:9099`, matches the contract verbatim.
- `playwright.config.ts`: `AUTH_EMULATOR_HOST` constant, `--only firestore,auth`, `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` env var added to `webServer[1]` — matches contract.
- `firestore.rules`: matches the contract's intent with one accepted deviation, called out in the task context and confirmed sound by tracing: the update and delete rules use `resource.data.get('authUid', null) == null` / `request.resource.data.get('authUid', null) == null` instead of a plain `== null` comparison. Traced why this is necessary and correct: a plain `resource.data.authUid` read on a pre-existing guest doc that predates the `authUid` field (no such field written) errors during rule evaluation and denies the write — `firestore.rules.test.ts:202-209` and `:230-238` (legacy update/delete) would fail without `get()`'s default. `request.resource.data.get(...)` needs the same treatment for the same reason on the merged post-write document. The `create` rule correctly keeps the plain `request.resource.data.authUid == null` form (no `get()`) because every new write is required to carry the field explicitly by the "always explicit" decision (`plan.md:38`) — a create that omits it is correctly rejected (`firestore.rules.test.ts:71-79`), which is the intended behavior, not a bug.
- `accounts/{authUid}` collection: matches the contract verbatim (`allow create` scoped to the owning uid with `username is string`; `allow update`/`allow delete` both `false`).
- `firestore.rules.test.ts`: covers every case in the Test plan's Phase 1 bullet (`plan.md:348`) — guest create/update/delete unaffected, permanent-binding create with/without a prior `accounts` doc, update/delete always rejected for permanent bindings, `accounts` create only by the owning uid, `accounts` update/delete always rejected, plus extra coverage for the atomic `bindUsernameToAccount` batch and the legacy-doc edge cases.

Traced the rules by hand against every test in the diff (not executed, no Java 21):

- **Create (`usernames`)**: `playerId is string` required; `authUid == null` (guest) or `authUid is string && request.auth.uid == authUid && !exists(accounts/{uid})` (account, "pick once"). Confirmed each of the 7 create-path tests resolves correctly, including the numeric-`playerId` rejection and the no-`authUid`-field rejection (a missing key on a **create** write is intentionally rejected — every new doc must carry the field explicitly, per `plan.md:38`).
- **Update (`usernames`)**: both sides' `authUid` must resolve to `null` via `get(..., null)`, plus the existing same-`playerId` check. Confirmed: same-`playerId` guest update allowed; different-`playerId` guest update rejected; non-existent doc update rejected; promoting a guest doc to an account binding via update rejected (new `authUid` not null → `get()` returns non-null → denied); updating an existing permanent binding rejected even with an unchanged `playerId` (existing `authUid` not null → denied, by design — permanent bindings accept zero updates); legacy doc with no `authUid` field at all: `get()` returns the default `null` on both sides → allowed, matching today's guest behavior.
- **Delete (`usernames`)**: `get('authUid', null) == null`. Confirmed: guest delete allowed, legacy no-field doc delete allowed, permanent-binding delete rejected (verified the doc's data is unchanged after the rejected delete, matching the test's post-condition assertion).
- **`accounts`**: read unconditional; create scoped to `request.auth.uid == authUid` plus `username is string` (rejects no-field, non-string, and null `username`); update/delete unconditionally `false`.
- **Atomic bind batch**: traced that `writeBatch`'s two document writes are evaluated against the pre-commit snapshot, not against each other's in-flight state, so the `!exists(accounts/{uid})` check on the `usernames` write in a first-time bind correctly sees "no account yet" and succeeds; a second bind batch for an account that already has one fails on both the `accounts` document's `update: false` (since it already exists) and the `usernames` document's `!exists(...)` check, and because the batch is atomic, the whole thing is rejected and neither document's test assertion (`usernames/alice_second` absent) is violated. Binding a name a guest currently holds correctly routes through the `update` rule for that existing `usernames` doc (because the target doc already exists, Firestore evaluates the write as an update, not a create) and is rejected there since the new `authUid` isn't null, leaving the guest's reservation and no stray `accounts` doc behind.

All acceptance criteria relevant to Phase 1 (permanence enforced at the rules layer, guest path unchanged) are met by this diff; the remaining criteria (same `playerId`/username across sessions, scoped `logout`/`beforeunload`) are Phase 2/3 work, not yet in scope.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `firestore.rules.test.ts:198-201` | Comment above the legacy-update test says "REPRODUCTION (unverified ... Expected to fail until the rule reads it with `request.resource.data.get('authUid', null)`)" — but the rule in this same diff already reads it that way (`firestore.rules:25-27`), so the comment now describes a bug that is already fixed, not a pending reproduction. Misleading to a future reader who diffs this file without the full history. | tester-a | No — cosmetic, doesn't affect test correctness or the rule's behavior. |

No other findings. No invented paths or symbols in the diff.

## Docs
- `docs-sync`: not needed yet — this phase changes config and rules enforcement only; no documented game rule or architecture behavior changed (the `logout`/`beforeunload` behavior change that needs `structure-and-state.md` §3.1 is Phase 2). Scheduled correctly for Phase 4 per `plan.md:338-340`.
