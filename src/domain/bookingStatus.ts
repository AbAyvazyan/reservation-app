import { minutesOfDay, parseTime, toISODate } from './time'
import type { Booking } from './types'

export type BookingStatus = 'past' | 'in-progress' | 'upcoming'

export function getStatus(booking: Pick<Booking, 'date' | 'start' | 'end'>, now: Date): BookingStatus {
  const today = toISODate(now)
  if (booking.date < today) return 'past'
  if (booking.date > today) return 'upcoming'

  const nowMinutes = minutesOfDay(now)
  if ((parseTime(booking.end) ?? 0) <= nowMinutes) return 'past'
  if ((parseTime(booking.start) ?? 0) <= nowMinutes) return 'in-progress'
  return 'upcoming'
}

export const canEdit = (status: BookingStatus) => status !== 'past'
export const canDelete = (status: BookingStatus) => status !== 'past'