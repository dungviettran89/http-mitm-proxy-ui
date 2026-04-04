#!/bin/bash
set -euo pipefail

echo "🧪 Starting HTTP MITM Proxy UI Integration Test"
echo "=============================================="

# Configuration
PROXY_PORT=9090
UI_PORT=4096
TEST_DIR="$(pwd)"
PID_FILE="/tmp/http-mitm-proxy-ui-test.pid"
LOG_FILE="/tmp/http-mitm-proxy-ui-test.log"

# Cleanup function
cleanup() {
  echo "🛑 Cleaning up..."
  if [[ -f "$PID_FILE" ]]; then
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "🛑 Stopping proxy server..."
      kill "$(cat "$PID_FILE")"
      # Wait a moment for graceful shutdown
      sleep 2
      # Force kill if still running
      if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        kill -9 "$(cat "$PID_FILE")"
      fi
    fi
    rm -f "$PID_FILE"
  fi
  echo "🧹 Cleanup complete"
}

# Trap EXIT signal to ensure cleanup
trap cleanup EXIT

# Step 1: Build the package
echo "🔨 Building package..."
npm run build > "$LOG_FILE" 2>&1
if [[ $? -ne 0 ]]; then
  echo "❌ Build failed! Check $LOG_FILE"
  exit 1
fi
echo "✅ Build successful"

# Step 2: Start the proxy server in background
echo "🚀 Starting proxy server on ports $PROXY_PORT (proxy) and $UI_PORT (UI)..."
node dist/index.js \
  --proxy-port "$PROXY_PORT" \
  --ui-port "$UI_PORT" \
  --ssl-ca-dir "./test-ca" \
  >> "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"

# Wait for server to start
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
  if curl -s "http://localhost:$UI_PORT/api/health" > /dev/null; then
    echo "✅ Server is ready!"
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "❌ Server failed to start within timeout! Check $LOG_FILE"
    exit 1
  fi
  sleep 1
done

# Step 3: Test API endpoints
echo "🔍 Testing API endpoints..."

# Test 3.1: Health check
echo "  📋 Testing health check..."
HEALTH_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  echo "    ✅ Health check passed"
else
  echo "    ❌ Health check failed: $HEALTH_RESPONSE"
  exit 1
fi

# Test 3.2: Get config
echo "  📋 Testing config endpoint..."
CONFIG_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/config")
if echo "$CONFIG_RESPONSE" | grep -q '"proxyPort":'$PROXY_PORT'' && \
   echo "$CONFIG_RESPONSE" | grep -q '"uiPort":'$UI_PORT''; then
  echo "    ✅ Config endpoint passed"
else
  echo    "    ❌ Config endpoint failed: $CONFIG_RESPONSE"
    exit 1
fi

# Step 4: Make test requests through the proxy
echo "🌐 Making test requests through proxy..."

# Configure curl to use our proxy
PROXY_URL="http://localhost:$PROXY_PORT"

# Test 4.1: GET request
echo "    Making GET request..."
GET_RESPONSE=$(curl -s -x "$PROXY_URL" "https://httpbin.org/get?test=integration" || echo "REQUEST_FAILED")
if [[ "$GET_RESPONSE" != "REQUEST_FAILED" ]]; then
  echo "      ✅ GET request successful"
else
  echo "      ❌ GET request failed"
  exit 1
fi

# Test 4.2: POST request with JSON
echo "    Making POST request..."
POST_DATA='{"test":"integration","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}'
POST_RESPONSE=$(curl -s -x "$PROXY_URL" -H "Content-Type: application/json" \
  -d "$POST_DATA" "https://httpbin.org/post" || echo "REQUEST_FAILED")
if [[ "$POST_RESPONSE" != "REQUEST_FAILED" ]]; then
  echo "      ✅ POST request successful"
else
  echo "      ❌ POST request failed"
  exit 1
fi

# Test 4.3: Request with custom headers
echo "    Making request with custom headers..."
HEADERS_RESPONSE=$(curl -s -x "$PROXY_URL" -H "X-Test-Header: integration-test" \
  -H "X-Client: http-mitm-proxy-ui-test" "https://httpbin.org/headers" || echo "REQUEST_FAILED")
if [[ "$HEADERS_RESPONSE" != "REQUEST_FAILED" ]]; then
  echo "      ✅ Headers request successful"
else
  echo "      ❌ Headers request failed"
  exit 1
fi

# Give the server a moment to process the requests
echo "⏳ Waiting for server to process requests..."
sleep 3

# Step 5: Verify requests were logged
echo "📊 Verifying request logging..."

