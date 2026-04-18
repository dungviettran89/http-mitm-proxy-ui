import { Proxy } from 'http-mitm-proxy'
import { EventEmitter } from 'events'
import * as crypto from 'crypto'
import { RequestStore } from './RequestStore'
import { SpecStore } from './SpecStore'
import { SpecService } from './SpecService'

export interface RequestRecord {
  id: string
  timestamp: number
  method: string
  url: string
  protocol: string
  headers: Record<string, string>
  body?: string | Buffer
  contentType?: string
  requestTime?: number
  response?: ResponseRecord
}

export interface ResponseRecord {
  statusCode: number
  statusMessage: string
  headers: Record<string, string>
  body?: string | Buffer
  contentType?: string
  responseTime?: number
}

export interface PathMapping {
  pattern: string
  methods: string[]
}

export interface ProxyUIConfig {
  proxyPort: number
  uiPort: number
  sslCaDir?: string
  maxRequests: number
  enableModification: boolean
  headless?: boolean
  dbPath?: string
  caCertPath?: string
  caKeyPath?: string
}

export interface ProxyEvents {
  request: (req: RequestRecord) => void
  response: (req: RequestRecord) => void
  error: (err: Error) => void
}

export class MitmProxy extends EventEmitter {
  private proxy: Proxy
  private store: RequestStore
  private specStore: SpecStore
  private specService: SpecService
  private config: ProxyUIConfig
  private initialized = false

  constructor(config: ProxyUIConfig) {
    super()
    this.config = config
    this.proxy = new Proxy()
    this.store = new RequestStore(config.dbPath)
    this.specStore = new SpecStore(
      config.dbPath ? config.dbPath.replace('requests-db.json', 'specs-db.json') : undefined
    )
    this.specService = new SpecService()
    this.setupProxyHandlers()
  }

  /**
   * Initialize the persistent store. Must be called before any data operations.
   */
  async init(): Promise<void> {
    await Promise.all([this.store.init(), this.specStore.init()])
    this.initialized = true
  }

  private setupProxyHandlers(): void {
    this.proxy.onRequest((ctx, callback) => {
      const id = crypto.randomUUID()
      ;(ctx as any)._requestId = id
      const requestRecord: RequestRecord = {
        id,
        timestamp: Date.now(),
        method: ctx.clientToProxyRequest.method || 'UNKNOWN',
        url: ctx.clientToProxyRequest.url || '',
        protocol: ctx.isSSL ? 'https' : 'http',
        headers: { ...ctx.clientToProxyRequest.headers } as Record<string, string>,
        contentType: ctx.clientToProxyRequest.headers['content-type'] as string | undefined,
      }

      this.store.add(requestRecord).catch((err) => {
        console.error('Failed to persist request:', err)
      })
      this.emit('request', requestRecord)
      return callback()
    })

    this.proxy.onRequestData((ctx, requestData, callback) => {
      const id = this.findRequestId(ctx)
      if (id) {
        const req = this.store.getById(id)
        if (req) {
          req.body = requestData
          this.store.update(req).catch((err) => {
            console.error('Failed to persist request body:', err)
          })
        }
      }
      return callback(undefined, requestData)
    })

    this.proxy.onResponse((ctx, callback) => {
      const id = this.findRequestId(ctx)
      if (id) {
        const req = this.store.getById(id)
        if (req) {
          req.response = {
            statusCode: ctx.serverToProxyResponse?.statusCode || 0,
            statusMessage: ctx.serverToProxyResponse?.statusMessage || '',
            headers: { ...ctx.serverToProxyResponse?.headers } as Record<string, string>,
            contentType: ctx.serverToProxyResponse?.headers['content-type'] as string | undefined,
          }
          req.requestTime = Date.now() - req.timestamp
          this.store.update(req).catch((err) => {
            console.error('Failed to persist response:', err)
          })
          this.emit('response', req)
        }
      }
      return callback()
    })

    this.proxy.onResponseData((ctx, responseData, callback) => {
      const id = this.findRequestId(ctx)
      if (id) {
        const req = this.store.getById(id)
        if (req?.response) {
          req.response.body = responseData
          this.store.update(req).catch((err) => {
            console.error('Failed to persist response body:', err)
          })
        }
      }
      return callback(undefined, responseData)
    })

    this.proxy.onError((ctx, err) => {
      this.emit('error', err || new Error('Unknown proxy error'))
    })
  }

  private findRequestId(ctx: any): string | null {
    return ctx._requestId || null
  }

  async start(): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      this.proxy.listen(
        {
          port: this.config.proxyPort,
          host: '127.0.0.1',
          sslCaDir: this.config.sslCaDir ?? 'ca',
        },
        (err: Error | null | undefined) => {
          if (err) {
            reject(err)
          } else {
            console.log(`MITM Proxy listening on port ${this.config.proxyPort}`)
            resolve()
          }
        }
      )
    })
  }

  stop(): void {
    this.proxy.close()
    console.log('MITM Proxy stopped')
  }

  getRequests(): RequestRecord[] {
    return this.store.getAll()
  }

  getRequest(id: string): RequestRecord | undefined {
    return this.store.getById(id)
  }

  async clearRequests(): Promise<void> {
    await this.store.clear()
  }

  getSpec() {
    return this.specStore.get()
  }

  async saveSpec(spec: any) {
    await this.specStore.save(spec)
  }

  inferSchema(bodies: any[]) {
    return this.specService.inferSchema(bodies)
  }

  matchPath(pattern: string, path: string) {
    return this.specService.matchPath(pattern, path)
  }

  async generateSpec(mappings: PathMapping[]) {
    const requests = this.getRequests()
    const spec = this.specService.generateSpec(mappings, requests)
    await this.saveSpec(spec)
    return spec
  }
}
