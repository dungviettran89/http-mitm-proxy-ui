import test from 'node:test'
import assert from 'node:assert'
import { MitmProxy } from '../src/proxy'
import { UIServer } from '../src/ui/server'
import * as fs from 'fs'
import * as path from 'path'

test('Spec API Endpoints Integration', async (t) => {
  const dbPath = path.join(process.cwd(), 'test-spec-api-db.json')
  const specDbPath = path.join(process.cwd(), 'test-spec-api-specs-db.json')
  
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  if (fs.existsSync(specDbPath)) fs.unlinkSync(specDbPath)

  const proxy = new MitmProxy({
    proxyPort: 19091,
    uiPort: 14097,
    maxRequests: 100,
    enableModification: false,
    dbPath: dbPath
  })

  await proxy.init()
  const uiServer = new UIServer(proxy, (proxy as any).config)
  await uiServer.start()

  // Helper to make requests to UI API
  const apiRequest = async (path: string, options: any = {}) => {
    const url = `http://127.0.0.1:14097${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    if (res.status === 204) return null
    return res.json()
  }

  await t.test('GET /api/spec returns 404 when no spec exists', async () => {
    const res = await fetch('http://127.0.0.1:14097/api/spec')
    assert.strictEqual(res.status, 404)
  })

  await t.test('POST /api/spec/generate builds and saves spec', async () => {
    // Add a dummy request
    const req: any = {
      id: '1',
      timestamp: Date.now(),
      method: 'GET',
      url: 'http://example.com/api/test',
      protocol: 'http',
      headers: {},
      response: {
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hello: 'world' })
      }
    }
    await (proxy as any).store.add(req)

    const mappings = [{ pattern: '/api/test', methods: ['GET'] }]
    const spec = await apiRequest('/api/spec/generate', {
      method: 'POST',
      body: JSON.stringify({ mappings })
    })

    assert.strictEqual(spec.openapi, '3.0.0')
    assert.ok(spec.paths['/api/test'])
    assert.ok(spec.paths['/api/test'].get)
    
    // Verify persistence
    const savedSpec = await apiRequest('/api/spec')
    assert.deepStrictEqual(savedSpec, spec)
  })

  await t.test('PATCH /api/spec/update-endpoint updates specific operation', async () => {
    // Add another request to the same endpoint with different body
    const req2: any = {
      id: '2',
      timestamp: Date.now(),
      method: 'GET',
      url: 'http://example.com/api/test',
      protocol: 'http',
      headers: {},
      response: {
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hello: 'universe', newField: 123 })
      }
    }
    await (proxy as any).store.add(req2)

    const updatedSpec = await apiRequest('/api/spec/update-endpoint', {
      method: 'PATCH',
      body: JSON.stringify({ path: '/api/test', method: 'GET' })
    })

    const schema = updatedSpec.paths['/api/test'].get.responses['200'].content['application/json'].schema
    assert.ok(schema.properties.newField)
  })

  await t.test('POST /api/spec/generate includes query and header parameters', async () => {
    // Add request with query string and custom headers
    const req3: any = {
      id: '3',
      timestamp: Date.now(),
      method: 'GET',
      url: 'http://example.com/api/params?search=query123&page=1',
      protocol: 'http',
      headers: {
        'host': 'example.com',
        'x-custom-api-key': 'secret',
        'authorization': 'Bearer token'
      },
      response: {
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ result: 'ok' })
      }
    }
    await (proxy as any).store.add(req3)

    const mappings = [{ pattern: '/api/params', methods: ['GET'] }]
    const spec = await apiRequest('/api/spec/generate', {
      method: 'POST',
      body: JSON.stringify({ mappings })
    })

    const params = spec.paths['/api/params'].get.parameters
    assert.ok(params, 'Parameters should exist')
    
    // Check query params
    const searchParam = params.find((p: any) => p.name === 'search' && p.in === 'query')
    assert.ok(searchParam)
    const pageParam = params.find((p: any) => p.name === 'page' && p.in === 'query')
    assert.ok(pageParam)

    // Check headers
    const keyHeader = params.find((p: any) => p.name === 'x-custom-api-key' && p.in === 'header')
    assert.ok(keyHeader)
    const authHeader = params.find((p: any) => p.name === 'authorization' && p.in === 'header')
    assert.ok(authHeader)

    // Check ignored header is NOT present
    const hostHeader = params.find((p: any) => p.name === 'host' && p.in === 'header')
    assert.strictEqual(hostHeader, undefined)
  })

  // Cleanup
  uiServer.stop()
  try {
    proxy.stop()
  } catch (e) {
    console.warn('Failed to stop proxy gracefully:', e)
  }
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  if (fs.existsSync(specDbPath)) fs.unlinkSync(specDbPath)
})
