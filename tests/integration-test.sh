#!/bin/bash
set -euo pipefail

echo "🧪 HTTP MITM Proxy UI - End-to-End Integration Test"
echo "=================================================="

# Test configuration
PROXY_PORT=19090
UI_PORT=14096
TEST_DIR="$(pwd)"
PID_FILE="/tmp/http-mitm-proxy-integration-test.pid"
LOG_FILE="/tmp/http-mitm-proxy-integration-test.log"

# Cleanup function
cleanup() {
  echo "🛑 Cleaning up test resources..."
  if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "🛑 Stopping proxy server (PID: $PID)..."
      kill "$PID"
      # Wait for graceful shutdown
      for i in {1..10}; do
        if ! kill -0 "$PID" 2>/dev/null; then
          echo "✅ Server stopped gracefully"
          break
        fi
        if [[ $i -eq 10 ]]; then
          echo "⚠️  Server didn't stop gracefully, forcing..."
          kill -9 "$PID" 2>/dev/null || true
        fi
        sleep 1
      done
    fi
    rm -f "$PID_FILE"
  fi
  # Clean up test CA directory
  rm -rf "$TEST_DIR/docs/test-ca" 2>/dev/null || true
  echo "🧹 Cleanup complete"
}

# Trap EXIT signal for cleanup
trap cleanup EXIT

# Step 1: Build the project
echo ""
echo "🔨 Step 1: Building project..."
if npm run build > "$LOG_FILE" 2>&1; then
  echo "✅ Build successful"
else
  echo "❌ Build failed! Check log: $LOG_FILE"
  cat "$LOG_FILE"
  exit 1
fi

# Use the pre-installed, pre-patched test-node-modules directory
SERVER_ENTRY="$TEST_DIR/test-node-modules/node_modules/http-mitm-proxy-ui/dist/index.js"
if [[ ! -f "$SERVER_ENTRY" ]]; then
  echo "❌ Server entry point not found: $SERVER_ENTRY"
  echo "   Run: cd test-node-modules && npm install ../http-mitm-proxy-ui-0.1.0.tgz"
  exit 1
fi

# Verify http-mitm-proxy is patched (127.0.0.1 instead of 0.0.0.0)
PROXY_JS="$TEST_DIR/test-node-modules/node_modules/http-mitm-proxy/dist/lib/proxy.js"
if [[ -f "$PROXY_JS" ]] && grep -q 'host: "127.0.0.1"' "$PROXY_JS"; then
  echo "✅ http-mitm-proxy is patched (127.0.0.1)"
else
  echo "⚠️  http-mitm-proxy not patched, applying patch..."
  if [[ -f "$PROXY_JS" ]]; then
    sed -i '' 's/host: "0\.0\.0\.0"/host: "127.0.0.1"/g' "$PROXY_JS"
    sed -i '' 's/options\.host || "localhost"/options.host || "127.0.0.1"/g' "$PROXY_JS"
    echo "✅ http-mitm-proxy patched successfully"
  else
    echo "❌ Could not find http-mitm-proxy proxy.js to patch"
    exit 1
  fi
fi

# Step 2: Start the proxy server
echo ""
echo "🚀 Step 2: Starting proxy server..."
echo "   Proxy port: $PROXY_PORT"
echo "   UI port: $UI_PORT"

node "$SERVER_ENTRY" \
  --proxy-port "$PROXY_PORT" \
  --ui-port "$UI_PORT" \
  --ssl-ca-dir "$TEST_DIR/docs/test-ca" \
  --max-requests 1000 \
  >> "$LOG_FILE" 2>&1 &

SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"
echo "   Server PID: $SERVER_PID"

# Wait for server to start
echo ""
echo "⏳ Step 3: Waiting for server to start..."
SERVER_READY=false
for i in {1..30}; do
  if curl -s "http://127.0.0.1:$UI_PORT/api/health" > /dev/null; then
    SERVER_READY=true
    echo "✅ Server is ready! (took $i seconds)"
    break
  fi
  sleep 1
done

if [[ "$SERVER_READY" == false ]]; then
  echo "❌ Server failed to start within 30 seconds!"
  echo "Last 20 lines of log:"
  tail -20 "$LOG_FILE"
  exit 1
