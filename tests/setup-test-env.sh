#!/usr/bin/env bash
set -euo pipefail

# Run from root directory
cd "$(dirname "$0")/.."

echo "🔨 Building package..."
npm run build

echo "📦 Packing package..."
rm -f http-mitm-proxy-ui-*.tgz
TGZ=$(npm pack 2>&1 | grep "http-mitm-proxy-ui-.*\.tgz" | tail -1 || ls http-mitm-proxy-ui-*.tgz)
echo "✅ Packed: $TGZ"

echo "📥 Installing to test environment..."
rm -rf test-node-modules
mkdir -p test-node-modules

# Copy patches so patch-package can find them
cp -r patches test-node-modules/

npm --prefix test-node-modules install "./$TGZ"

# No need for patch-package if we use the postinstall script
# cd test-node-modules
# npx patch-package

echo "✅ Test environment ready"