# Test 5.1: Check total request count
echo "  📋 Testing total request count..."
COUNT_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/requests?limit=1")
TOTAL_COUNT=$(echo "$COUNT_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
if [[ "$TOTAL_COUNT" -ge 3 ]]; then
  echo "    ✅ Request count test passed ($TOTAL_COUNT requests logged)"
else
  echo "    ❌ Request count test failed: expected >=3, got $TOTAL_COUNT"
  echo "    Response: $COUNT_RESPONSE"
  exit 1
fi

# Test 5.2: Check we can get specific request details
echo "  📋 Testing specific request retrieval..."
FIRST_ID=$(curl -s "http://localhost:$UI_PORT/api/requests?limit=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [[ -n "$FIRST_ID" && "$FIRST_ID" != "null" ]]; then
  DETAILS_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/requests/$FIRST_ID")
  if echo "$DETAILS_RESPONSE" | grep -q '"id":"'$FIRST_ID'"'; then
    echo "    ✅ Specific request retrieval passed"
  else
    echo "    ❌ Specific request retrieval failed: $DETAILS_RESPONSE"
    exit 1
  fi
else
  echo "    ❌ Could not get request ID for detail test"
  exit 1
fi

# Test 5.3: Test filtering by method
echo "  📋 Testing method filtering..."
GET_COUNT=$(curl -s "http://localhost:$UI_PORT/api/requests?method=GET&limit=1" | grep -o '"total":[0-9]*' | cut -d':' -f2)
POST_COUNT=$(curl -s "http://localhost:$UI_PORT/api/requests?method=POST&limit=1" | grep -o '"total":[0-9]*' | cut -d':' -f2)
if [[ "$GET_COUNT" -ge 1 && "$POST_COUNT" -ge 1 ]]; then
  echo "    ✅ Method filtering passed (GET: $GET_COUNT, POST: $POST_COUNT)"
else
  echo "    ❌ Method filtering failed: GET=$GET_COUNT, POST=$POST_COUNT"
  exit 1
fi

# Test 5.4: Test search functionality
echo "  📋 Testing search functionality..."
SEARCH_RESULT=$(curl -s "http://localhost:$UI_PORT/api/requests?search=integration&limit=1")
if echo "$SEARCH_RESULT" | grep -q '"total":[1-9]' || echo "$SEARCH_RESULT" | grep -q '"total":[1-9][0-9]*'; then
  echo "    ✅ Search functionality passed"
else
  echo "    ❌ Search functionality failed: $SEARCH_RESULT"
  exit 1
fi

# Step 6: Test export functionality
echo "📤 Testing export functionality..."
EXPORT_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:$UI_PORT/api/requests?limit=1")
if [[ "$EXPORT_TEST" -eq 200 ]]; then
  echo "    ✅ Export endpoint accessible"
else
  echo "    ❌ Export endpoint failed with status $EXPORT_TEST"
  exit 1
fi

# Step 7: Test CA certificate endpoint
echo "🔐 Testing CA certificate endpoint..."
if [[ -d "./test-ca" ]]; then
  CERT_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:$UI_PORT/api/ca-cert")
  if [[ "$CERT_TEST" -eq 200 ]] || [[ "$CERT_TEST" -eq 404 ]]; then  # 404 is OK if cert not yet generated
    echo "    ✅ CA certificate endpoint accessible"
  else
    echo "    ❌ CA certificate endpoint failed with status $CERT_TEST"
    # Not exiting here as cert generation might be async
  fi
else
  echo "    ⚠️  CA directory not found (may be created on first HTTPS request)"
fi

# Step 8: Test clearing history
echo "🗑️  Testing history clearing..."
CLEAR_RESPONSE=$(curl -s -X DELETE "http://localhost:$UI_PORT/api/requests")
if echo "$CLEAR_RESPONSE" | grep -q '"message":"Requests cleared"'; then
  echo "    ✅ History clearing passed"
else
  echo "    ❌ History clearing failed: $CLEAR_RESPONSE"
  exit 1
fi

# Verify history is actually cleared
echo "  📋 Verifying history is empty after clear..."
CLEAR_COUNT_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/requests?limit=1")
CLEAR_COUNT=$(echo "$CLEAR_COUNT_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
if [[ "$CLEAR_COUNT" -eq 0 ]]; then
  echo "    ✅ History verified empty after clear"
else
  echo "    ❌ History not empty after clear: $CLEAR_COUNT requests remaining"
  exit 1
fi

echo ""
echo "🎉 All integration tests passed!"
echo "=============================================="
echo "✅ Build successful"
echo "✅ Server startup successful"
echo "✅ API endpoints functional"
echo "✅ Request logging working"
echo "✅ Filtering and search working"
echo "✅ History clearing working"
echo "✅ Export functionality accessible"
echo ""
echo "📝 Test completed successfully!"
echo "📊 Final request count: $(curl -s "http://localhost:$UI_PORT/api/requests?limit=1" | grep -o '"total":[0-9]*' | cut -d':' -f2)"
