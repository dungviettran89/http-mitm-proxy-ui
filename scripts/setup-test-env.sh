#!/usr/bin/env bash
set -euo pipefail

echo "🔨 Building package..."
npm run build

echo "📦 Packing package..."
rm -f http-mitm-proxy-ui-*.tgz
TGZ=$(npm pack 2>&1 | tail -1)
echo "✅ Packed: $TGZ"

echo "📥 Installing to test environment..."
rm -rf test-node-modules
mkdir -p test-node-modules

# Copy patches so patch-package can find them
cp -r patches test-node-modules/

npm --prefix test-node-modules install "./$TGZ"

echo "🩹 Applying patches..."
cd test-node-modules
npx patch-package

echo "✅ Test environment ready"