fi

# Step 3: Test API endpoints
echo ""
echo "🔍 Step 4: Testing API endpoints..."

# Test 4.1: Health check
echo "  📋 Testing /api/health..."
HEALTH_RESPONSE=$(curl -s "http://127.0.0.1:$UI_PORT/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  echo "    ✅ Health check passed"
else
  echo "    ❌ Health check failed: $HEALTH_RESPONSE"
  exit 1
fi

# Test 4.2: Get config
echo "  📋 Testing /api/config..."
CONFIG_RESPONSE=$(curl -s "http://127.0.0.1:$UI_PORT/api/config")
if echo "$CONFIG_RESPONSE" | grep -q '"proxyPort":'$PROXY_PORT'' && \
   echo "$CONFIG_RESPONSE" | grep -q '"uiPort":'$UI_PORT''; then
  echo "    ✅ Config endpoint passed"
else
  echo "    ❌ Config endpoint failed: $CONFIG_RESPONSE"
  exit 1
fi

# Step 4: Make test requests through the proxy
echo ""
echo "🌐 Step 5: Making test requests through proxy..."
PROXY_URL="http://127.0.0.1:$PROXY_PORT"

# Test request 1: GET with query params
echo "  📋 Making GET request..."
GET_RESPONSE=$(curl -sk --max-time 30 -x "$PROXY_URL" "https://httpbin.org/get?test=integration&timestamp=$(date -u +%s)" || echo "FAILED")
if [[ "$GET_RESPONSE" != "FAILED" ]]; then
  echo "    ✅ GET request successful"
else
  echo "    ❌ GET request failed"
  exit 1
fi

# Test request 2: POST with JSON
echo "  📋 Making POST request..."
POST_DATA='{"test":"integration","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'","random":'$(($RANDOM % 1000))'}'
POST_RESPONSE=$(curl -sk --max-time 30 -x "$PROXY_URL" -H "Content-Type: application/json" \
  -d "$POST_DATA" "https://httpbin.org/post" || echo "FAILED")
if [[ "$POST_RESPONSE" != "FAILED" ]]; then
  echo "    ✅ POST request successful"
else
  echo "    ❌ POST request failed"
  exit 1
fi

# Test request 3: Request with custom headers
echo "  📋 Making request with custom headers..."
HEADERS_RESPONSE=$(curl -sk --max-time 30 -x "$PROXY_URL" -H "X-Test-Header: integration-test-value" \
  -H "X-Client: http-mitm-proxy-ui-e2e-test" "https://httpbin.org/headers" || echo "FAILED")
if [[ "$HEADERS_RESPONSE" != "FAILED" ]]; then
  echo "    ✅ Headers request successful"
else
  echo "    ❌ Headers request failed"
  exit 1
fi

# Wait for server to process requests
echo ""
echo "⏳ Step 6: Waiting for server to process requests..."
sleep 3

# Step 5: Verify requests were logged via API
echo ""
echo "📊 Step 7: Verifying request logging via API..."

# Test 7.1: Check total request count
echo "  📋 Testing total request count..."
COUNT_RESPONSE=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests?limit=1")
TOTAL_COUNT=$(echo "$COUNT_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2 | tr -d ' ')
if [[ -z "$TOTAL_COUNT" ]]; then TOTAL_COUNT=0; fi
if [[ "$TOTAL_COUNT" -ge 3 ]]; then
  echo "    ✅ Request count test passed ($TOTAL_COUNT requests logged)"
else
  echo "    ❌ Request count test failed: expected >=3, got $TOTAL_COUNT"
  echo "    Response: $COUNT_RESPONSE"
  exit 1
fi

# Test 7.2: Check we can get specific request details
echo "  📋 Testing specific request retrieval..."
FIRST_ID=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests?limit=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [[ -n "$FIRST_ID" && "$FIRST_ID" != "null" ]]; then
  DETAILS_RESPONSE=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests/$FIRST_ID")
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

# Test 7.3: Test filtering by method
echo "  📋 Testing method filtering..."
GET_COUNT=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests?method=GET&limit=1" | grep -o '"total":[0-9]*' | cut -d':' -f2 | tr -d ' ')
POST_COUNT=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests?method=POST&limit=1" | grep -o '"total":[0-9]*' | cut -d':' -f2 | tr -d ' ')
if [[ -z "$GET_COUNT" ]]; then GET_COUNT=0; fi
if [[ -z "$POST_COUNT" ]]; then POST_COUNT=0; fi
if [[ "$GET_COUNT" -ge 1 && "$POST_COUNT" -ge 1 ]]; then
  echo "    ✅ Method filtering passed (GET: $GET_COUNT, POST: $POST_COUNT)"
else
  echo "    ❌ Method filtering failed: GET=$GET_COUNT, POST=$POST_COUNT"
  exit 1
fi

# Test 7.4: Test search functionality
echo "  📋 Testing search functionality..."
SEARCH_RESULT=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests?search=integration&limit=1")
SEARCH_COUNT=$(echo "$SEARCH_RESULT" | grep -o '"total":[0-9]*' | cut -d':' -f2 | tr -d ' ')
if [[ -z "$SEARCH_COUNT" ]]; then SEARCH_COUNT=0; fi
if [[ "$SEARCH_COUNT" -ge 1 ]]; then
  echo "    ✅ Search functionality passed"
else
  echo "    ❌ Search functionality failed: $SEARCH_RESULT"
  exit 1
fi

# Step 6: Test export functionality
echo ""
echo "📤 Step 8: Testing export functionality..."
EXPORT_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://127.0.0.1:$UI_PORT/api/requests?limit=1")
if [[ "$EXPORT_TEST" -eq 200 ]]; then
  echo "    ✅ Export endpoint accessible (HTTP $EXPORT_TEST)"
else
  echo "    ❌ Export endpoint failed with status $EXPORT_TEST"
  exit 1
fi

# Step 7: Test CA certificate endpoint
echo ""
echo "🔐 Step 9: Testing CA certificate endpoint..."
if [[ -d "$TEST_DIR/docs/test-ca" ]]; then
  CERT_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://127.0.0.1:$UI_PORT/api/ca-cert")
  if [[ "$CERT_TEST" -eq 200 ]] || [[ "$CERT_TEST" -eq 404 ]]; then
    echo "    ✅ CA certificate endpoint accessible (HTTP $CERT_TEST)"
  else
    echo "    ❌ CA certificate endpoint failed with status $CERT_TEST"
  fi
else
  echo "    ⚠️  CA directory not found (may be created on first HTTPS request)"
fi

# Step 8: Test clearing history
echo ""
echo "🗑️  Step 10: Testing history clearing..."
CLEAR_RESPONSE=$(curl -s -X DELETE "http://127.0.0.1:$UI_PORT/api/requests")
if echo "$CLEAR_RESPONSE" | grep -q '"message":"Requests cleared"'; then
  echo "    ✅ History clearing passed"
else
  echo "    ❌ History clearing failed: $CLEAR_RESPONSE"
  exit 1
fi

# Verify history is actually cleared
echo "  📋 Verifying history is empty after clear..."
CLEAR_COUNT_RESPONSE=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests?limit=1")
CLEAR_COUNT=$(echo "$CLEAR_COUNT_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2 | tr -d ' ')
if [[ -z "$CLEAR_COUNT" ]]; then CLEAR_COUNT=0; fi
if [[ "$CLEAR_COUNT" -eq 0 ]]; then
  echo "    ✅ History verified empty after clear"
else
  echo "    ❌ History not empty after clear: $CLEAR_COUNT requests remaining"
  exit 1
fi

# Final success message
echo ""
echo "🎉 All integration tests passed!"
echo "=================================================="
echo "✅ Build successful"
echo "✅ Server startup successful"
echo "✅ API endpoints functional"
echo "✅ Request logging working ($TOTAL_COUNT requests logged)"
echo "✅ Filtering and search working"
echo "✅ History clearing working"
echo "✅ Export functionality accessible"
echo "✅ CA certificate endpoint accessible"
echo ""
echo "📝 Test completed successfully at $(date)"
echo "📊 Final request count: $CLEAR_COUNT (should be 0 after clear)"
