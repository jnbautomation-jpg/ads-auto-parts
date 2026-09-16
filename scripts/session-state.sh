#!/usr/bin/env bash
# Printed into context at the start of every session by the SessionStart hook in
# .claude/settings.json, so a new chat opens already knowing where the work is.
#
# The split matters. Everything ABOVE the STATE.md dump is derived live from git
# and GitHub, because those are the facts that rot: the CHANGELOG header sat for
# two days claiming "Two PRs open: #18, #19" after both had merged and none were
# open. Anything a command can answer is answered by a command. STATE.md carries
# only the narrative — who owes what, and why — which does not go stale on its
# own.
#
# Never fails the session. Every lookup is guarded: no network, no `gh`, no repo,
# and this still prints something useful and exits 0. The hook also caps it with
# its own `timeout`, which is what bounds a hung `gh` — this Mac has no
# `timeout` binary to wrap it with.

set -uo pipefail

# Resolve the repo from the script's own location, not the caller's cwd, so this
# works the same from a worktree or an editor that starts elsewhere.
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/.." && pwd)"
cd "$root" 2>/dev/null || exit 0

echo "=== ADS Auto Parts — session state ($(date '+%a %d %b %Y, %H:%M')) ==="
echo

branch="$(git branch --show-current 2>/dev/null || echo '(unknown)')"
echo "Branch: ${branch:-(detached)}"

# Local refs only — deliberately no `git fetch`. A fetch on every session start
# is a network round trip for a fact that is almost always unchanged, and it is
# the one call here that could be slow on a bad connection.
echo "main:   $(git log --oneline -1 origin/main 2>/dev/null || echo 'unknown — run git fetch')"

if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "Working tree: UNCOMMITTED CHANGES"
  git status --short 2>/dev/null | head -10 | sed 's/^/  /'
else
  echo "Working tree: clean"
fi

echo
if command -v gh >/dev/null 2>&1; then
  prs="$(gh pr list --state open --json number,title \
          --jq '.[] | "  #\(.number)  \(.title)"' 2>/dev/null)"
  if [ $? -eq 0 ]; then
    if [ -n "$prs" ]; then
      echo "Open PRs:"
      echo "$prs"
    else
      echo "Open PRs: none"
    fi
  else
    echo "Open PRs: couldn't reach GitHub (offline, or gh not logged in)"
  fi
else
  echo "Open PRs: gh not installed"
fi

echo
if [ -f STATE.md ]; then
  cat STATE.md
else
  echo "STATE.md is missing — the narrative half of this lives there."
fi
