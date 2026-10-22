import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { booking, NOW, TOMORROW } from '../domain/testUtils'
import { db } from '../mocks/db'
import { demoControls } from '../mocks/demoControls'
import { server } from '../mocks/node'
import { createHttpBookingsApi } from './bookingsApi'
import {
  ApiValidationError,
  ConflictError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  ServerError,
} from './errors'

const api = createHttpBookingsApi({ baseUrl: 'http://localhost' })
const draft = (start: string, end: string, extra = {}) => ({ date: TOMORROW, start, end, ...extra })

beforeEach(() => {
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('happy paths against the mock server', () => {
  it('creates, lists (sorted), updates and removes', async () => {
    const late = await api.create(draft('14:00', '15:00', { title: ' Late ' }))
    const early = await api.create(draft('09:00', '10:00'))
    expect(late.title).toBe('Late')

    expect((await api.list(TOMORROW)).map((b) => b.id)).toEqual([early.id, late.id])

    const moved = await api.update(late.id, { start: '15:00', end: '16:00' })
    expect(moved).toMatchObject({ id: late.id, start: '15:00', end: '16:00', title: 'Late' })

    await api.remove(early.id)
    expect((await api.list(TOMORROW)).map((b) => b.id)).toEqual([late.id])
  })

  it('allows touching bookings and lets an edit keep its own slot', async () => {
    const first = await api.create(draft('10:00', '11:00'))
    await expect(api.create(draft('11:00', '12:00'))).resolves.toBeDefined()
    await expect(api.update(first.id, { title: 'Renamed' })).resolves.toMatchObject({ title: 'Renamed' })
  })

  it('returns an empty list for a day without bookings', async () => {
    expect(await api.list(TOMORROW)).toEqual([])
  })
})

describe('error mapping', () => {
  it('409 -> ConflictError carrying the conflicting booking', async () => {
    db.reset([booking('a', '10:00', '11:00', TOMORROW, 'Standup')])
    const error = await api.create(draft('10:30', '11:30')).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).conflicts).toEqual([
      { id: 'a', date: TOMORROW, start: '10:00', end: '11:00', title: 'Standup' },
    ])
    expect((error as ConflictError).message).toContain('Standup')
  })

  it('a stale UI view: slot looked free, another user took it first', async () => {
    const view = await api.list(TOMORROW)
    expect(view).toEqual([])
    demoControls.simulateOtherUserBooking(TOMORROW, NOW)
    const taken = db.byDate(TOMORROW)[0]

    await expect(api.create(draft(taken.start, taken.end))).rejects.toBeInstanceOf(ConflictError)
  })

  it('422 -> ApiValidationError with field issues', async () => {
    const error = await api.create(draft('08:00', '08:15')).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiValidationError)
    expect((error as ApiValidationError).issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['OUT_OF_HOURS', 'TOO_SHORT']),
    )
  })

  it('400 -> ApiValidationError for a malformed date query', async () => {
    await expect(api.list('tomorrow')).rejects.toMatchObject({ status: 400 })
  })

  it('404 -> NotFoundError on update and remove', async () => {
    await expect(api.update('missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    await expect(api.remove('missing')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('past bookings cannot be changed or removed', async () => {
    db.reset([booking('p', '09:00', '10:00', '2026-10-21')])
    await expect(api.update('p', { title: 'x' })).rejects.toMatchObject({
      issues: [expect.objectContaining({ code: 'NOT_EDITABLE' })],
    })
    await expect(api.remove('p')).rejects.toBeInstanceOf(ApiValidationError)
  })

  it('500 from the demo control -> ServerError, then recovers', async () => {
    demoControls.failNextRequest()
    await expect(api.list(TOMORROW)).rejects.toBeInstanceOf(ServerError)
    await expect(api.list(TOMORROW)).resolves.toEqual([])
  })

  it('connection failure -> NetworkError', async () => {
    server.use(http.get('*/api/bookings', () => HttpResponse.error()))
    await expect(api.list(TOMORROW)).rejects.toBeInstanceOf(NetworkError)
  })

  it('a non-JSON error body still yields a typed error with the status', async () => {
    server.use(http.get('*/api/bookings', () => new HttpResponse('<h1>Bad gateway</h1>', { status: 502 })))
    await expect(api.list(TOMORROW)).rejects.toMatchObject({ status: 502, name: 'ServerError' })
  })

  it('a 2xx with an unexpected shape -> InvalidResponseError', async () => {
    server.use(http.get('*/api/bookings', () => HttpResponse.json({ items: [] })))
    await expect(api.list(TOMORROW)).rejects.toBeInstanceOf(InvalidResponseError)
  })
})

describe('cancellation', () => {
  it('forwards the AbortSignal and surfaces the abort, not a NetworkError', async () => {
    const controller = new AbortController()
    const request = api.list(TOMORROW, controller.signal)
    controller.abort()

    const error = await request.catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(NetworkError)
    expect((error as Error).name).toBe('AbortError')
  })
})