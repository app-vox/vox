#!/usr/bin/env bash
set -euo pipefail

# Posts (or updates) a CI summary comment on a pull request.
# Required env vars: REPO, PR_NUMBER, RUN_NUMBER, RUN_URL,
#   TYPECHECK_OUTCOME, LINT_OUTCOME, TEST_OUTCOME, BUILD_OUTCOME

status_icon() {
  case "$1" in
    success) echo "✅ Passed" ;;
    failure) echo "❌ Failed" ;;
    *) echo "⏭️ Skipped" ;;
  esac
}

TYPECHECK=$(status_icon "$TYPECHECK_OUTCOME")
LINT=$(status_icon "$LINT_OUTCOME")
TEST=$(status_icon "$TEST_OUTCOME")
BUILD=$(status_icon "$BUILD_OUTCOME")

MARKER="<!-- ci-summary -->"

BODY="${MARKER}
## CI Summary

| Check | Status |
|-------|--------|
| Typecheck | ${TYPECHECK} |
| Lint | ${LINT} |
| Test | ${TEST} |
| Build | ${BUILD} |

*[Run #${RUN_NUMBER}](${RUN_URL})*"

# Find existing summary comment
COMMENT_ID=$(gh api "repos/${REPO}/issues/${PR_NUMBER}/comments" \
  --jq ".[] | select(.body | contains(\"${MARKER}\")) | .id" | head -1)

if [ -n "$COMMENT_ID" ]; then
  gh api "repos/${REPO}/issues/${PR_NUMBER}/comments/${COMMENT_ID}" \
    -X PATCH -f body="${BODY}"
else
  gh pr comment "${PR_NUMBER}" --repo "${REPO}" --body "${BODY}"
fi
