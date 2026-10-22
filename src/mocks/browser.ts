import { setupWorker } from 'msw/browser'
import { db } from './db'
import { createHandlers, defaultLatency } from './handlers'

const worker = setupWorker(...createHandlers({ latency: defaultLatency }))

export function startMockServer() {
  db.reset()
  return worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}