import test from 'node:test'
import assert from 'node:assert'
import { SpecService } from '../../src/proxy/SpecService'

test('SpecService.inferSchema with multiple samples', () => {
  const service = new SpecService()
  const samples = [
    { name: 'Test', id: 1 },
    { name: 'Test 2', id: 2, optional: true }
  ]
  const schema = service.inferSchema(samples)

  assert.strictEqual(schema.type, 'object')
  assert.strictEqual(schema.properties?.name.type, 'string')
  assert.strictEqual(schema.properties?.id.type, 'integer')
  assert.strictEqual(schema.properties?.optional.type, 'boolean')
  
  // 'optional' should NOT be in required list
  assert.ok(schema.required.includes('name'))
  assert.ok(schema.required.includes('id'))
  assert.ok(!schema.required.includes('optional'))
})

test('SpecService.matchPath', () => {
  const service = new SpecService()
  
  assert.ok(service.matchPath('/api/users/{id}', '/api/users/123'))
  assert.ok(service.matchPath('/api/users/{id}', '/api/users/abc'))
  assert.ok(!service.matchPath('/api/users/{id}', '/api/users/123/posts'))
  assert.ok(service.matchPath('/api/users/{id}/posts', '/api/users/123/posts'))
})

test('SpecService.generateSpec with path parameters', () => {
  const service = new SpecService()
  const mappings = [
    { pattern: '/api/users/{userId}', methods: ['GET'] }
  ]
  const requests: any[] = [
    {
      method: 'GET',
      url: 'http://example.com/api/users/123',
      response: { body: JSON.stringify({ id: 123, name: 'User 123' }) }
    }
  ]
  
  const spec = service.generateSpec(mappings, requests)
  
  assert.ok(spec.paths['/api/users/{userId}'])
  const getOp = spec.paths['/api/users/{userId}'].get
  assert.ok(getOp)
  assert.strictEqual(getOp.parameters.length, 1)
  assert.strictEqual(getOp.parameters[0].name, 'userId')
  assert.strictEqual(getOp.parameters[0].in, 'path')
  
  const responseSchema = getOp.responses['200'].content['application/json'].schema
  assert.strictEqual(responseSchema.type, 'object')
  assert.strictEqual(responseSchema.properties.id.type, 'integer')
  assert.strictEqual(responseSchema.properties.name.type, 'string')
})
