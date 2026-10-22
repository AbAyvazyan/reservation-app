import { getStatus } from './bookingStatus'
import { findConflicts } from './intervals'
import { DAY_END, DAY_START, MAX_DURATION, MIN_DURATION, SLOT_STEP, TITLE_MAX } from './rules'
import { formatTime, minutesOfDay, parseISODate, parseTime, toISODate } from './time'
import type { Booking, BookingDraft, IssueCode, IssueField, ValidationIssue } from './types'

export interface ValidationContext {
  existing: readonly Booking[]
  /** The booking being edited: excluded from overlap checks and subject to status rules. */
  editing?: Booking
  now: Date
}

const describe = (booking: Booking) =>
  `${booking.start}–${booking.end}${booking.title ? ` “${booking.title}”` : ''}`

/**
 * Single source of truth for booking rules. Runs in the UI (to disable options)
 * and in the mock server (to reject requests), so the two can never drift.
 */
export function validateBooking(draft: BookingDraft, ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (code: IssueCode, field: IssueField, message: string, extra?: Partial<ValidationIssue>) =>
    issues.push({ code, field, message, ...extra })

  const date = parseISODate(draft.date)
  const start = parseTime(draft.start)
  const end = parseTime(draft.end)

  if (date === null) add('INVALID_DATE', 'date', 'Choose a valid date.')
  if (start === null) add('INVALID_TIME', 'start', 'Choose a start time.')
  if (end === null) add('INVALID_TIME', 'end', 'Choose an end time.')
  if (draft.title !== undefined && draft.title.trim().length > TITLE_MAX) {
    add('TITLE_TOO_LONG', 'title', `Title must be ${TITLE_MAX} characters or fewer.`)
  }
  if (date === null || start === null || end === null) return issues

  const status = ctx.editing ? getStatus(ctx.editing, ctx.now) : null
  if (ctx.editing && status === 'past') {
    add('NOT_EDITABLE', 'form', 'Past bookings cannot be changed.')
    return issues
  }
  const startLocked = ctx.editing !== undefined && status === 'in-progress'
  if (ctx.editing && startLocked) {
    if (date !== ctx.editing.date) add('START_LOCKED', 'date', 'The date cannot change once the meeting has begun.')
    if (start !== parseTime(ctx.editing.start)) {
      add('START_LOCKED', 'start', 'The start time cannot change once the meeting has begun.')
    }
  }

  const hours = `${formatTime(DAY_START)}–${formatTime(DAY_END)}`
  if (start < DAY_START || start >= DAY_END) add('OUT_OF_HOURS', 'start', `Bookings must be within ${hours}.`)
  if (end < DAY_START || end > DAY_END) add('OUT_OF_HOURS', 'end', `Bookings must be within ${hours}.`)

  if (start >= end) {
    add('START_NOT_BEFORE_END', 'end', 'End time must be after the start time.')
  } else {
    const duration = end - start
    if (duration < MIN_DURATION) add('TOO_SHORT', 'end', `Minimum duration is ${MIN_DURATION} minutes.`)
    if (duration > MAX_DURATION) add('TOO_LONG', 'end', `Maximum duration is ${MAX_DURATION / 60} hours.`)
  }

  if (start % SLOT_STEP !== 0) add('NOT_ON_GRID', 'start', `Times must be on a ${SLOT_STEP}-minute step.`)
  if (end % SLOT_STEP !== 0) add('NOT_ON_GRID', 'end', `Times must be on a ${SLOT_STEP}-minute step.`)

  const today = toISODate(ctx.now)
  const nowMinutes = minutesOfDay(ctx.now)
  if (date < today) {
    add('PAST_DATE', 'date', 'Past dates cannot be booked.')
  } else if (date === today) {
    if (startLocked) {
      if (end <= nowMinutes) add('END_IN_PAST', 'end', 'The end time must be in the future.')
    } else if (start < nowMinutes) {
      add('PAST_TIME', 'start', 'That start time has already passed.')
    }
  }

  if (start < end) {
    const conflicts = findConflicts({ start, end }, date, ctx.existing, ctx.editing?.id)
    if (conflicts.length > 0) {
      add('OVERLAP', 'form', `Overlaps with ${conflicts.map(describe).join(', ')}.`, { conflicts })
    }
  }

  return issues
}