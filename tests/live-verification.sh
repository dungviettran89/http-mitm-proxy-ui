#!/bin/bash
set -euo pipefail

echo "🧪 HTTP MITM Proxy UI - Live NPM Package Verification"
echo "====================================================="
echo "Testing the published npm package via npx"

# Test configuration
PROXY_PORT=19090
UI_PORT=14096
TEST_DIR="$(pwd)"
PID_FILE="/tmp/http-mitm-proxy-live-verification.pid"
LOG_FILE="/tmp/http-mitm-proxy-live-verification.log"
NPX_CACHE="/tmp/http-mitm-proxy-npx-cache"

# Allow version override via argument (defaults to latest)
PACKAGE_VERSION="${1:-latest}"
PACKAGE="http-mitm-proxy-ui@$PACKAGE_VERSION"

echo "📦 Package: $PACKAGE"

# Cleanup function
cleanup() {
  echo "🛑 Cleaning up test resources..."
  if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "🛑 Stopping proxy server (PID: $PID)..."
      kill "$PID"
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
  rm -rf "$NPX_CACHE" 2>/dev/null || true
  rm -rf "$TEST_DIR/docs/test-ca" 2>/dev/null || true
  echo "🧹 Cleanup complete"
}

trap cleanup EXIT

# Step 1: Verify package exists on npm
echo ""
echo "📦 Step 1: Verifying package on npm registry..."
if npm view "$PACKAGE" version > /dev/null 2>&1; then
  ACTUAL_VERSION=$(npm view "$PACKAGE" version 2>/dev/null || echo "$PACKAGE_VERSION")
  echo "✅ Package found: http-mitm-proxy-ui@$ACTUAL_VERSION"
else
  echo "❌ Package not found: $PACKAGE"
  exit 1
fi

# Step 2: Install package in isolated temp directory
echo ""
echo "📥 Step 2: Installing package in isolated directory..."
mkdir -p "$NPX_CACHE"
cd "$NPX_CACHE"
npm init -y > /dev/null 2>&1
if npm install "$PACKAGE" > "$LOG_FILE" 2>&1; then
  echo "✅ Package installed successfully"
else
  echo "❌ Package installation failed! Check log: $LOG_FILE"
  tail -20 "$LOG_FILE"
  exit 1
fi

# Find the installed entry point
SERVER_ENTRY="$NPX_CACHE/node_modules/http-mitm-proxy-ui/dist/index.js"
if [[ ! -f "$SERVER_ENTRY" ]]; then
  echo "❌ Server entry point not found: $SERVER_ENTRY"
  echo "   Installed contents:"
  ls -la "$NPX_CACHE/node_modules/http-mitm-proxy-ui/" 2>/dev/null || true
  exit 1
fi
echo "   Entry point: $SERVER_ENTRY"

# Verify postinstall patch was applied by http-mitm-proxy-ui
PROXY_JS="$NPX_CACHE/node_modules/http-mitm-proxy/dist/lib/proxy.js"
if [[ -f "$PROXY_JS" ]] && grep -q 'host: "127.0.0.1"' "$PROXY_JS"; then
  echo "✅ http-mitm-proxy is patched (127.0.0.1) via postinstall"
else
  echo "❌ http-mitm-proxy was not patched — postinstall may have failed"
  exit 1
fi

# Step 3: Start the proxy server
echo ""
echo "🚀 Step 3: Starting proxy server from npm package..."
echo "   Proxy port: $PROXY_PORT"
echo "   UI port: $UI_PORT"

cd "$TEST_DIR"
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
echo "⏳ Step 4: Waiting for server to start..."
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

# Step 4: Test API endpoints
echo ""
echo "🔍 Step 5: Testing API endpoints..."

