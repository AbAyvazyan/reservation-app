import { findConflicts } from '../domain/intervals'
import { DAY_END, DAY_START, SLOT_STEP } from '../domain/rules'
import { formatTime, minutesOfDay, parseISODate, toISODate } from '../domain/time'
import type { Booking } from '../domain/types'
import { db } from './db'

const SLOW_LATENCY_MS = 2000

type FailTarget = 'any' | 'read' | 'write'

let failNext: FailTarget | null = null
let slow = false

/**
 * Levers for reviewers to see every UI state without opening DevTools.
 * Only DemoControls.tsx should call these.
 */
export const demoControls = {
  /**
   * Make the next matching request fail with a 500. 'read' = GET (loading a day),
   * 'write' = POST/PATCH/DELETE (saving). Scoping keeps background prefetches from eating it.
   */
  failNextRequest(target: FailTarget = 'any') {
    failNext = target
  },
  setSlowNetwork(enabled: boolean) {
    slow = enabled
  },
  isSlowNetwork: () => slow,
  reset() {
    failNext = null
    slow = false
  },

  /**
   * Insert a booking straight into the store, bypassing the UI's cache — as if a colleague
   * booked this room a moment ago. Picks the first free 60 min (else 30 min) slot that is not in the past.
   */
  simulateOtherUserBooking(date: string, now = new Date()): Booking | null {
    const day = parseISODate(date)
    const today = toISODate(now)
    if (day === null || day < today) return null
    const existing = db.byDate(day)

    const earliest =
      day === today ? Math.ceil(minutesOfDay(now) / SLOT_STEP) * SLOT_STEP : DAY_START
    for (const duration of [60, 30]) {
      for (let start = Math.max(earliest, DAY_START); start + duration <= DAY_END; start += SLOT_STEP) {
        const interval = { start, end: start + duration }
        if (findConflicts(interval, day, existing).length === 0) {
          return db.insert({
            date: day,
            start: formatTime(start),
            end: formatTime(start + duration),
            title: 'Booked by someone else',
          })
        }
      }
    }
    return null
  },
}

/** Consumed by the request handlers. */
export function takeInjectedFailure(method: string): boolean {
  if (failNext === null) return false
  const isRead = method === 'GET'
  if ((failNext === 'read' && !isRead) || (failNext === 'write' && isRead)) return false
  failNext = null
  return true
}

export function extraLatency(): number {
  return slow ? SLOW_LATENCY_MS : 0
}