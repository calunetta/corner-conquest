#!/usr/bin/env bash
#
# SessionStart hook. Plain-text stdout becomes context for Claude, so only the
# unfinished-task summary is printed there; tool output goes to stderr.
#
# Every session: list task phases with unticked boxes in docs/ai/tasks/*/progress.md.
# Cloud sessions only (CLAUDE_CODE_REMOTE=true):
#   - install npm dependencies at startup, or whenever node_modules is missing;
#   - point CHROMIUM_PATH at the preinstalled Chromium for the ui-verify script and e2e.

set -euo pipefail

readonly PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
readonly PREINSTALLED_CHROMIUM='/opt/pw-browsers/chromium'

hook_input=''
if [[ ! -t 0 ]]; then hook_input="$(cat)"; fi
session_source="$(sed -n 's/.*"source"[[:space:]]*:[[:space:]]*"\([a-z]*\)".*/\1/p' <<<"$hook_input")"

prepare_cloud_session() {
  if [[ "$session_source" == 'startup' || ! -d "$PROJECT_DIR/node_modules" ]]; then
    (cd "$PROJECT_DIR" && npm install --no-audit --no-fund >&2)
  fi

  if [[ -x "$PREINSTALLED_CHROMIUM" && -n "${CLAUDE_ENV_FILE:-}" ]]; then
    echo "export CHROMIUM_PATH=$PREINSTALLED_CHROMIUM" >>"$CLAUDE_ENV_FILE"
  fi
}

# "<task folder>: <phase heading> → next: <first unticked item>" for each unfinished task.
print_unfinished_tasks() {
  local progress_file next_step
  local lines=()
  shopt -s nullglob
  for progress_file in "$PROJECT_DIR"/docs/ai/tasks/*/progress.md; do
    next_step="$(awk '/^## / { heading = substr($0, 4) } /^- \[ \] / { print heading " → next: " substr($0, 7); exit }' "$progress_file")"
    if [[ -n "$next_step" ]]; then
      lines+=("- $(basename "$(dirname "$progress_file")"): $next_step")
    fi
  done

  if ((${#lines[@]} > 0)); then
    echo 'Unfinished AI tasks (resume with the swarm skill; details in each docs/ai/tasks/<folder>/progress.md):'
    printf '%s\n' "${lines[@]}"
  fi
}

if [[ "${CLAUDE_CODE_REMOTE:-}" == 'true' ]]; then
  prepare_cloud_session
fi
print_unfinished_tasks
