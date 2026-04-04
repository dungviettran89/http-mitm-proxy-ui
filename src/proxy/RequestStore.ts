import { JSONFilePreset } from 'lowdb/node'
import * as path from 'path'
import type { RequestRecord, ResponseRecord } from '.'

/**
 * Serializable representation of a Buffer for JSON storage.
 * lowdb stores data as JSON, so Buffers must be converted to this shape.
 */
interface SerializableBuffer {
  __type: 'Buffer'
  data: number[]
}

/** A Buffer or its JSON-serializable representation */
type MaybeBuffer = Buffer | SerializableBuffer

/** RequestRecord with all Buffers converted to SerializableBuffer */
interface SerializableRequestRecord {
  id: string
  timestamp: number
  method: string
  url: string
  protocol: string
  headers: Record<string, string>
  body?: MaybeBuffer
  contentType?: string
  requestTime?: number
  response?: SerializableResponseRecord
}

interface SerializableResponseRecord {
  statusCode: number
  statusMessage: string
  headers: Record<string, string>
  body?: MaybeBuffer
  contentType?: string
  responseTime?: number
}

interface Database {
  requests: SerializableRequestRecord[]
}

/**
 * Convert a Buffer (or plain object with {type, data}) to our serializable form.
 */
function bufferToSerializable(
  value: Buffer | Record<string, unknown> | undefined
): SerializableBuffer | undefined {
  if (!value) return undefined
  // Already a Node.js Buffer
  if (Buffer.isBuffer(value)) {
    return { __type: 'Buffer', data: Array.from(value) }
  }
  // Already our serializable form
  if ('__type' in value && (value as any).__type === 'Buffer') {
    return value as unknown as SerializableBuffer
  }
  // Plain object with data array (from http-mitm-proxy's Buffer.toJSON)
  if ('data' in value && Array.isArray((value as any).data)) {
    return { __type: 'Buffer', data: (value as any).data }
  }
  return undefined
}

/**
 * Convert a serializable buffer back to a real Buffer.
 */
function bufferFromSerializable(value: MaybeBuffer | undefined): Buffer | undefined {
  if (!value) return undefined
  if (Buffer.isBuffer(value)) return value
  if ('__type' in value && (value as SerializableBuffer).__type === 'Buffer') {
    return Buffer.from((value as SerializableBuffer).data)
  }
  // Fallback: plain object with data array
  if ('data' in value && Array.isArray((value as any).data)) {
    return Buffer.from((value as any).data)
  }
  return undefined
}

/**
 * Convert a live RequestRecord to its serializable form for storage.
 */
function toSerializable(req: RequestRecord): SerializableRequestRecord {
  return {
    ...req,
    body: bufferToSerializable(req.body as Buffer | undefined),
    response: req.response
      ? {
          ...req.response,
          body: bufferToSerializable(req.response.body as Buffer | undefined),
        }
      : undefined,
  }
}

/**
 * Convert a stored SerializableRequestRecord back to a live RequestRecord.
 */
function fromSerializable(stored: SerializableRequestRecord): RequestRecord {
  return {
    ...stored,
    body: bufferFromSerializable(stored.body),
    response: stored.response
      ? {
          ...stored.response,
          body: bufferFromSerializable(stored.response.body),
        }
      : undefined,
  }
}

/**
 * Persistent request store backed by a local JSON file via lowdb.
 */
export class RequestStore {
  private db!: Awaited<ReturnType<typeof JSONFilePreset<Database>>>
  private filePath: string

  constructor(dbPath?: string) {
    this.filePath = dbPath ?? path.join(process.cwd(), 'requests-db.json')
  }

  async init(): Promise<this> {
    this.db = await JSONFilePreset<Database>(this.filePath, { requests: [] })
    return this
  }

  /**
   * Add a new request record to the store.
   */
  async add(req: RequestRecord): Promise<void> {
    const serializable = toSerializable(req)
    await this.db.update(({ requests }) => {
      requests.push(serializable)
    })
  }

  /**
   * Update an existing request record (merge by id).
   */
  async update(req: RequestRecord): Promise<void> {
    const serializable = toSerializable(req)
    await this.db.update(({ requests }) => {
      const idx = requests.findIndex((r) => r.id === req.id)
      if (idx >= 0) {
        requests[idx] = serializable
      }
    })
  }

  /**
   * Get all requests, converted back to live form.
   */
  getAll(): RequestRecord[] {
    return this.db.data.requests.map(fromSerializable)
  }

  /**
   * Get a single request by id.
   */
  getById(id: string): RequestRecord | undefined {
    const stored = this.db.data.requests.find((r) => r.id === id)
    return stored ? fromSerializable(stored) : undefined
  }

  /**
   * Clear all stored requests.
   */
  async clear(): Promise<void> {
    await this.db.update(({ requests }) => {
      requests.length = 0
    })
  }
}
