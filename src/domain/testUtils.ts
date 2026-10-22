import { asISODate, asTime } from './time'
import type { Booking } from './types'

/** Thu 2026-10-22 10:07 local. */
export const NOW = new Date(2026, 9, 22, 10, 7)
export const TODAY = '2026-10-22'
export const TOMORROW = '2026-10-23'
export const YESTERDAY = '2026-10-21'

export function booking(id: string, start: string, end: string, date = TOMORROW, title?: string): Booking {
  return { id, date: asISODate(date), start: asTime(start), end: asTime(end), ...(title ? { title } : {}) }
}