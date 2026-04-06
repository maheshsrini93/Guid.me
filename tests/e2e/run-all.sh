#!/usr/bin/env bash
# ============================================================
# E2E Test Runner
#
# Orchestrates all E2E tests:
# 1. Starts the Next.js dev server with DEMO_MODE=true
# 2. Waits for it to be ready
# 3. Runs each test script in order
# 4. Shuts down the server
# 5. Prints overall summary
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║            Guid.me E2E Test Suite                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check if server is already running ─────────────────────
SERVER_PID=""
STARTED_SERVER=false

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null | grep -q "200\|304"; then
  echo -e "${YELLOW}▸ Dev server already running on port 3000${NC}"
else
  echo -e "${YELLOW}▸ Starting dev server with DEMO_MODE=true...${NC}"
  cd "$PROJECT_DIR"
  DEMO_MODE=true pnpm dev > /tmp/guid-e2e-server.log 2>&1 &
  SERVER_PID=$!
  STARTED_SERVER=true

  # Wait for server to be ready (up to 30 seconds)
  echo -n "  Waiting for server"
  for i in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:3000" 2>/dev/null; then
      echo -e " ${GREEN}ready!${NC}"
      break
    fi
    echo -n "."
    sleep 1
  done

  if ! curl -s -o /dev/null "http://localhost:3000" 2>/dev/null; then
    echo -e " ${RED}failed!${NC}"
    echo "Server failed to start. Check /tmp/guid-e2e-server.log"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
fi

# ── Run tests ──────────────────────────────────────────────
TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_TESTS=()

run_test() {
  local test_file="$1"
  local test_name="$(basename "$test_file" .sh)"

  echo ""
  echo -e "${BOLD}Running: $test_name${NC}"

  # Run the test and capture output
  local output
  set +e
  output=$(bash "$test_file" 2>&1)
  local exit_code=$?
  set -e

  echo "$output"

  # Count passes and fails from output
  local passes=$(echo "$output" | grep -c "✓" || true)
  local fails=$(echo "$output" | grep -c "✗" || true)

  TOTAL_PASS=$((TOTAL_PASS + passes))
  TOTAL_FAIL=$((TOTAL_FAIL + fails))

  if [ $fails -gt 0 ]; then
    FAILED_TESTS+=("$test_name")
  fi
}

run_test "$SCRIPT_DIR/01-upload-flow.sh"
run_test "$SCRIPT_DIR/02-pipeline-flow.sh"
run_test "$SCRIPT_DIR/03-output-flow.sh"

# ── Cleanup ────────────────────────────────────────────────
# Close any open browser sessions
npx agent-browser close --all 2>/dev/null || true

if [ "$STARTED_SERVER" = "true" ] && [ -n "$SERVER_PID" ]; then
  echo ""
  echo -e "${YELLOW}▸ Stopping dev server (PID: $SERVER_PID)${NC}"
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true
fi

# ── Overall Summary ────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║            E2E Test Results                          ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  ${GREEN}Passed: $TOTAL_PASS${NC}"
if [ $TOTAL_FAIL -gt 0 ]; then
  echo -e "  ${RED}Failed: $TOTAL_FAIL${NC}"
  echo -e "  ${RED}Failed tests: ${FAILED_TESTS[*]}${NC}"
else
  echo -e "  ${RED}Failed: 0${NC}"
fi

echo ""
echo -e "  Screenshots saved to: ${CYAN}tests/e2e/screenshots/${NC}"
echo ""

if [ $TOTAL_FAIL -gt 0 ]; then
  exit 1
fi
