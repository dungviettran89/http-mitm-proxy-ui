#!/usr/bin/env node
/**
 * postinstall.js — Patches http-mitm-proxy for macOS IPv4/IPv6 compatibility.
 *
 * http-mitm-proxy hardcodes "0.0.0.0" and "localhost" for internal HTTPS server
 * connections. On macOS, localhost resolves to IPv6 ::1 while 0.0.0.0 is IPv4,
 * causing ECONNREFUSED errors. This script replaces all occurrences with "127.0.0.1".
 */

const fs = require('fs')
const path = require('path')

const replacements = [
  { from: 'host: "0.0.0.0"', to: 'host: "127.0.0.1"' },
  { from: 'options.host || "localhost"', to: 'options.host || "127.0.0.1"' },
]

function findDependency(baseDir, name) {
  // Walk up directory tree looking for node_modules/<name>
  let current = baseDir
  while (true) {
    const candidate = path.join(current, 'node_modules', name)
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(current)
    if (parent === current) break // reached root
    current = parent
  }
  return null
}

function applyPatches() {
  const scriptsDir = __dirname // .../http-mitm-proxy-ui/scripts/
  const projectRoot = path.resolve(scriptsDir, '..')
  const proxyDir = findDependency(projectRoot, 'http-mitm-proxy')

  if (!proxyDir) {
    console.warn(
      '[http-mitm-proxy-ui] Warning: http-mitm-proxy not found, skipping macOS IPv4 patch'
    )
    return
  }

  const filesToPatch = [
    path.join(proxyDir, 'dist', 'lib', 'proxy.js'),
    path.join(proxyDir, 'lib', 'proxy.ts'),
  ]

  let patched = 0

  for (const filePath of filesToPatch) {
    if (!fs.existsSync(filePath)) continue

    let content = fs.readFileSync(filePath, 'utf8')
    let changed = false

    for (const { from, to } of replacements) {
      if (content.includes(to)) continue // already patched
      if (content.includes(from)) {
        content = content.split(from).join(to)
        changed = true
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8')
      patched++
    }
  }

  if (patched > 0) {
    console.log(
      `[http-mitm-proxy-ui] Patched ${patched} file(s) in http-mitm-proxy for macOS IPv4 compatibility`
    )
  }
}

applyPatches()
