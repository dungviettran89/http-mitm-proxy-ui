import toJsonSchema from 'to-json-schema'
import type { RequestRecord, PathMapping } from '.'

const IGNORED_HEADERS = new Set([
  'host',
  'connection',
  'accept',
  'user-agent',
  'content-type',
  'content-length',
  'accept-encoding',
  'accept-language',
  'origin',
  'referer',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
])

export class SpecService {
  /**
   * Infers a JSON schema from an array of sample objects.
   */
  inferSchema(bodies: any[]): any {
    if (bodies.length === 0) return {}

    try {
      const schemas = bodies.map((body) => {
        let data
        console.log(
          'inferSchema body type:',
          typeof body,
          'isBuffer:',
          Buffer.isBuffer(body),
          'constructor:',
          body?.constructor?.name
        )
        if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
          const buf = Buffer.isBuffer(body) ? body : Buffer.from(body)
          try {
            data = JSON.parse(buf.toString('utf-8'))
          } catch {
            data = buf.toString('utf-8')
          }
        } else if (typeof body === 'string') {
          try {
            data = JSON.parse(body)
          } catch {
            data = body
          }
        } else {
          data = body
        }
        return toJsonSchema(data)
      })

      if (schemas.length === 1) return schemas[0]

      // Find all possible properties across all samples
      const allProps = new Set<string>()
      schemas.forEach((s) => {
        if (s.type === 'object' && s.properties) {
          Object.keys(s.properties).forEach((p) => allProps.add(p))
        }
      })

      // Identify required properties (those present in all samples BEFORE we modify anything)
      const required = Array.from(allProps).filter((prop) => {
        return schemas.every(
          (s) =>
            s.type === 'object' &&
            s.properties &&
            Object.prototype.hasOwnProperty.call(s.properties, prop)
        )
      })

      // Construct merged schema
      const mergedSchema: any = {
        type: 'object',
        properties: {},
      }

      allProps.forEach((prop) => {
        const matchingSchema = schemas.find((s) => s.properties && s.properties[prop])
        if (matchingSchema && matchingSchema.properties) {
          mergedSchema.properties[prop] = matchingSchema.properties[prop]
        }
      })

      if (required.length > 0) {
        mergedSchema.required = required
      }

      return mergedSchema
    } catch {
      return { type: 'string' }
    }
  }

  /**
   * Generates a basic OpenAPI 3.0 spec from mappings and requests.
   */
  generateSpec(mappings: PathMapping[], requests: RequestRecord[]): any {
    const spec: any = {
      openapi: '3.0.0',
      info: {
        title: 'Auto-generated API Spec',
        version: '1.0.0',
      },
      paths: {},
    }

    for (const mapping of mappings) {
      const pathPattern = mapping.pattern
      const pathOps: any = {}

      for (const method of mapping.methods) {
        // Find requests that match this pattern and method
        const matchingRequests = requests.filter((r) => {
          if (r.method.toUpperCase() !== method.toUpperCase()) return false
          const urlObj = new URL(r.url.startsWith('http') ? r.url : `http://dummy${r.url}`)
          const pathName = urlObj.pathname
          return this.matchPath(pathPattern, pathName)
        })

        if (matchingRequests.length > 0) {
          pathOps[method.toLowerCase()] = this.generateOperation(pathPattern, matchingRequests)
        }
      }

      if (Object.keys(pathOps).length > 0) {
        spec.paths[pathPattern] = pathOps
      }
    }

    return spec
  }

  public matchPath(pattern: string, path: string): boolean {
    const regexSource = pattern.replace(/{[^/]+}/g, '([^/]+)')
    const regex = new RegExp(`^${regexSource}$`)
    return regex.test(path)
  }

  private generateOperation(pathPattern: string, requests: RequestRecord[]): any {
    const operation: any = {
      responses: {
        '200': {
          description: 'Success',
          content: {},
        },
      },
    }

    operation.parameters = []

    // Add path parameters from pattern (e.g., /api/users/{id})
    const paramMatches = pathPattern.match(/{([^}]+)}/g)
    if (paramMatches) {
      operation.parameters.push(
        ...paramMatches.map((m) => ({
          name: m.slice(1, -1),
          in: 'path',
          required: true,
          schema: { type: 'string' },
        }))
      )
    }

    // Extract query parameters
    const queryParams = new Map<string, string>() // key -> last value
    requests.forEach((r) => {
      try {
        const urlObj = new URL(r.url.startsWith('http') ? r.url : `http://dummy${r.url}`)
        urlObj.searchParams.forEach((val, key) => queryParams.set(key, val))
      } catch (e) {
        // ignore invalid urls
      }
    })

    queryParams.forEach((val, key) => {
      const param: any = {
        name: key,
        in: 'query',
        schema: { type: 'string' },
      }
      if (val) param.example = val
      operation.parameters.push(param)
    })

    // Extract headers (non-standard and authorization)
    const headerParams = new Map<string, { name: string; value: string | undefined }>() // lower -> original info
    requests.forEach((r) => {
      if (r.headers) {
        Object.keys(r.headers).forEach((header) => {
          const lowerHeader = header.toLowerCase()
          if (!IGNORED_HEADERS.has(lowerHeader)) {
            const existing = headerParams.get(lowerHeader)
            headerParams.set(lowerHeader, {
              name: existing ? existing.name : header,
              value: r.headers[header],
            })
          }
        })
      }
    })

    headerParams.forEach((info) => {
      const param: any = {
        name: info.name,
        in: 'header',
        schema: { type: 'string' },
      }
      if (info.value) param.example = info.value
      operation.parameters.push(param)
    })

    if (operation.parameters.length === 0) {
      delete operation.parameters
    }

    // Infer request body schema if any
    const requestBodies = requests
      .map((r) => r.body)
      .filter((b) => b !== undefined && b !== null && b !== '')
    if (requestBodies.length > 0) {
      operation.requestBody = {
        content: {
          'application/json': {
            schema: this.inferSchema(requestBodies),
          },
        },
      }
    }

    // Infer response body schema if any
    const responseBodies = requests
      .map((r) => r.response?.body)
      .filter((b) => b !== undefined && b !== null && b !== '')
    if (responseBodies.length > 0) {
      operation.responses['200'].content['application/json'] = {
        schema: this.inferSchema(responseBodies),
      }
    }

    return operation
  }
}
