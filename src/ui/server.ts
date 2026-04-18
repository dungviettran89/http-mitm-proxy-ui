import express, { Express, Request, Response, NextFunction } from 'express'
import { createServer, Server as HttpServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import * as path from 'path'
import * as fs from 'fs'
import { MitmProxy, RequestRecord, ProxyUIConfig } from '../proxy'
import { EventEmitter } from 'events'

interface FilterQuery {
  method?: string
  status?: string
  domain?: string
  contentType?: string
  search?: string
  limit?: string
  offset?: string
}

interface ApiResponse<T> {
  data: T
  total: number
  limit: number
  offset: number
}

export class UIServer extends EventEmitter {
  private app: Express
  private httpServer: HttpServer
  private wss: WebSocketServer
  private config: ProxyUIConfig
  private proxy: MitmProxy
  private clients: Set<WebSocket> = new Set()
  private uiDistPath: string

  constructor(proxy: MitmProxy, config: ProxyUIConfig) {
    super()
    this.proxy = proxy
    this.config = config
    this.uiDistPath = path.resolve(__dirname, '..', 'public')
    this.app = express()
    this.httpServer = createServer(this.app)
    this.wss = new WebSocketServer({ server: this.httpServer, path: '/ws' })
    this.setupMiddleware()
    this.setupRoutes()
    this.setupWebSocket()
    this.setupProxyEvents()
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))

    // CORS for localhost only
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin
      if (origin && /^https?:\/\/localhost:\d+$/.test(origin)) {
        res.header('Access-Control-Allow-Origin', origin)
        res.header('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS')
        res.header('Access-Control-Allow-Headers', 'Content-Type')
      }
      if (req.method === 'OPTIONS') {
        res.sendStatus(204)
        return
      }
      next()
    })
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', uptime: process.uptime() })
    })

    // GET /api/requests — list with filtering & pagination
    this.app.get('/api/requests', (req: Request, res: Response) => {
      const queries = req.query as unknown as FilterQuery
      const requests = this.proxy.getRequests()
      const filtered = this.filterRequests(requests, queries)
      const limit = Math.min(parseInt(queries.limit || '100', 10), this.config.maxRequests)
      const offset = parseInt(queries.offset || '0', 10)
      const paginated = filtered.slice(offset, offset + limit)

      const response: ApiResponse<RequestRecord[]> = {
        data: paginated,
        total: filtered.length,
        limit,
        offset,
      }
      res.json(response)
    })

    // GET /api/requests/:id — single request detail
    this.app.get('/api/requests/:id', (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      if (!id) {
        res.status(400).json({ error: 'Missing request ID' })
        return
      }
      const request = this.proxy.getRequest(id)
      if (request) {
        res.json(request)
      } else {
        res.status(404).json({ error: 'Request not found' })
      }
    })

    // DELETE /api/requests — clear history
    this.app.delete('/api/requests', async (_req: Request, res: Response) => {
      await this.proxy.clearRequests()
      this.broadcast({ type: 'clear', data: {} })
      res.json({ message: 'Requests cleared' })
    })

    // GET /api/config — UI configuration
    this.app.get('/api/config', (_req: Request, res: Response) => {
      res.json({
        proxyPort: this.config.proxyPort,
        uiPort: this.config.uiPort,
        headless: this.config.headless,
        enableModification: this.config.enableModification,
        maxRequests: this.config.maxRequests,
      })
    })

    // GET /api/ca-cert — download CA certificate for trust installation
    this.app.get('/api/ca-cert', (_req: Request, res: Response) => {
      const caCertPath = this.config.sslCaDir
        ? path.join(this.config.sslCaDir, 'certs', 'ca.pem')
        : null

      if (caCertPath && fs.existsSync(caCertPath)) {
        res.download(caCertPath, 'http-mitm-proxy-ui-ca.pem')
      } else {
        res.status(404).json({
          error: 'CA certificate not found. Start the proxy with --ssl-ca-dir to generate it.',
        })
      }
    })

    // GET /api/spec — get generated OpenAPI spec
    this.app.get('/api/spec', (_req: Request, res: Response) => {
      const spec = this.proxy.getSpec()
      if (spec) {
        res.json(spec)
      } else {
        res.status(404).json({ error: 'Spec not found' })
      }
    })

    // POST /api/spec/generate — build spec from mappings
    this.app.post('/api/spec/generate', async (req: Request, res: Response) => {
      const { mappings } = req.body
      if (!Array.isArray(mappings)) {
        res.status(400).json({ error: 'Invalid mappings' })
        return
      }
      try {
        const spec = await this.proxy.generateSpec(mappings)
        res.json(spec)
      } catch (err: any) {
        res.status(500).json({ error: err.message })
      }
    })

    // DELETE /api/spec — reset the generated spec
    this.app.delete('/api/spec', async (_req: Request, res: Response) => {
      await this.proxy.saveSpec(null)
      res.json({ message: 'Spec reset' })
    })

    // PATCH /api/spec/update-endpoint — update a specific endpoint in the spec
    this.app.patch('/api/spec/update-endpoint', async (req: Request, res: Response) => {
      const { path: apiPath, method } = req.body
      if (!apiPath || !method) {
        res.status(400).json({ error: 'Missing path or method' })
        return
      }
      const spec = this.proxy.getSpec()
      if (!spec) {
        res.status(404).json({ error: 'Spec not found' })
        return
      }

      // Find relevant requests and re-infer schema
      const requests = this.proxy.getRequests().filter((r) => {
        if (r.method.toUpperCase() !== method.toUpperCase()) return false
        const urlObj = new URL(r.url.startsWith('http') ? r.url : `http://dummy${r.url}`)
        return this.matchPath(apiPath, urlObj.pathname)
      })

      if (requests.length === 0) {
        res.status(404).json({ error: 'No requests found for this endpoint' })
        return
      }

      // This is a simplified update: just re-runs inferSchema for this op
      const bodies = requests.map((r) => r.response?.body).filter(Boolean)
      if (bodies.length > 0) {
        const schema = this.proxy.inferSchema(bodies)
        if (spec.paths[apiPath] && spec.paths[apiPath][method.toLowerCase()]) {
          spec.paths[apiPath][method.toLowerCase()].responses['200'].content[
            'application/json'
          ].schema = schema
          await this.proxy.saveSpec(spec)
          res.json(spec)
        } else {
          res.status(404).json({ error: 'Endpoint not found in spec' })
        }
      } else {
        res.json(spec)
      }
    })

    // Serve static files from the Vue build output
    if (fs.existsSync(this.uiDistPath)) {
      this.app.use(express.static(this.uiDistPath, { maxAge: '1d' }))
    }

    // Catch-all: serve index.html for SPA routing (handles all HTTP methods)
    this.app.use((_req: Request, res: Response) => {
      const indexPath = path.join(this.uiDistPath, 'index.html')
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
      } else {
        res.status(404).json({
          error: 'UI not built. Run `npm run build` or start with `npm run dev`.',
        })
      }
    })
  }

  /**
   * Filter requests by method, status code, domain, content type, and full-text search.
   */
  private filterRequests(requests: RequestRecord[], query: FilterQuery): RequestRecord[] {
    let filtered = requests

    // Filter by HTTP method
    if (query.method) {
      const methods = query.method
        .toUpperCase()
        .split(',')
        .map((m) => m.trim())
      filtered = filtered.filter((r) => methods.includes(r.method.toUpperCase()))
    }

    // Filter by status code (supports ranges like "2xx", "4xx", or exact codes)
    if (query.status) {
      const statusFilters = query.status.split(',').map((s) => s.trim())
      filtered = filtered.filter((r) => {
        const status = r.response?.statusCode
        if (!status) return false
        return statusFilters.some((filter) => {
          if (filter.endsWith('xx')) {
            const firstChar = filter.at(0)
            if (!firstChar) return false
            const digit = parseInt(firstChar, 10)
            if (isNaN(digit)) return false
            const rangeStart = digit * 100
            return status >= rangeStart && status < rangeStart + 100
          }
          return status === parseInt(filter, 10)
        })
      })
    }

    // Filter by domain/host
    if (query.domain) {
      const domainLower = query.domain.toLowerCase()
      filtered = filtered.filter((r) => r.url.toLowerCase().includes(domainLower))
    }

    // Filter by content type
    if (query.contentType) {
      const ctLower = query.contentType.toLowerCase()
      filtered = filtered.filter((r) => {
        const reqCt = r.contentType?.toLowerCase() || ''
        const resCt = r.response?.contentType?.toLowerCase() || ''
        return reqCt.includes(ctLower) || resCt.includes(ctLower)
      })
    }

    // Full-text search across URL, method, body
    if (query.search) {
      const searchLower = query.search.toLowerCase()
      filtered = filtered.filter((r) => {
        const urlMatch = r.url.toLowerCase().includes(searchLower)
        const methodMatch = r.method.toLowerCase().includes(searchLower)
        const bodyMatch =
          typeof r.body === 'string' ? r.body.toLowerCase().includes(searchLower) : false
        const responseBodyMatch =
          typeof r.response?.body === 'string'
            ? r.response.body.toLowerCase().includes(searchLower)
            : false
        return urlMatch || methodMatch || bodyMatch || responseBodyMatch
      })
    }

    return filtered
  }

  private matchPath(pattern: string, path: string): boolean {
    const regexSource = pattern.replace(/{[^/]+}/g, '([^/]+)')
    const regex = new RegExp(`^${regexSource}$`)
    return regex.test(path)
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws)

      ws.on('close', () => {
        this.clients.delete(ws)
      })

      ws.on('error', (err: Error) => {
        console.error('WebSocket error:', err.message)
        this.clients.delete(ws)
      })

      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString())
          this.handleClientMessage(ws, msg)
        } catch {
          ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid JSON' } }))
        }
      })

      // Send initial state
      const requests = this.proxy.getRequests()
      ws.send(
        JSON.stringify({
          type: 'init',
          data: requests,
        })
      )
    })
  }

  /**
   * Handle incoming WebSocket messages from the client.
   */
  private handleClientMessage(ws: WebSocket, msg: { type: string; data?: unknown }): void {
    switch (msg.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', data: {} }))
        break
      case 'subscribe':
        ws.send(JSON.stringify({ type: 'subscribed', data: {} }))
        break
      default:
        break
    }
  }

  private setupProxyEvents(): void {
    this.proxy.on('request', (req: RequestRecord) => {
      this.broadcast({
        type: 'request',
        data: req,
      })
    })

    this.proxy.on('response', (req: RequestRecord) => {
      this.broadcast({
        type: 'response',
        data: req,
      })
    })

    this.proxy.on('error', (err: Error) => {
      this.broadcast({
        type: 'error',
        data: { message: err.message },
      })
    })
  }

  private broadcast(message: unknown): void {
    const data = JSON.stringify(message)
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer
        .listen(this.config.uiPort, '127.0.0.1', () => {
          console.log(`UI Server listening on http://127.0.0.1:${this.config.uiPort}`)
          resolve()
        })
        .on('error', reject)
    })
  }

  stop(): void {
    this.wss.close()
    this.httpServer.close()
    console.log('UI Server stopped')
  }
}
