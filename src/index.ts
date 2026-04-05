#!/usr/bin/env node

import { Command } from 'commander'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { MitmProxy, type ProxyUIConfig } from './proxy'
import { UIServer } from './ui/server'

// node-forge has no @types, but it's already a dependency and we only use it for public key extraction
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const nodeForge: any = require('node-forge')

const DEFAULT_PROXY_PORT = 8080
const DEFAULT_UI_PORT = 3000
const DEFAULT_SSL_CA_DIR = path.join(os.homedir(), '.http-mitm-proxy-ui', 'ca')
const DEFAULT_MAX_REQUESTS = 1000

interface CliOptions {
  proxyPort: number
  uiPort: number
  headless: boolean
  sslCaDir?: string
  maxRequests: number
  enableModification: boolean
  config?: string
  caCertPath?: string
  caKeyPath?: string
}

async function loadConfigFile(configPath?: string): Promise<Partial<CliOptions>> {
  if (!configPath) return {}
  try {
    const { default: fs } = await import('fs')
    const raw = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(raw)
  } catch (err: any) {
    console.error(`Warning: Could not load config file "${configPath}": ${err.message}`)
    return {}
  }
}

/**
 * If custom CA cert/key are provided, copy them to the expected locations
 * in sslCaDir so http-mitm-proxy's CA class loads them instead of generating.
 * The CA class expects three files: certs/ca.pem, keys/ca.private.key, keys/ca.public.key
 */
async function setupCaFiles(caCertPath: string, caKeyPath: string, sslCaDir: string): Promise<void> {
  const certsDir = path.join(sslCaDir, 'certs')
  const keysDir = path.join(sslCaDir, 'keys')

  // Ensure directories exist
  fs.mkdirSync(certsDir, { recursive: true })
  fs.mkdirSync(keysDir, { recursive: true })

  // Copy cert and private key to expected locations
  const destCert = path.join(certsDir, 'ca.pem')
  const destPrivateKey = path.join(keysDir, 'ca.private.key')
  const destPublicKey = path.join(keysDir, 'ca.public.key')

  fs.copyFileSync(caCertPath, destCert)
  fs.copyFileSync(caKeyPath, destPrivateKey)

  // Extract public key from the private key using node-forge (already a dependency)
  const pki = nodeForge.pki
  const privateKey = pki.privateKeyFromPem(fs.readFileSync(caKeyPath, 'utf-8'))
  const publicKey = pki.setRsaPublicKey(privateKey.n, privateKey.e)
  fs.writeFileSync(destPublicKey, pki.publicKeyToPem(publicKey))

  console.log(`  CA cert: ${caCertPath} → ${destCert}`)
  console.log(`  CA key:  ${caKeyPath} → ${destPrivateKey}`)
  console.log(`  CA pub:  (derived) → ${destPublicKey}`)
}

