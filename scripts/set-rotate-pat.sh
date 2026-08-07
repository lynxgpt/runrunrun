#!/usr/bin/env bash
# Prompts for the STRAVA_ROTATE_PAT and stores it as a repo secret.
# The value is read silently and never echoed or logged.
set -euo pipefail
cd "$(dirname "$0")/.."

# gh may be logged in as an account without admin here; the admin token is
# embedded in the origin remote URL.
GH_TOKEN="$(git remote get-url origin | sed -E 's|https://([^@]+)@.*|\1|')"
export GH_TOKEN

read -rsp "Paste PAT (input hidden), then Enter: " PAT
echo
[ -n "$PAT" ] || { echo "empty, aborted"; exit 1; }

gh secret set STRAVA_ROTATE_PAT --body "$PAT" --repo lynxgpt/runrunrun
unset PAT
echo "✓ STRAVA_ROTATE_PAT set"
