---
name: ci-cd-sync
description: Keep .github/workflows/ci-cd.yml in sync with package.json scripts, Node/Java versions, test setup, and Firebase deploy config. Use whenever a change touches test/build/deploy commands, adds a new required check, or changes how the app is deployed.
---

# CI/CD sync

`.github/workflows/ci-cd.yml` runs on every push to `main`: lint/typecheck, unit tests (incl. Firestore rules), Playwright e2e, build, then a Firebase App Hosting rollout. It is a second place, besides `package.json` and `CLAUDE.md`'s Commands table, that encodes "how this project is tested and shipped" — it drifts the same way the architecture docs do, and nothing else catches the drift.

## When this runs

Whenever a diff:
- Adds, renames, or removes an `npm run <script>` the workflow calls (`lint`, `typecheck`, `test`, `test:rules`, `test:e2e`, `build`), or adds a new one that should gate `main` (e.g. a new `test:integration`).
- Changes the Node or Java version the project needs (`package.json` engines, `.nvmrc`, a Playwright/Next upgrade that bumps the minimum, `firebase.json` emulator requirements).
- Adds, renames, or removes a `NEXT_PUBLIC_*` env var the build reads (grep `src/lib/firebase.ts` and any other `process.env.NEXT_PUBLIC_*` usage) — each one needs a matching `secrets.*` entry in the `build` job.
- Changes how the app is deployed: switches away from Firebase App Hosting, changes the backend ID, moves to `firebase deploy --only hosting`, or changes `apphosting.yaml`.
- Adds a new Firebase emulator (e.g. `functions`, `storage`) that a test suite now depends on.

Skip it when the diff doesn't change what gets run, built, or deployed — most feature/bugfix phases don't touch this file.

## How to do it

1. **Read the current workflow.** `.github/workflows/ci-cd.yml` has five jobs: `lint-and-typecheck`, `unit-tests`, `e2e-tests`, `build` (needs all three), `deploy` (needs `build`, App Hosting rollout via `firebase apphosting:rollouts:create`).
2. **Match jobs to `package.json` scripts, not the other way around.** If `npm run test:all` changes, or a script is renamed, update the corresponding `run:` step. Don't invent a new script name in the workflow that doesn't exist in `package.json`.
3. **Java only where an emulator runs.** `unit-tests` (for `test:rules`) and `e2e-tests` (Playwright's `webServer` starts the Firestore/Auth emulator) need `actions/setup-java`. A job that doesn't touch an emulator doesn't need it.
4. **New `NEXT_PUBLIC_*` var → two places.** Add it to `src/lib/firebase.ts` (or wherever it's read) and to the `build` job's `env:` block as `secrets.<NAME>`; tell the user to add the matching GitHub secret (you cannot create repo secrets yourself).
5. **Deploy target changes are high-blast-radius.** If App Hosting is replaced or the backend ID changes, update the `deploy` job's command and flag the change clearly to the user before it merges — this affects what goes live on every push to `main`.
6. **Verify before writing.** Don't cite a script, env var, or CLI flag you haven't confirmed in `package.json`, the source, or `firebase apphosting:rollouts:create --help`. Run the workflow mentally against `npm run test:all` and the Commands table in `CLAUDE.md` — they should describe the same checks.
7. **Keep `CLAUDE.md`'s Commands table in sync too** if a script name or purpose changed — same anti-drift reasoning as the workflow file itself.

## In the swarm pipeline

Not part of the standard agent-pair pipeline (`triage` → designers → architects → builders → `docs-sync`). Run it yourself, or via agent `ci-cd-maintainer`, as a small follow-up step whenever a phase's diff matches the "When this runs" list above — typically right after `docs-sync`, in the same phase, since both are "keep non-code artifacts true" passes over the same diff.
