import { delay, http, HttpResponse } from 'msw'
import { getStatus } from '../domain/bookingStatus'
import { asISODate, asTime, parseISODate } from '../domain/time'
import type { Booking, BookingDraft, ValidationIssue } from '../domain/types'
import { validateBooking } from '../domain/validation'
import { db } from './db'
import { extraLatency, takeInjectedFailure } from './controls'

export interface HandlerConfig {
  /** Base latency per request in ms. */
  latency: () => number
}

const json = (body: unknown, status = 200) => HttpResponse.json(body as never, { status })

const errorResponse = (status: number, code: string, message: string, details?: unknown) =>
  json({ code, message, details }, status)

/** Narrow an untrusted request body to a draft; the domain validator judges the values. */
function readDraft(body: unknown, fallback?: Booking): BookingDraft | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const input = body as Record<string, unknown>
  const pick = (key: 'date' | 'start' | 'end'): string | undefined => {
    const value = input[key] ?? fallback?.[key]
    return typeof value === 'string' ? value : undefined
  }
  const date = pick('date')
  const start = pick('start')
  const end = pick('end')
  const title = 'title' in input ? input.title : fallback?.title
  if (date === undefined || start === undefined || end === undefined) return null
  if (title !== undefined && title !== null && typeof title !== 'string') return null
  return { date, start, end, ...(typeof title === 'string' ? { title } : {}) }
}

/**
 * Same rules as the UI (shared validator), applied as a real backend would:
 * input problems -> 422, valid-but-taken slot -> 409.
 */
function rejectIfInvalid(draft: BookingDraft, editing?: Booking) {
  const date = parseISODate(draft.date)
  const issues: ValidationIssue[] = validateBooking(draft, {
    existing: date ? db.byDate(date) : [],
    editing,
    now: new Date(),
  })

  const problems = issues.filter((issue) => issue.code !== 'OVERLAP')
  if (problems.length > 0) {
    return errorResponse(422, 'VALIDATION_ERROR', 'The booking is not valid.', problems)
  }
  const overlap = issues.find((issue) => issue.code === 'OVERLAP')
  if (overlap) {
    return errorResponse(409, 'CONFLICT', overlap.message, { conflicts: overlap.conflicts })
  }
  return null
}

export function createHandlers({ latency }: HandlerConfig) {
  /** Simulated network: latency plus the optional one-shot failure from the demo controls. */
  const simulateNetwork = async (method: string) => {
    const ms = latency() + extraLatency()
    if (ms > 0) await delay(ms)
    if (takeInjectedFailure(method)) {
      return errorResponse(500, 'INTERNAL', 'Something went wrong on our side. Please try again.')
    }
    return null
  }

  return [
    http.get('*/api/bookings', async ({ request }) => {
      const failure = await simulateNetwork(request.method)
      if (failure) return failure

      const date = parseISODate(new URL(request.url).searchParams.get('date') ?? '')
      if (date === null) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Query parameter "date" must be YYYY-MM-DD.')
      }
      return json(db.byDate(date))
    }),

    http.post('*/api/bookings', async ({ request }) => {
      const failure = await simulateNetwork(request.method)
      if (failure) return failure

      const draft = readDraft(await request.json().catch(() => null))
      if (draft === null) return errorResponse(400, 'BAD_REQUEST', 'Body must include date, start and end.')

      const rejection = rejectIfInvalid(draft)
      if (rejection) return rejection
      return json(db.insert(draft), 201)
    }),

    http.patch('*/api/bookings/:id', async ({ request, params }) => {
      const failure = await simulateNetwork(request.method)
      if (failure) return failure

      const current = db.get(String(params.id))
      if (current === undefined) return errorResponse(404, 'NOT_FOUND', 'This booking no longer exists.')

      const draft = readDraft(await request.json().catch(() => null), current)
      if (draft === null) return errorResponse(400, 'BAD_REQUEST', 'Body must be a JSON object.')

      const rejection = rejectIfInvalid(draft, current)
      if (rejection) return rejection

      const updated: Booking = {
        id: current.id,
        date: asISODate(draft.date),
        start: asTime(draft.start),
        end: asTime(draft.end),
        ...(draft.title?.trim() ? { title: draft.title.trim() } : {}),
      }
      db.replace(updated)
      return json(updated)
    }),

    http.delete('*/api/bookings/:id', async ({ request, params }) => {
      const failure = await simulateNetwork(request.method)
      if (failure) return failure

      const current = db.get(String(params.id))
      if (current === undefined) return errorResponse(404, 'NOT_FOUND', 'This booking no longer exists.')
      if (getStatus(current, new Date()) === 'past') {
        return errorResponse(422, 'VALIDATION_ERROR', 'Past bookings cannot be changed.', [
          { code: 'NOT_EDITABLE', field: 'form', message: 'Past bookings cannot be changed.' },
        ])
      }
      db.remove(current.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}

export const defaultLatency = () => 300 + Math.random() * 300