async function main(): Promise<void> {
  const program = new Command()

  program
    .name('http-mitm-proxy-ui')
    .description('HTTP MITM Proxy with a web-based UI for inspecting and modifying traffic')
    .version('1.0.0')
    .option('-p, --proxy-port <port>', 'Port for the MITM proxy server', String(DEFAULT_PROXY_PORT))
    .option('-u, --ui-port <port>', 'Port for the web UI server', String(DEFAULT_UI_PORT))
    .option('-H, --headless', 'Run in headless mode (proxy only, no UI)', false)
    .option('-c, --config <path>', 'Path to a JSON config file')
    .option('--ssl-ca-dir <path>', 'Directory for storing CA certificates')
    .option(
      '--max-requests <count>',
      'Maximum number of requests to keep in memory',
      String(DEFAULT_MAX_REQUESTS)
    )
    .option('--no-modification', 'Disable request/response modification features')
    .option('--ca-cert <path>', 'Path to custom CA certificate file (.pem)')
    .option('--ca-key <path>', 'Path to custom CA private key file (.pem)')
    .parse(process.argv)

  const opts = program.opts()

  // Load config file if provided
  const fileConfig = await loadConfigFile(opts.config)

  // Merge: defaults < file config < CLI flags
  const config: CliOptions = {
    proxyPort: parseInt(
      fileConfig.proxyPort != null ? String(fileConfig.proxyPort) : opts.proxyPort,
      10
    ),
    uiPort: parseInt(fileConfig.uiPort != null ? String(fileConfig.uiPort) : opts.uiPort, 10),
    headless: fileConfig.headless != null ? Boolean(fileConfig.headless) : Boolean(opts.headless),
    sslCaDir: fileConfig.sslCaDir || opts.sslCaDir || DEFAULT_SSL_CA_DIR,
    maxRequests: parseInt(
      fileConfig.maxRequests != null ? String(fileConfig.maxRequests) : opts.maxRequests,
      10
    ),
    enableModification:
      fileConfig.enableModification != null
        ? Boolean(fileConfig.enableModification)
        : opts.enableModification !== false,
    caCertPath: fileConfig.caCertPath || opts.caCert,
    caKeyPath: fileConfig.caKeyPath || opts.caKey,
  }

  // Validate CA cert/key: both or neither must be provided
  if ((config.caCertPath && !config.caKeyPath) || (!config.caCertPath && config.caKeyPath)) {
    console.error('Error: --ca-cert and --ca-key must be provided together.')
    process.exit(1)
  }

  // Validate CA cert/key files exist
  if (config.caCertPath && !fs.existsSync(config.caCertPath)) {
    console.error(`Error: CA certificate file not found: ${config.caCertPath}`)
    process.exit(1)
  }
  if (config.caKeyPath && !fs.existsSync(config.caKeyPath)) {
    console.error(`Error: CA private key file not found: ${config.caKeyPath}`)
    process.exit(1)
  }

  // Validate ports
  if (config.proxyPort < 1 || config.proxyPort > 65535) {
    console.error(`Error: Invalid proxy port ${config.proxyPort}. Must be between 1 and 65535.`)
    process.exit(1)
  }
  if (config.uiPort < 1 || config.uiPort > 65535) {
    console.error(`Error: Invalid UI port ${config.uiPort}. Must be between 1 and 65535.`)
    process.exit(1)
  }
  if (config.proxyPort === config.uiPort) {
    console.error('Error: Proxy port and UI port must be different.')
    process.exit(1)
  }

  const proxyConfig: ProxyUIConfig = {
    proxyPort: config.proxyPort,
    uiPort: config.uiPort,
    sslCaDir: config.sslCaDir,
    maxRequests: config.maxRequests,
    enableModification: config.enableModification,
    headless: config.headless,
    caCertPath: config.caCertPath,
    caKeyPath: config.caKeyPath,
  }

  console.log('Starting http-mitm-proxy-ui...')
  console.log(`  Proxy: localhost:${config.proxyPort}`)
  if (!config.headless) {
    console.log(`  UI:    http://localhost:${config.uiPort}`)
  }
  console.log(`  Headless: ${config.headless}`)
  if (config.caCertPath && config.caKeyPath) {
    console.log(`  Custom CA: yes`)
    await setupCaFiles(config.caCertPath, config.caKeyPath, config.sslCaDir!)
  } else {
    console.log(`  Custom CA: no (auto-generate)`)
  }
  console.log('')

  // Start the proxy
  const proxy = new MitmProxy(proxyConfig)

  proxy.on('error', (err: Error) => {
    console.error('Proxy error:', err.message)
  })

  try {
    await proxy.start()
  } catch (err: any) {
    console.error(`Failed to start proxy: ${err.message}`)
    process.exit(1)
  }

  // Start the UI (unless in headless mode)
  let uiServer: UIServer | null = null
  if (!config.headless) {
    uiServer = new UIServer(proxy, proxyConfig)

    try {
      await uiServer.start()
    } catch (err: any) {
      console.error(`Failed to start UI server: ${err.message}`)
      proxy.stop()
      process.exit(1)
    }
  }

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down...`)
    if (uiServer) {
      uiServer.stop()
    }
    proxy.stop()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
