#!/bin/bash
set -euo pipefail

echo "🧪 HTTP MITM Proxy UI - Simple Functionality Test"
echo "================================================"

# Test configuration
PROXY_PORT=19090
UI_PORT=14096
PID_FILE="/tmp/http-mitm-proxy-simple-test.pid"
LOG_FILE="/tmp/http-mitm-proxy-simple-test.log"

# Cleanup function
cleanup() {
  echo "🛑 Cleaning up..."
  if [[ -f "$PID_FILE" ]]; then
    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      kill "$(cat "$PID_FILE")"
      sleep 2
      if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        kill -9 "$(cat "$PID_FILE")"
      fi
    fi
    rm -f "$PID_FILE"
  fi
  rm -rf "./test-ca" 2>/dev/null || true
  echo "🧹 Cleanup complete"
}

# Trap EXIT signal
trap cleanup EXIT

# Check if dist files exist
if [[ ! -f "dist/index.js" ]]; then
  echo "❌ dist/index.js not found! Please run: npm run build"
  exit 1
fi

if [[ ! -f "dist/ui/index.html" ]]; then
  echo "❌ dist/ui/index.html not found! Frontend not built."
  exit 1
fi

echo "✅ Built files found:"
echo "   - dist/index.js (backend)"
echo "   - dist/ui/index.html (frontend)"

# Start the proxy server in background
echo ""
echo "🚀 Starting proxy server..."
echo "   Proxy port: $PROXY_PORT"
echo "   UI port: $UI_PORT"

node dist/index.js \
  --proxy-port "$PROXY_PORT" \
  --ui-port "$UI_PORT" \
  --ssl-ca-dir "./test-ca" \
  >> "$LOG_FILE" 2>&1 &

SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"
echo "   Server PID: $SERVER_PID"

# Wait for server to start
echo ""
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
  if curl -s "http://localhost:$UI_PORT/api/health" > /dev/null; then
    echo "✅ Server is ready! (took $i seconds)"
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "❌ Server failed to start within timeout!"
    echo "Last 10 lines of log:"
    tail -10 "$LOG_FILE"
    exit 1
  fi
  sleep 1
done

# Test API endpoints
echo ""
echo "🔍 Testing API endpoints..."

# Test 1: Health check
echo "  📋 Testing /api/health..."
HEALTH_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  echo "    ✅ Health check passed"
else
  echo "    ❌ Health check failed: $HEALTH_RESPONSE"
  exit 1
fi

# Test 2: Get config
echo "  📋 Testing /api/config..."
CONFIG_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/config")
if echo "$CONFIG_RESPONSE" | grep -q '"proxyPort":'$PROXY_PORT'' && \
   echo "$CONFIG_RESPONSE" | grep -q '"uiPort":'$UI_PORT''; then
  echo "    ✅ Config endpoint passed"
else
  echo "    ❌ Config endpoint failed: $CONFIG_RESPONSE"
  exit 1
fi

# Make test requests through the proxy
echo ""
echo "🌐 Making test requests through proxy..."
PROXY_URL="http://localhost:$PROXY_PORT"

# Test request 1: GET
echo "  📋 Making GET request..."
GET_RESPONSE=$(curl -s -x "$PROXY_URL" "https://httpbin.org/get?test=simple" || echo "FAILED")
if [[ "$GET_RESPONSE" != "FAILED" ]]; then
  echo "    ✅ GET request successful"
else
  echo "    ❌ GET request failed"
  exit 1
fi

# Test request 2: POST with JSON
echo "  📋 Making POST request..."
POST_DATA='{"test":"simple","value":42}'
POST_RESPONSE=$(curl -s -x "$PROXY_URL" -H "Content-Type: application/json" \
  -d "$POST_DATA" "https://httpbin.org/post" || echo "FAILED")
if [[ "$POST_RESPONSE" != "FAILED" ]]; then
  echo "    ✅ POST request successful"
else
  echo "    ❌ POST request failed"
  exit 1
fi

# Wait for processing
echo ""
echo "⏳ Waiting for server to process requests..."
sleep 2

# Verify requests were logged
echo ""
echo "📊 Verifying request logging..."

# Check total request count
echo "  📋 Testing request count..."
COUNT_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/requests?limit=1")
TOTAL_COUNT=$(echo "$COUNT_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
if [[ -z "$TOTAL_COUNT" ]]; then TOTAL_COUNT=0; fi
if [[ "$TOTAL_COUNT" -ge 2 ]]; then
  echo "    ✅ Request count test passed ($TOTAL_COUNT requests logged)"
else
  echo "    ❌ Request count test failed: expected >=2, got $TOTAL_COUNT"
  echo "    Response: $COUNT_RESPONSE"
  exit 1
fi

# Check we can get specific request details
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

# Test filtering by method
echo "  📋 Testing method filtering..."
GET_COUNT=$(curl -s "http://localhost:$UI_PORT/api/requests?method=GET&limit=1" | grep -o '"total":[0-9]*" | cut -d':' -f2)
POST_COUNT=$(curl -s "http://localhost:$UI_PORT/api/requests?method=POST&limit=1" | grep -o '"total":[0-9]*" | cut -d':' -f2)
if [[ -z "$GET_COUNT" ]]; then GET_COUNT=0; fi
if [[ -z "$POST_COUNT" ]]; then POST_COUNT=0; fi
if [[ "$GET_COUNT" -ge 1 && "$POST_COUNT" -ge 1 ]]; then
  echo "    ✅ Method filtering passed (GET: $GET_COUNT, POST: $POST_COUNT)"
else
  echo "    ❌ Method filtering failed: GET=$GET_COUNT, POST=$POST_COUNT"
  exit 1
fi

# Test clearing history
echo ""
echo "🗑️  Testing history clearing..."
CLEAR_RESPONSE=$(curl -s -X DELETE "http://localhost:$UI_PORT/api/requests")
if echo "$CLEAR_RESPONSE" | grep -q '"message":"Requests cleared"'; then
  echo "    ✅ History clearing passed"
else
  echo "    ❌ History clearing failed: $CLEAR_RESPONSE"
  exit 1
fi

# Verify history is cleared
echo "  📋 Verifying history is empty after clear..."
CLEAR_COUNT_RESPONSE=$(curl -s "http://localhost:$UI_PORT/api/requests?limit=1")
CLEAR_COUNT=$(echo "$CLEAR_COUNT_RESPONSE" | grep -o '"total":[0-9]*" | cut -d':' -f2)
if [[ -z "$CLEAR_COUNT" ]]; then CLEAR_COUNT=0; fi
if [[ "$CLEAR_COUNT" -eq 0 ]]; then
  echo "    ✅ History verified empty after clear"
else
  echo "    ❌ History not empty after clear: $CLEAR_COUNT requests remaining"
  exit 1
fi

# Final success
echo ""
echo "🎉 All tests passed!"
echo "================================================"
echo "✅ Built files verified"
echo "✅ Server startup successful"
echo "✅ API endpoints functional"
echo "✅ Request logging working ($TOTAL_COUNT requests logged)"
echo "✅ Filtering and search working"
echo "✅ History clearing working"
echo ""
echo "📝 To test manually:"
echo "   1. Start: node dist/index.js --proxy-port 9090 --ui-port 3000"
echo "   2. Visit: http://localhost:3000"
echo "   3. Configure app to use localhost:9090 as HTTP/HTTPS proxy"
echo "   4. Make requests and watch them appear in real-time!"
echo ""
echo "📊 Test completed successfully at $(date)"
