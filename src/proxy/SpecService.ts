import toJsonSchema from 'to-json-schema'
import type { RequestRecord, PathMapping } from '.'

export class SpecService {
  /**
   * Infers a JSON schema from an array of sample objects.
   */
  inferSchema(bodies: any[]): any {
    if (bodies.length === 0) return {}
    // Simplification: use the first one as representative for now
    // Later we can merge schemas from all samples
    try {
      const body = bodies[0]
      const data = typeof body === 'string' ? JSON.parse(body) : body
      return toJsonSchema(data)
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
          pathOps[method.toLowerCase()] = this.generateOperation(matchingRequests)
        }
      }

      if (Object.keys(pathOps).length > 0) {
        spec.paths[pathPattern] = pathOps
      }
    }

    return spec
  }

  private matchPath(pattern: string, path: string): boolean {
    const regexSource = pattern.replace(/{[^/]+}/g, '([^/]+)')
    const regex = new RegExp(`^${regexSource}$`)
    return regex.test(path)
  }

  private generateOperation(requests: RequestRecord[]): any {
    const operation: any = {
      responses: {
        '200': {
          description: 'Success',
          content: {},
        },
      },
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
