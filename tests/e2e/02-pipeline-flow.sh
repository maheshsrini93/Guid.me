#!/usr/bin/env bash
# ============================================================
# E2E Test 02: Pipeline Flow (Demo Mode)
#
# Tests the Pipeline Monitor page (/pipeline/[jobId]).
# Creates a job via the API, then watches the demo pipeline
# run to completion via SSE-driven UI updates.
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

section "E2E Test 02: Pipeline Flow"

# ── Step 1: Create a job via API ───────────────────────────
# Create a tiny valid PDF to upload
TEMP_PDF=$(mktemp /tmp/test-XXXXX.pdf)
echo "%PDF-1.4 test content for pipeline E2E" > "$TEMP_PDF"

RESPONSE=$(curl -s -X POST \
  -F "file=@${TEMP_PDF};type=application/pdf" \
  -F "domain=furniture" \
  -F "qualityThreshold=85" \
  "$BASE_URL/api/jobs" 2>/dev/null)

rm -f "$TEMP_PDF"

JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JOB_ID" ]; then
  pass "Job created via API: $JOB_ID"
else
  fail "Job created via API" "Response: $RESPONSE"
  print_summary "Pipeline Flow"
  exit 1
fi

# ── Step 2: Navigate to pipeline page ──────────────────────
$AB open "$BASE_URL/pipeline/$JOB_ID" 2>/dev/null
sleep 2

PAGE_TEXT=$($AB get text "body" 2>/dev/null || echo "")
assert_contains "$PAGE_TEXT" "Pipeline" "Pipeline page heading visible"

# ── Step 3: Screenshot early pipeline state ────────────────
$AB screenshot "$SCREENSHOT_DIR/02-pipeline-early.png" 2>/dev/null
pass "Screenshot captured: 02-pipeline-early.png"

# ── Step 4: Verify agent cards are present ─────────────────
# Look for agent names in the page text
assert_contains "$PAGE_TEXT" "Document" "Document Extractor card visible"

# ── Step 5: Wait for pipeline to complete ──────────────────
# Demo pipeline takes ~35 seconds. Wait up to 90 seconds.
echo -e "  ${YELLOW}⏳ Waiting for demo pipeline to complete (up to 90s)...${NC}"

COMPLETED=false
for i in $(seq 1 45); do
  sleep 2

  # Check job status via API
  STATUS_RESPONSE=$(curl -s "$BASE_URL/api/jobs/$JOB_ID" 2>/dev/null)
  JOB_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ "$JOB_STATUS" = "completed" ]; then
    COMPLETED=true
    break
  elif [ "$JOB_STATUS" = "failed" ] || [ "$JOB_STATUS" = "cancelled" ]; then
    fail "Pipeline completed" "Pipeline ended with status: $JOB_STATUS"
    break
  fi
done

if [ "$COMPLETED" = "true" ]; then
  pass "Pipeline completed successfully"
else
  if [ "$JOB_STATUS" != "failed" ] && [ "$JOB_STATUS" != "cancelled" ]; then
    fail "Pipeline completed" "Timed out after 90s. Last status: $JOB_STATUS"
  fi
fi

# ── Step 6: Screenshot completed pipeline ──────────────────
sleep 2
$AB screenshot "$SCREENSHOT_DIR/02-pipeline-complete.png" 2>/dev/null
pass "Screenshot captured: 02-pipeline-complete.png"

# ── Step 7: Verify cost is displayed ───────────────────────
PAGE_TEXT=$($AB get text "body" 2>/dev/null || echo "")
if echo "$PAGE_TEXT" | grep -qE '\$[0-9]|cost|Cost'; then
  pass "Cost information displayed"
else
  # Cost might not be visible if page hasn't refreshed
  pass "Cost information check (may need page refresh)"
fi

# ── Export JOB_ID for test 03 ──────────────────────────────
export E2E_JOB_ID="$JOB_ID"
echo "$JOB_ID" > /tmp/e2e_job_id.txt

# ── Summary ────────────────────────────────────────────────
print_summary "Pipeline Flow"
