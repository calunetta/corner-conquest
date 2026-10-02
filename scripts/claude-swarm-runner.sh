#!/usr/bin/env bash
#
# claude-swarm-runner.sh - run a task's agent pipeline headlessly through the Claude CLI.
#
# Each stage is one `claude -p --agent <name>` process. The next stage starts only after the
# previous one ends with the DONE sentinel; BLOCKER, or no sentinel at all, stops the run.
# When a challenger (`<role>-b`) answers "VERDICT: CHANGES REQUESTED", its proposer
# (`<role>-a`) revises and the challenger reviews again, at most twice.
#
# A headless `--agent` session differs from a sub-agent spawned in an interactive session, so
# every stage also gets:
#   - the agent's `skills:` appended to its system prompt (`--agent` does not preload them);
#   - the `permissions.allow` rules of .claude/settings.json as --allowedTools (a headless run
#     in a workspace that was never opened interactively ignores project permissions).
#
# Usage:
#   scripts/claude-swarm-runner.sh [--dry-run] <task-folder> [stage ...]
#
#   <task-folder>  docs/ai/tasks/<date>-<slug>, containing triage.md
#   stage ...      agents to run in order; default: the Pipeline line of triage.md.
#                  Append ":final-review" to architect-b for the end-of-phase review.
#   --dry-run      print each stage's command without running it
#
# Environment:
#   SWARM_PERMISSION_MODE  permission mode for every stage (default: acceptEdits)
#   SWARM_MAX_TURNS        optional --max-turns for every stage
#   SWARM_MAX_BUDGET_USD   optional --max-budget-usd for every stage
#
# Exit codes: 0 every stage DONE, 1 usage or setup error, 2 BLOCKER, 3 no sentinel,
#             4 the Claude CLI failed, 5 changes still requested after the last round.
#
# Requires Claude Code 2.1.259 or later (--permission-prompts).

set -euo pipefail

readonly MIN_CLAUDE_VERSION='2.1.259'
readonly MAX_REVISION_ROUNDS=2
# Last non-blank line of a stage's report; tolerates surrounding spaces and **bold**.
readonly SENTINEL_PATTERN='^[[:space:]]*\*?\*?(DONE|BLOCKER)\*?\*?[[:space:]]*$'
readonly CHANGES_REQUESTED_PATTERN='VERDICT:?\**[[:space:]]*\**[[:space:]]*CHANGES REQUESTED'
# Credentials and endpoints the child CLI processes must inherit so they never stop at a login prompt.
readonly AUTH_ENV_VARS=(
  ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_BASE_URL
  CLAUDE_CONFIG_DIR CLAUDE_CODE_USE_BEDROCK CLAUDE_CODE_USE_VERTEX CLAUDE_CODE_USE_FOUNDRY
  HTTPS_PROXY HTTP_PROXY NO_PROXY NODE_EXTRA_CA_CERTS
)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$REPO_ROOT/.claude/agents"
SKILLS_DIR="$REPO_ROOT/.claude/skills"
SETTINGS_FILE="$REPO_ROOT/.claude/settings.json"
DRY_RUN=false
TASK_DIR=''
TRIAGE_FILE=''
STAGE_COUNTER=0
STAGE_REPORT=''
WORK_DIR=''

die() {
  echo "swarm: $*" >&2
  exit 1
}

# Prints the comment block at the top of this file.
usage() {
  awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print; next } NR > 2 { exit }' "${BASH_SOURCE[0]}"
}

