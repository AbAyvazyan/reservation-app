import type { Booking } from './types'

/** Human-readable label, e.g. `10:00–11:00 “Standup”`. */
export function describeBooking(booking: Pick<Booking, 'start' | 'end' | 'title'>): string {
  return `${booking.start}–${booking.end}${booking.title ? ` “${booking.title}”` : ''}`
}