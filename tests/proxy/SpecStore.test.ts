import test from 'node:test'
import assert from 'node:assert'
import { SpecStore } from '../../src/proxy/SpecStore'
import * as fs from 'fs'
import * as path from 'path'

test('SpecStore basic operations', async () => {
  const dbPath = path.join(process.cwd(), 'test-specs-db.json')
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)

  const store = new SpecStore(dbPath)
  await store.init()

  assert.strictEqual(store.get(), null)

  const testSpec = { openapi: '3.0.0', info: { title: 'Test API' } }
  await store.save(testSpec)

  assert.deepStrictEqual(store.get(), testSpec)

  // Reload to check persistence
  const store2 = new SpecStore(dbPath)
  await store2.init()
  assert.deepStrictEqual(store2.get(), testSpec)

  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
})
