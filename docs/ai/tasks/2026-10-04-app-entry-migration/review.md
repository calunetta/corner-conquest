# Final review: App entry points migration, phase 2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit`)
- `npm run lint`: clean, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` — no output
- `npm test`: `Test Suites: 2 failed, 173 passed, 175 total` / `Tests: 1796 passed, 1796 total` — the 2 failed suites are `.agents/skills/caveman-learn/tests/skill-file.test.mjs` and `.agents/skills/caveman-explore/tests/skill-file.test.mjs` ("must contain at least one test"), pre-existing, unrelated to `src/modules/session` or `src/app`, untouched by this task's diff
- ui-verify: screenshots at `test-results/ui-verify/home--desktop.png`, `home--mobile.png`, `login-filled.png` — Login card renders with gradient title, compass icon, Commander Name input, Enter Lobby button; focus ring visible on the input in `login-filled.png`; no layout break on mobile
- e2e (`e2e/auth-and-lobby.spec.ts`): not run — no Java 21 installed, logged in `progress.md`

## Plan adherence
- `Login` extracted from `src/app/page.tsx` into `src/modules/session/components/Login/{Login.types.ts,Login.hook.ts,Login.styles.ts,Login.tsx,index.ts}`, split into connected `Login` (`src/modules/session/components/Login/Login.tsx:96-98`) and pure `LoginView` (`:23-93`) — met.
- `src/app/page.tsx` is a thin router: `Home` (`src/app/page.tsx:8-31`) renders `<Login />`, `<Lobby />` or `<GameBoard />`; no business logic left. Markup for the `GameBoard`/`Lobby` branch unchanged (diff shows only import and `Login` function removal) — met.
- `src/app/layout.tsx` unchanged except delisting and one unplanned-but-logged fix: manual Google Fonts `<link>` tags removed (`@next/next/no-page-custom-font` rule, confirmed present at `node_modules/@next/eslint-plugin-next/dist/rules/no-page-custom-font.js`) — no behavior change, `next/font`'s `outfit.className`/`.variable` already self-host the font. Logged in `progress.md`'s Log section — met.
- `eslint.config.mjs`: `'src/app/page.tsx'`, `'src/app/layout.tsx'` removed from `LEGACY_PATHS` (diff confirmed, two lines removed) — met.
- Markup byte-for-byte preserved: `Login.tsx`'s JSX and `Login.styles.ts`'s class strings match the deleted `src/app/page.tsx` `Login` function class-for-class (verified against `git diff`'s removed hunk); `id="username"`, `data-hydrated={isHydrated ? 'true' : undefined}`, "Enter Lobby", "Username Taken", "OK" text all present unchanged.
- `npm run typecheck`, `npm run lint`, `npm test` pass (see Checks run). `e2e/auth-and-lobby.spec.ts` not run (Java 21 missing) — same gap logged honestly rather than silently skipped.
- `docs/ai/refactor.md` row #11: still `pending` (`docs/ai/refactor.md:40`) — correct at this point, phase 2 is not yet committed. Per this task's own phase-1 precedent (commit `10dc4b8` then a separate `docs(app-entry): record phase 1 commit hash` commit `4cfd509`), updating row #11 to `done` with the phase-2 hash happens after this review's commit, not before.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `docs/ai/refactor.md:40` | Row #11 still `pending`; needs a follow-up commit with the phase-2 hash(es) once this phase is committed, matching the phase-1 pattern (`4cfd509`). | coordinator (post-commit) | No — expected at this stage, not a defect |
| 2 | `src/docs/README.md:59` | Stale duplicate of `docs/README.md`'s old Visual Parity Rule text, still says `src/app/page.tsx` only (no `Login.tsx` mention); last touched in an unrelated old commit (`d79fd38`), not part of this task's File plan or diff. | out of scope | No — pre-existing drift, unrelated to this task |

## Docs
- `docs/README.md:50`: updated — Visual Parity Rule note now reads "(`src/app/page.tsx` renders `src/modules/session/components/Login/Login.tsx`)", confirmed in diff.
- `.claude/skills/ui-design/SKILL.md:14`: updated — hero-text citation now points at `src/modules/session/components/Login/Login.tsx`, confirmed in diff.
- `docs/ai/lessons-learned.md`: two new entries added (quote-anchored grep miss; `LEGACY_PATHS` delisting surfacing silent violations) — relevant precedent, not required by this phase's own File plan but a reasonable addition; not re-verified here since it documents phase-1 findings already reviewed.
