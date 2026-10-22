export type ISODate = string & { readonly __brand: 'ISODate' }
export type TimeHHmm = string & { readonly __brand: 'TimeHHmm' }
export type Minutes = number

export interface Booking {
  id: string
  date: ISODate
  start: TimeHHmm
  end: TimeHHmm
  title?: string
}

/** Raw user/API input: fields are plain strings until validated. */
export interface BookingDraft {
  date: string
  start: string
  end: string
  title?: string
}

export const ISSUE_CODES = [
  'INVALID_DATE',
  'INVALID_TIME',
  'OUT_OF_HOURS',
  'START_NOT_BEFORE_END',
  'TOO_SHORT',
  'TOO_LONG',
  'NOT_ON_GRID',
  'PAST_DATE',
  'PAST_TIME',
  'END_IN_PAST',
  'OVERLAP',
  'TITLE_TOO_LONG',
  'NOT_EDITABLE',
  'START_LOCKED',
] as const
export type IssueCode = (typeof ISSUE_CODES)[number]

export const ISSUE_FIELDS = ['date', 'start', 'end', 'title', 'form'] as const
export type IssueField = (typeof ISSUE_FIELDS)[number]

export interface ValidationIssue {
  code: IssueCode
  field: IssueField
  message: string
  /** Present on OVERLAP: the bookings that block the requested interval. */
  conflicts?: Booking[]
}

export interface Interval {
  start: Minutes
  end: Minutes
}