# Triage: <title>

Request: <one-line restatement of what the user asked>
Type: <feature | component | bug | refactor | gameplay | chore>
Tier: <XS | S | M | L | XL>
Pipeline: <agent names in run order, space-separated, e.g. architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review>
Overrides: <agent=model pairs, e.g. implementer-a=sonnet, or none>
Phases: <number>

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- <evidence: files and layers touched, each path verified>
- <gameplay impact? visible UI? Firestore writes or data model? risk?>

## Scope
- In: <what this task changes>
- Out: <what it deliberately leaves alone>

## Open questions
- <questions for the user, or none>
