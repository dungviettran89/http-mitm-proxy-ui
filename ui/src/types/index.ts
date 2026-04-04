export interface ResponseRecord {
  statusCode: number
  statusMessage: string
  headers: Record<string, string>
  body?: string | Buffer
  contentType?: string
  responseTime?: number
}

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

export interface ProxyConfig {
  proxyPort: number
  uiPort: number
  headless: boolean
  enableModification: boolean
  maxRequests: number
}

export interface ApiResponse<T> {
  data: T
  total: number
  limit: number
  offset: number
}

export interface WebSocketMessage {
  type: string
  data: unknown
}

export type SortField = 'timestamp' | 'method' | 'url' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  field: SortField
  direction: SortDirection
}

export interface FilterState {
  method: string
  status: string
  domain: string
  contentType: string
  search: string
}

export type ExportFormat = 'json' | 'csv'
export type ExportScope = 'all' | 'filtered' | 'selected'
