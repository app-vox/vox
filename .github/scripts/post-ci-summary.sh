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

# Find existing summary comment via GraphQL (avoids REST /issues/ 404 on private repos)
COMMENT_NODE_ID=$(gh api graphql -f query='
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        comments(first: 100) {
          nodes { id body }
        }
      }
    }
  }
' -f owner="${REPO%/*}" -f name="${REPO#*/}" -F number="${PR_NUMBER}" \
  --jq ".data.repository.pullRequest.comments.nodes[] | select(.body | startswith(\"${MARKER}\")) | .id" \
  2>/dev/null | head -1) || true

if [ -n "$COMMENT_NODE_ID" ]; then
  gh api graphql -f query='
    mutation($id: ID!, $body: String!) {
      updateIssueComment(input: {id: $id, body: $body}) {
        issueComment { id }
      }
    }
  ' -f id="$COMMENT_NODE_ID" -f body="$BODY" > /dev/null
else
  gh pr comment "${PR_NUMBER}" --repo "${REPO}" --body "${BODY}"
fi
