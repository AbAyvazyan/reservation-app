import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { db } from '../mocks/db'
import { demoControls } from '../mocks/demoControls'
import { server } from '../mocks/node'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

beforeEach(() => {
  db.reset([])
  demoControls.reset()
})

afterEach(() => server.resetHandlers())

afterAll(() => server.close())