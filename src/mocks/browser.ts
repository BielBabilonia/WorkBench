import { setupWorker } from 'msw/browser'
import { storage } from '../lib/storage'
import { db } from './db'
import { handlers } from './handlers'
import type { DbState } from './seed'

// Bump when the seed shape changes so old saved data is discarded.
const STORAGE_KEY = 'workbench.db.v1'

/** Changes survive a reload in the browser; "Reset demo data" brings back the seed. */
function persist() {
  const saved = storage.get(STORAGE_KEY)
  if (saved) {
    try {
      db.load(JSON.parse(saved) as DbState)
    } catch {
      // Corrupt data: start from the seed.
    }
  }
  db.subscribe((state) => storage.set(STORAGE_KEY, JSON.stringify(state)))
}

persist()

export const worker = setupWorker(...handlers)
