import { findConflicts, toInterval } from '../domain/intervals'
import { DAY_END, SLOT_STEP } from '../domain/rules'
import { asISODate, asTime, formatTime, minutesOfDay, parseTime, toISODate, addDays } from '../domain/time'
import type { Booking, BookingDraft } from '../domain/types'

let bookings = new Map<string, Booking>()
let sequence = 0

function create(date: string, start: string, end: string, title?: string): Booking {
  sequence += 1
  return {
    id: `bk_${sequence}`,
    date: asISODate(date),
    start: asTime(start),
    end: asTime(end),
    ...(title ? { title } : {}),
  }
}

/** Seed relative to `now` so the demo always has content, including a meeting in progress. */
export function buildSeed(now: Date): Booking[] {
  const today = toISODate(now)
  const candidates: Booking[] = []

  const live = Math.floor(minutesOfDay(now) / SLOT_STEP) * SLOT_STEP
  if (live >= parseTime('09:00')! && live + 45 <= DAY_END) {
    candidates.push(create(today, formatTime(live), formatTime(live + 45), 'Live now'))
  }
  candidates.push(
    create(today, '09:30', '10:00', 'Daily standup'),
    create(today, '11:00', '12:00', 'Design review'),
    create(today, '14:00', '15:30', 'Client call'),
    create(addDays(today, 1), '10:00', '11:00', 'Sprint planning'),
    create(addDays(today, 1), '13:00', '14:00', '1:1'),
    create(addDays(today, 2), '09:00', '10:00', 'Retro'),
    create(addDays(today, -1), '10:00', '11:00', 'Weekly sync'),
  )

  const accepted: Booking[] = []
  for (const candidate of candidates) {
    if (findConflicts(toInterval(candidate), candidate.date, accepted).length === 0) accepted.push(candidate)
  }
  return accepted
}

export const db = {
  /** Replace the contents. With no argument, loads the default seed. */
  reset(initial?: Booking[], now = new Date()) {
    sequence = 0
    bookings = new Map((initial ?? buildSeed(now)).map((booking) => [booking.id, booking]))
  },
  all(): Booking[] {
    return [...bookings.values()]
  },
  byDate(date: string): Booking[] {
    return db
      .all()
      .filter((booking) => booking.date === date)
      .sort((a, b) => a.start.localeCompare(b.start))
  },
  get(id: string): Booking | undefined {
    return bookings.get(id)
  },
  insert(draft: BookingDraft): Booking {
    const booking = create(draft.date, draft.start, draft.end, draft.title?.trim())
    bookings.set(booking.id, booking)
    return booking
  },
  replace(booking: Booking) {
    bookings.set(booking.id, booking)
  },
  remove(id: string): boolean {
    return bookings.delete(id)
  },
}

db.reset()