echo "  📋 Testing /api/health..."
HEALTH_RESPONSE=$(curl -s "http://127.0.0.1:$UI_PORT/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
  echo "    ✅ Health check passed"
else
  echo "    ❌ Health check failed: $HEALTH_RESPONSE"
  exit 1
fi

echo "  📋 Testing /api/config..."
CONFIG_RESPONSE=$(curl -s "http://127.0.0.1:$UI_PORT/api/config")
if echo "$CONFIG_RESPONSE" | grep -q '"proxyPort":'$PROXY_PORT'' && \
   echo "$CONFIG_RESPONSE" | grep -q '"uiPort":'$UI_PORT''; then
  echo "    ✅ Config endpoint passed"
else
  echo "    ❌ Config endpoint failed: $CONFIG_RESPONSE"
  exit 1
fi

# Step 5: Make test requests through the proxy
echo ""
echo "🌐 Step 6: Making test requests through proxy..."
PROXY_URL="http://127.0.0.1:$PROXY_PORT"

echo "  📋 Making GET request..."
GET_RESPONSE=$(curl -sk --max-time 30 -x "$PROXY_URL" "https://httpbin.org/get?test=live-verification&timestamp=$(date -u +%s)" || echo "FAILED")
if [[ "$GET_RESPONSE" != "FAILED" ]]; then
  echo "    ✅ GET request successful"
else
  echo "    ❌ GET request failed"
  exit 1
fi

echo "  📋 Making POST request..."
POST_DATA='{"test":"live-verification","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}'
POST_RESPONSE=$(curl -sk --max-time 30 -x "$PROXY_URL" -H "Content-Type: application/json" \
  -d "$POST_DATA" "https://httpbin.org/post" || echo "FAILED")
if [[ "$POST_RESPONSE" != "FAILED" ]]; then
  echo "    ✅ POST request successful"
else
  echo "    ❌ POST request failed"
  exit 1
fi

echo "  📋 Making request with custom headers..."
HEADERS_RESPONSE=$(curl -sk --max-time 30 -x "$PROXY_URL" -H "X-Test-Header: live-verification" \
  -H "X-Client: http-mitm-proxy-ui-npm-verification" "https://httpbin.org/headers" || echo "FAILED")
if [[ "$HEADERS_RESPONSE" != "FAILED" ]]; then
  echo "    ✅ Headers request successful"
else
  echo "    ❌ Headers request failed"
  exit 1
fi

echo ""
echo "⏳ Step 7: Waiting for server to process requests..."
sleep 3

# Step 6: Verify requests were logged
echo ""
echo "📊 Step 8: Verifying request logging..."

echo "  📋 Testing total request count..."
COUNT_RESPONSE=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests?limit=1")
TOTAL_COUNT=$(echo "$COUNT_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2 | tr -d ' ')
if [[ -z "$TOTAL_COUNT" ]]; then TOTAL_COUNT=0; fi
if [[ "$TOTAL_COUNT" -ge 3 ]]; then
  echo "    ✅ Request count test passed ($TOTAL_COUNT requests logged)"
else
  echo "    ❌ Request count test failed: expected >=3, got $TOTAL_COUNT"
  exit 1
fi

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

echo "  📋 Testing search functionality..."
SEARCH_RESULT=$(curl -s "http://127.0.0.1:$UI_PORT/api/requests?search=live-verification&limit=1")
SEARCH_COUNT=$(echo "$SEARCH_RESULT" | grep -o '"total":[0-9]*' | cut -d':' -f2 | tr -d ' ')
if [[ -z "$SEARCH_COUNT" ]]; then SEARCH_COUNT=0; fi
if [[ "$SEARCH_COUNT" -ge 1 ]]; then
  echo "    ✅ Search functionality passed"
else
  echo "    ❌ Search functionality failed"
  exit 1
fi

# Step 7: Test CA certificate endpoint
echo ""
echo "🔐 Step 9: Testing CA certificate endpoint..."
CERT_TEST=$(curl -s -w "%{http_code}" -o /dev/null "http://127.0.0.1:$UI_PORT/api/ca-cert")
if [[ "$CERT_TEST" -eq 200 ]] || [[ "$CERT_TEST" -eq 404 ]]; then
  echo "    ✅ CA certificate endpoint accessible (HTTP $CERT_TEST)"
else
  echo "    ❌ CA certificate endpoint failed with status $CERT_TEST"
  exit 1
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

# Final success
echo ""
echo "🎉 All live verification tests passed!"
echo "====================================================="
echo "✅ npm package: http-mitm-proxy-ui@$ACTUAL_VERSION"
echo "✅ Server startup from npm package"
echo "✅ API endpoints functional"
echo "✅ Request logging working ($TOTAL_COUNT requests logged)"
echo "✅ Filtering and search working"
echo "✅ History clearing working"
echo ""
echo "📝 Live verification completed successfully at $(date)"
