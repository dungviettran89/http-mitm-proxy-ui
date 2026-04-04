import { Proxy } from 'http-mitm-proxy';
import { EventEmitter } from 'events';

export interface RequestRecord {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  protocol: string;
  headers: Record<string, string>;
  body?: string | Buffer;
  contentType?: string;
  requestTime?: number;
  response?: ResponseRecord;
}

export interface ResponseRecord {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body?: string | Buffer;
  contentType?: string;
  responseTime?: number;
}

export interface ProxyUIConfig {
  proxyPort: number;
  uiPort: number;
  sslCaDir?: string;
  maxRequests: number;
  enableModification: boolean;
  headless?: boolean;
}

export interface ProxyEvents {
  request: (req: RequestRecord) => void;
  response: (req: RequestRecord) => void;
  error: (err: Error) => void;
}

export class MitmProxy extends EventEmitter {
  private proxy: Proxy;
  private requests: Map<string, RequestRecord> = new Map();
  private config: ProxyUIConfig;

  constructor(config: ProxyUIConfig) {
    super();
    this.config = config;
    this.proxy = new Proxy();
    this.setupProxyHandlers();
  }

  private setupProxyHandlers(): void {
    this.proxy.onRequest((ctx, callback) => {
      const id = crypto.randomUUID();
      const requestRecord: RequestRecord = {
        id,
        timestamp: Date.now(),
        method: ctx.clientToProxyRequest.method || 'UNKNOWN',
        url: ctx.clientToProxyRequest.url || '',
        protocol: ctx.isSSL ? 'https' : 'http',
        headers: { ...ctx.clientToProxyRequest.headers } as Record<string, string>,
        contentType: ctx.clientToProxyRequest.headers['content-type'] as string | undefined,
      };

      this.requests.set(id, requestRecord);
      this.emit('request', requestRecord);
      return callback();
    });

    this.proxy.onRequestData((ctx, requestData, callback) => {
      const id = this.findRequestId(ctx);
      if (id) {
        const req = this.requests.get(id);
        if (req) {
          req.body = requestData;
        }
      }
      return callback(undefined, requestData);
    });

    this.proxy.onResponse((ctx, callback) => {
      const id = this.findRequestId(ctx);
      if (id) {
        const req = this.requests.get(id);
        if (req) {
          req.response = {
            statusCode: ctx.serverToProxyResponse?.statusCode || 0,
            statusMessage: ctx.serverToProxyResponse?.statusMessage || '',
            headers: { ...ctx.serverToProxyResponse?.headers } as Record<string, string>,
            contentType: ctx.serverToProxyResponse?.headers['content-type'] as string | undefined,
          };
          req.requestTime = Date.now() - req.timestamp;
          this.emit('response', req);
        }
      }
      return callback();
    });

    this.proxy.onResponseData((ctx, responseData, callback) => {
      const id = this.findRequestId(ctx);
      if (id) {
        const req = this.requests.get(id);
        if (req?.response) {
          req.response.body = responseData;
        }
      }
      return callback(undefined, responseData);
    });

    this.proxy.onError((ctx, err) => {
      this.emit('error', err || new Error('Unknown proxy error'));
    });
  }

  private findRequestId(ctx: any): string | null {
    for (const [id, req] of this.requests.entries()) {
      if (req.url === ctx.clientToProxyRequest?.url && req.timestamp > Date.now() - 30000) {
        return id;
      }
    }
    return null;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proxy.listen(
        {
          port: this.config.proxyPort,
          sslCaDir: this.config.sslCaDir ?? 'ca',
        },
        (err: Error | null | undefined) => {
          if (err) {
            reject(err);
          } else {
            console.log(`MITM Proxy listening on port ${this.config.proxyPort}`);
            resolve();
          }
        }
      );
    });
  }

  stop(): void {
    this.proxy.close();
    console.log('MITM Proxy stopped');
  }

  getRequests(): RequestRecord[] {
    return Array.from(this.requests.values());
  }

  getRequest(id: string): RequestRecord | undefined {
    return this.requests.get(id);
  }

  clearRequests(): void {
    this.requests.clear();
  }
}
