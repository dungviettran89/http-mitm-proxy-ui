import { JSONFilePreset } from 'lowdb/node'
import * as path from 'path'

export class SpecStore {
  private db!: any
  constructor(private dbPath?: string) {
    this.dbPath = dbPath ?? path.join(process.cwd(), 'specs-db.json')
  }
  async init() {
    this.db = await JSONFilePreset(this.dbPath!, { spec: null })
  }
  async save(spec: any) {
    await this.db.update((data: any) => {
      data.spec = spec
    })
  }
  get() {
    return this.db.data.spec
  }
}
