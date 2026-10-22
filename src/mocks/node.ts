import { setupServer } from 'msw/node'
import { createHandlers } from './handlers'

/** For tests: same handlers as the browser, with no artificial latency. */
export const server = setupServer(...createHandlers({ latency: () => 0 }))