import { parseTime } from './time'
import type { Booking, ISODate, Interval } from './types'

/** Half-open intervals [start, end): touching boundaries do not overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end
}

export function toInterval(booking: Pick<Booking, 'start' | 'end'>): Interval {
  return { start: parseTime(booking.start) ?? 0, end: parseTime(booking.end) ?? 0 }
}

export function findConflicts(
  interval: Interval,
  date: ISODate,
  existing: readonly Booking[],
  excludeId?: string,
): Booking[] {
  return existing.filter(
    (booking) =>
      booking.date === date && booking.id !== excludeId && overlaps(interval, toInterval(booking)),
  )
}