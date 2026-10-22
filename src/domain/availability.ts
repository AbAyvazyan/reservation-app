import { DAY_END, DAY_START, MAX_DURATION, MIN_DURATION, SLOT_STEP } from './rules'
import { toInterval } from './intervals'
import { formatTime, minutesOfDay, parseTime, toISODate } from './time'
import type { Booking, Interval, TimeHHmm } from './types'
import { validateBooking, type ValidationContext } from './validation'

export interface TimeOption {
  value: TimeHHmm
  disabled: boolean
  /** Why the option is unavailable; shown to the user and read by screen readers. */
  reason?: string
}

function toOption(value: TimeHHmm, issues: ReturnType<typeof validateBooking>): TimeOption {
  return issues.length === 0
    ? { value, disabled: false }
    : { value, disabled: true, reason: issues[0].message }
}

/** A start is enabled only if at least the minimum-length booking fits from it. */
export function startOptions(date: string, ctx: ValidationContext): TimeOption[] {
  const options: TimeOption[] = []
  for (let start = DAY_START; start <= DAY_END - MIN_DURATION; start += SLOT_STEP) {
    const value = formatTime(start)
    const issues = validateBooking(
      { date, start: value, end: formatTime(start + MIN_DURATION) },
      ctx,
    )
    options.push(toOption(value, issues))
  }
  return options
}

export function endOptions(date: string, start: string, ctx: ValidationContext): TimeOption[] {
  const startMinutes = parseTime(start)
  if (startMinutes === null) return []

  const options: TimeOption[] = []
  const last = Math.min(startMinutes + MAX_DURATION, DAY_END)
  for (let end = startMinutes + MIN_DURATION; end <= last; end += SLOT_STEP) {
    const value = formatTime(end)
    options.push(toOption(value, validateBooking({ date, start, end: value }, ctx)))
  }
  return options
}
/**
 * Bookable gaps in a day: at least MIN_DURATION long, never starting in the past.
 * Used to offer one-click "book this gap" shortcuts in the timeline.
 */
export function freeGaps(date: string, existing: readonly Booking[], now: Date): Interval[] {
  const today = toISODate(now)
  if (date < today) return []

  let cursor = DAY_START
  if (date === today) cursor = Math.max(cursor, Math.ceil(minutesOfDay(now) / SLOT_STEP) * SLOT_STEP)

  const gaps: Interval[] = []
  const sameDay = existing
    .filter((booking) => booking.date === date)
    .map(toInterval)
    .sort((a, b) => a.start - b.start)

  for (const busy of sameDay) {
    if (busy.start - cursor >= MIN_DURATION) gaps.push({ start: cursor, end: busy.start })
    cursor = Math.max(cursor, busy.end)
  }
  if (DAY_END - cursor >= MIN_DURATION) gaps.push({ start: cursor, end: DAY_END })
  return gaps
}