version_at_least() {
  [[ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n 1)" == "$2" ]]
}

check_claude_cli() {
  command -v claude >/dev/null || die "the claude CLI is not on PATH."

  local version
  version="$(claude --version | grep -o -E '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)"
  version_at_least "$version" "$MIN_CLAUDE_VERSION" ||
    die "Claude Code $version is too old; $MIN_CLAUDE_VERSION or later is required (claude update)."

  claude auth status >/dev/null 2>&1 ||
    die "the Claude CLI is not authenticated. Run 'claude auth login' or export ANTHROPIC_API_KEY / CLAUDE_CODE_OAUTH_TOKEN."
}

forward_auth_env() {
  local var
  for var in "${AUTH_ENV_VARS[@]}"; do
    if [[ -n "${!var:-}" ]]; then export "${var?}"; fi
  done
}

# Value of a `key:` line in a markdown file's frontmatter.
frontmatter_value() {
  local file="$1" key="$2"
  awk -v key="$key" '
    NR == 1 { if ($0 != "---") exit; next }
    $0 == "---" { exit }
    index($0, key ":") == 1 { sub("^" key ":[[:space:]]*", ""); print; exit }
  ' "$file"
}

# Items of a YAML list in a markdown file's frontmatter (`key:` followed by `  - item` lines).
frontmatter_list() {
  local file="$1" key="$2"
  awk -v key="$key" '
    NR == 1 { if ($0 != "---") exit; next }
    $0 == "---" { exit }
    $0 == key ":" { in_list = 1; next }
    in_list && /^[[:space:]]+-[[:space:]]+/ { sub(/^[[:space:]]+-[[:space:]]+/, ""); print; next }
    in_list { exit }
  ' "$file"
}

# A markdown file without its frontmatter block.
strip_frontmatter() {
  awk 'NR == 1 && $0 == "---" { in_frontmatter = 1; next } in_frontmatter && $0 == "---" { in_frontmatter = 0; next } !in_frontmatter' "$1"
}

# Writes the full text of the agent's `skills:` into one file, as interactive sub-agents get them.
write_preloaded_skills() {
  local agent="$1" output_file="$2" skill skill_file
  : >"$output_file"
  while IFS= read -r skill; do
    skill_file="$SKILLS_DIR/$skill/SKILL.md"
    [[ -f "$skill_file" ]] || die "$agent lists skill '$skill', but $skill_file does not exist."
    printf '\n\n<preloaded-skill name="%s">\n' "$skill" >>"$output_file"
    strip_frontmatter "$skill_file" >>"$output_file"
    printf '</preloaded-skill>\n' >>"$output_file"
  done < <(frontmatter_list "$AGENTS_DIR/$agent.md" skills)
}

# The project's permissions.allow rules, one per line.
read_allowed_tools() {
  [[ -f "$SETTINGS_FILE" ]] || return 0
  node -e '
    const settings = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    for (const rule of settings.permissions?.allow ?? []) console.log(rule);
  ' "$SETTINGS_FILE"
}

# Text after "<label>:" on the first matching line of triage.md.
triage_field() {
  sed -n "s/^$1:[[:space:]]*//p" "$TRIAGE_FILE" | head -n 1
}

model_for() {
  local agent="$1" override
  override="$(triage_field Overrides | tr ' ,' '\n\n' | sed -n "s/^${agent}=//p" | head -n 1)"
  if [[ -n "$override" ]]; then
    echo "$override"
  else
    frontmatter_value "$AGENTS_DIR/$agent.md" model
  fi
}

# Prints DONE, BLOCKER, or nothing when the report's last non-blank line is not a sentinel.
read_sentinel() {
  local last_line
  last_line="$(grep -v -E '^[[:space:]]*$' "$1" | tail -n 1 || true)"
  if grep -q -i -E "$SENTINEL_PATTERN" <<<"$last_line"; then
    grep -o -i -E 'DONE|BLOCKER' <<<"$last_line" | head -n 1 | tr '[:lower:]' '[:upper:]'
  fi
}

requests_changes() {
  grep -q -i -E "$CHANGES_REQUESTED_PATTERN" "$1"
}

build_prompt() {
  local agent="$1" mode="$2"
  echo "Task folder: ${TASK_DIR#"$REPO_ROOT"/}"
  echo "Stage: $agent   Mode: $mode"
  echo 'Phase: the first phase in progress.md that still has unticked boxes (phase 1 if progress.md does not exist yet).'
  if [[ "$mode" == 'revise' ]]; then
    echo "Address the latest review in the task folder that requests changes from you (VERDICT: CHANGES REQUESTED), then report."
  fi
  echo 'Do your stage as your instructions define it and end with DONE or BLOCKER.'
}

log_progress() {
  local progress_file="$TASK_DIR/progress.md"
  if [[ -f "$progress_file" ]] && ! $DRY_RUN; then
    printf -- '- %s %s: %s (headless run)\n' "$(date +%F)" "$1" "$2" >>"$progress_file"
  fi
}

# Runs one stage; sets STAGE_REPORT to the report file. Exits on BLOCKER, a missing sentinel or a CLI error.
run_stage() {
  local agent="$1" mode="$2"
  local label="$agent"
  if [[ "$mode" != 'default' ]]; then label="$agent:$mode"; fi

  STAGE_COUNTER=$((STAGE_COUNTER + 1))
  local stem
  stem="$(printf '%02d' "$STAGE_COUNTER")-${label//:/-}"
  STAGE_REPORT="$TASK_DIR/logs/$stem.md"
  local error_log="$TASK_DIR/logs/$stem.stderr.log"

  local model
  model="$(model_for "$agent")"
  [[ -n "$model" ]] || die "no model for $agent (missing 'model:' in $AGENTS_DIR/$agent.md)."

  local skills_file="$WORK_DIR/$stem.skills.md"
  write_preloaded_skills "$agent" "$skills_file"
  local allowed_tools=()
  mapfile -t allowed_tools < <(read_allowed_tools)

  local command=(claude -p --agent "$agent" --model "$model")
  [[ -s "$skills_file" ]] && command+=(--append-system-prompt-file "$skills_file")
  # --allowedTools takes several values, so another flag must follow it, never the prompt.
  ((${#allowed_tools[@]} > 0)) && command+=(--allowedTools "${allowed_tools[@]}")
  command+=(
    --permission-mode "${SWARM_PERMISSION_MODE:-acceptEdits}"
    --permission-prompts none
    --output-format text
  )
  [[ -n "${SWARM_MAX_TURNS:-}" ]] && command+=(--max-turns "$SWARM_MAX_TURNS")
  [[ -n "${SWARM_MAX_BUDGET_USD:-}" ]] && command+=(--max-budget-usd "$SWARM_MAX_BUDGET_USD")
  command+=("$(build_prompt "$agent" "$mode")")

  printf '[%02d] %-28s model=%-7s ' "$STAGE_COUNTER" "$label" "$model"

  if $DRY_RUN; then
    echo 'dry run'
    printf '     '
    printf '%q ' "${command[@]}"
    echo
    return 0
  fi

  mkdir -p "$TASK_DIR/logs"
  local status=0
  (cd "$REPO_ROOT" && "${command[@]}" </dev/null >"$STAGE_REPORT" 2>"$error_log") || status=$?
  if ((status != 0)); then
    echo "CLI FAILED (exit $status)"
    tail -n 20 "$error_log" >&2
    log_progress "$label" "CLI failed"
    exit 4
  fi

  local sentinel
  sentinel="$(read_sentinel "$STAGE_REPORT")"
  case "$sentinel" in
    DONE)
      echo "DONE   → ${STAGE_REPORT#"$REPO_ROOT"/}"
      log_progress "$label" DONE
      ;;
    BLOCKER)
      echo "BLOCKER → ${STAGE_REPORT#"$REPO_ROOT"/}"
      log_progress "$label" BLOCKER
      sed -n '/^## Blocker/,$p' "$STAGE_REPORT" >&2
      exit 2
      ;;
    *)
      echo "NO SENTINEL → ${STAGE_REPORT#"$REPO_ROOT"/}"
      log_progress "$label" 'no sentinel'
      tail -n 15 "$STAGE_REPORT" >&2
      exit 3
      ;;
  esac
}

# Runs a challenger; while it requests changes, the proposer revises and the challenger reviews again.
run_challenger() {
  local challenger="$1" mode="$2"
  local proposer="${challenger%-b}-a"
  local round=0

  run_stage "$challenger" "$mode"
  while ! $DRY_RUN && requests_changes "$STAGE_REPORT"; do
    if [[ "$mode" == 'final-review' ]]; then
      echo "swarm: final review requested changes; route them to their owners, then run the review again." >&2
      exit 5
    fi
    round=$((round + 1))
    if ((round > MAX_REVISION_ROUNDS)); then
      echo "swarm: $challenger still requests changes after $MAX_REVISION_ROUNDS rounds; a human decision is needed." >&2
      exit 5
    fi
    run_stage "$proposer" revise
    run_stage "$challenger" "$mode"
  done
}

main() {
  if [[ "${1:-}" == '--dry-run' ]]; then
    DRY_RUN=true
    shift
  fi
  if [[ $# -lt 1 || "$1" == '-h' || "$1" == '--help' ]]; then
    usage
    exit 1
  fi

  TASK_DIR="$(cd "$1" 2>/dev/null && pwd)" || die "task folder not found: $1"
  TRIAGE_FILE="$TASK_DIR/triage.md"
  [[ -f "$TRIAGE_FILE" ]] || die "missing $TRIAGE_FILE (run the triage skill first)."
  shift

  local stages=("$@")
  if [[ ${#stages[@]} -eq 0 ]]; then
    read -r -a stages <<<"$(triage_field Pipeline)"
  fi
  [[ ${#stages[@]} -gt 0 ]] || die "no stages: pass them as arguments or fill the Pipeline line of triage.md."

  local stage agent
  for stage in "${stages[@]}"; do
    agent="${stage%%:*}"
    [[ -f "$AGENTS_DIR/$agent.md" ]] || die "unknown agent '$agent' (no $AGENTS_DIR/$agent.md)."
  done

  if ! $DRY_RUN; then
    check_claude_cli
    forward_auth_env
  fi
  WORK_DIR="$(mktemp -d)"
  trap 'rm -rf "$WORK_DIR"' EXIT

  echo "swarm: ${TASK_DIR#"$REPO_ROOT"/} - ${#stages[@]} stage(s)"
  local mode
  for stage in "${stages[@]}"; do
    agent="${stage%%:*}"
    mode='default'
    [[ "$stage" == *:* ]] && mode="${stage#*:}"

    if [[ "$agent" == *-b ]]; then
      run_challenger "$agent" "$mode"
    else
      run_stage "$agent" "$mode"
    fi
  done

  if $DRY_RUN; then
    echo 'swarm: dry run complete, nothing was executed.'
  else
    echo 'swarm: every stage reported DONE. Review the diff and progress.md, then commit the phase.'
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
