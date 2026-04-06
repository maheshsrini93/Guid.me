#!/usr/bin/env bash
# ============================================================
# E2E Test Helpers
#
# Provides assertion functions and shared setup for all E2E tests.
# Source this file at the top of each test script.
# ============================================================

set -uo pipefail
# NOTE: We intentionally do NOT use `set -e` because our assertion functions
# handle errors gracefully. With -e, a single failed command would abort the
# entire test suite instead of continuing to run remaining checks.

BASE_URL="${BASE_URL:-http://localhost:3000}"
AB="npx agent-browser"
PASS_COUNT=0
FAIL_COUNT=0
SCREENSHOT_DIR="tests/e2e/screenshots"

mkdir -p "$SCREENSHOT_DIR"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================
# Assertions
# ============================================================

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo -e "  ${GREEN}✓${NC} $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo -e "  ${RED}✗${NC} $1"
  echo -e "    ${RED}$2${NC}"
}

assert_contains() {
  local actual="$1"
  local expected="$2"
  local message="$3"

  if echo "$actual" | grep -qi "$expected"; then
    pass "$message"
  else
    fail "$message" "Expected to contain '$expected', got: '${actual:0:200}'"
  fi
}

assert_not_empty() {
  local actual="$1"
  local message="$2"

  if [ -n "$actual" ]; then
    pass "$message"
  else
    fail "$message" "Expected non-empty value"
  fi
}

assert_equals() {
  local actual="$1"
  local expected="$2"
  local message="$3"

  if [ "$actual" = "$expected" ]; then
    pass "$message"
  else
    fail "$message" "Expected '$expected', got '$actual'"
  fi
}

assert_matches() {
  local actual="$1"
  local pattern="$2"
  local message="$3"

  if echo "$actual" | grep -qE "$pattern"; then
    pass "$message"
  else
    fail "$message" "Expected to match '$pattern', got: '${actual:0:200}'"
  fi
}

# ============================================================
# Helpers
# ============================================================

section() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${NC}"
}

# Wait for text to appear on page (polls up to N seconds)
wait_for_text() {
  local text="$1"
  local timeout="${2:-30}"
  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    local page_text
    page_text=$($AB get text "body" 2>/dev/null || echo "")
    if echo "$page_text" | grep -qi "$text"; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

# Wait for URL to contain a substring
wait_for_url() {
  local pattern="$1"
  local timeout="${2:-15}"
  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    local url
    url=$($AB get url 2>/dev/null || echo "")
    if echo "$url" | grep -q "$pattern"; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

# Print summary at end of test file
print_summary() {
  local test_name="$1"
  echo ""
  echo -e "${CYAN}━━━ Summary: $test_name ━━━${NC}"
  echo -e "  ${GREEN}Passed: $PASS_COUNT${NC}"
  if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "  ${RED}Failed: $FAIL_COUNT${NC}"
  fi
  echo ""
}
