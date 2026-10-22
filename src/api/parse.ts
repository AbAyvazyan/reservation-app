import {
  ISSUE_CODES,
  ISSUE_FIELDS,
  type Booking,
  type IssueCode,
  type IssueField,
  type ValidationIssue,
} from '../domain/types'
import { parseISODate, parseTime } from '../domain/time'
import { InvalidResponseError } from './errors'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

/** Network data is untrusted: validate instead of casting `res.json()`. */
export function parseBooking(value: unknown): Booking {
  if (!isRecord(value)) throw new InvalidResponseError('Booking must be an object.')
  const { id, date, start, end, title } = value

  const parsedDate = typeof date === 'string' ? parseISODate(date) : null
  if (typeof id !== 'string' || id === '') throw new InvalidResponseError('Booking id is missing.')
  if (parsedDate === null) throw new InvalidResponseError(`Booking ${id} has an invalid date.`)
  if (typeof start !== 'string' || parseTime(start) === null) {
    throw new InvalidResponseError(`Booking ${id} has an invalid start time.`)
  }
  if (typeof end !== 'string' || parseTime(end) === null) {
    throw new InvalidResponseError(`Booking ${id} has an invalid end time.`)
  }
  if (title !== undefined && typeof title !== 'string') {
    throw new InvalidResponseError(`Booking ${id} has an invalid title.`)
  }

  return {
    id,
    date: parsedDate,
    start: start as Booking['start'],
    end: end as Booking['end'],
    ...(title ? { title } : {}),
  }
}

export function parseBookingList(value: unknown): Booking[] {
  if (!Array.isArray(value)) throw new InvalidResponseError('Expected a list of bookings.')
  return value.map(parseBooking)
}

export interface ErrorBody {
  code: string
  message: string
  details?: unknown
}

/** Lenient on purpose: an unreadable error body must not hide the HTTP status. */
export function parseErrorBody(value: unknown): ErrorBody | null {
  if (!isRecord(value) || typeof value.message !== 'string') return null
  return {
    code: typeof value.code === 'string' ? value.code : 'UNKNOWN',
    message: value.message,
    details: value.details,
  }
}

export function parseIssues(details: unknown): ValidationIssue[] {
  if (!Array.isArray(details)) return []
  const issues: ValidationIssue[] = []
  for (const item of details) {
    if (!isRecord(item) || typeof item.message !== 'string') continue
    if (!isOneOf<IssueCode>(ISSUE_CODES, item.code)) continue
    if (!isOneOf<IssueField>(ISSUE_FIELDS, item.field)) continue
    issues.push({ code: item.code, field: item.field, message: item.message })
  }
  return issues
}

export function parseConflicts(details: unknown): Booking[] {
  if (!isRecord(details) || !Array.isArray(details.conflicts)) return []
  const conflicts: Booking[] = []
  for (const item of details.conflicts) {
    try {
      conflicts.push(parseBooking(item))
    } catch {
      // A malformed entry should not turn a useful 409 into a generic error.
    }
  }
  return conflicts
}