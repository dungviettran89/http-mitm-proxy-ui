import toJsonSchema from 'to-json-schema'

export class SpecService {
  /**
   * Infers a JSON schema from an array of sample objects.
   * For Step 1, it simply takes the first body in the array.
   */
  inferSchema(bodies: any[]): any {
    if (bodies.length === 0) return {}
    // Merge schemas from multiple samples
    // Simplification for Step 1: use the first one
    return toJsonSchema(bodies[0])
  }
}
