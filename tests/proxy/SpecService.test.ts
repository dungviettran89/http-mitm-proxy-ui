import test from 'node:test'
import assert from 'node:assert'
import { SpecService } from '../../src/proxy/SpecService'

test('SpecService.inferSchema', () => {
  const service = new SpecService()
  const samples = [{ name: 'Test', id: 1 }]
  const schema = service.inferSchema(samples)

  assert.strictEqual(schema.type, 'object')
  assert.strictEqual(schema.properties?.name.type, 'string')
  assert.strictEqual(schema.properties?.id.type, 'integer')
})
