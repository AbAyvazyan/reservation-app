import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { db } from '../mocks/db'
import { demoControls } from '../mocks/controls'
import { server } from '../mocks/node'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

beforeEach(() => {
  db.reset([])
  demoControls.reset()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// jsdom does not implement the modal <dialog> API; mirror the bits the app relies on.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

afterAll(() => server.close())