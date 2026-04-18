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
