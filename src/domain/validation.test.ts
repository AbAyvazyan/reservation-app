import { describe, expect, it } from 'vitest'
import { booking, NOW, TODAY, TOMORROW, YESTERDAY } from './testUtils'
import type { BookingDraft, ValidationIssue } from './types'
import { validateBooking, type ValidationContext } from './validation'

const ctx = (overrides: Partial<ValidationContext> = {}): ValidationContext => ({
  existing: [],
  now: NOW,
  ...overrides,
})
const draft = (start: string, end: string, date = TOMORROW, title?: string): BookingDraft => ({
  date,
  start,
  end,
  title,
})
const codes = (issues: ValidationIssue[]) => issues.map((i) => i.code)

describe('working hours', () => {
  it.each([
    ['09:00', '10:00'],
    ['17:00', '18:00'],
    ['09:00', '11:00'],
  ])('accepts %s–%s', (start, end) => {
    expect(validateBooking(draft(start, end), ctx())).toEqual([])
  })

  it.each([
    ['08:45', '09:30', 'start'],
    ['17:30', '18:15', 'end'],
    ['18:00', '18:30', 'start'],
    ['07:00', '08:00', 'start'],
  ])('rejects %s–%s (OUT_OF_HOURS on %s)', (start, end, field) => {
    const issues = validateBooking(draft(start, end), ctx())
    expect(issues).toContainEqual(expect.objectContaining({ code: 'OUT_OF_HOURS', field }))
  })
})

describe('start/end order', () => {
  it.each([
    ['11:00', '10:00'],
    ['10:00', '10:00'],
  ])('rejects %s–%s', (start, end) => {
    expect(codes(validateBooking(draft(start, end), ctx()))).toContain('START_NOT_BEFORE_END')
  })

  it('does not also report duration errors for an inverted range', () => {
    const result = codes(validateBooking(draft('11:00', '10:00'), ctx()))
    expect(result).not.toContain('TOO_SHORT')
    expect(result).not.toContain('TOO_LONG')
  })
})

describe('duration', () => {
  it.each([
    ['10:00', '10:15', 'TOO_SHORT'],
    ['10:00', '10:30', null],
    ['10:00', '12:00', null],
    ['10:00', '12:15', 'TOO_LONG'],
    ['09:00', '12:00', 'TOO_LONG'],
  ])('%s–%s -> %s', (start, end, expected) => {
    const result = codes(validateBooking(draft(start, end), ctx()))
    if (expected) expect(result).toContain(expected)
    else expect(result).toEqual([])
  })
})

describe('time grid', () => {
  it.each([
    ['10:10', '11:00', 'start'],
    ['10:00', '10:50', 'end'],
  ])('rejects %s–%s (NOT_ON_GRID on %s)', (start, end, field) => {
    expect(validateBooking(draft(start, end), ctx())).toContainEqual(
      expect.objectContaining({ code: 'NOT_ON_GRID', field }),
    )
  })
})

describe('input format', () => {
  it('reports each malformed field', () => {
    const issues = validateBooking({ date: 'nope', start: '', end: '25:00' }, ctx())
    expect(issues).toEqual([
      expect.objectContaining({ code: 'INVALID_DATE', field: 'date' }),
      expect.objectContaining({ code: 'INVALID_TIME', field: 'start' }),
      expect.objectContaining({ code: 'INVALID_TIME', field: 'end' }),
    ])
  })
})

describe('title', () => {
  it('accepts 60 characters and rejects 61 (after trimming)', () => {
    expect(validateBooking(draft('10:00', '11:00', TOMORROW, 'a'.repeat(60)), ctx())).toEqual([])
    expect(validateBooking(draft('10:00', '11:00', TOMORROW, '  ' + 'a'.repeat(60) + '  '), ctx())).toEqual([])
    expect(codes(validateBooking(draft('10:00', '11:00', TOMORROW, 'a'.repeat(61)), ctx()))).toEqual([
      'TITLE_TOO_LONG',
    ])
  })
})

describe('overlap', () => {
  const existing = [booking('a', '10:00', '11:00')]

  it.each([
    ['10:00', '11:00'], // identical
    ['10:30', '11:30'], // starts inside
    ['09:30', '10:30'], // ends inside
    ['09:30', '11:30'], // wraps
  ])('rejects %s–%s', (start, end) => {
    const issues = validateBooking(draft(start, end), ctx({ existing }))
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'OVERLAP', conflicts: [existing[0]] }),
    )
  })

  it.each([
    ['11:00', '12:00'], // starts where the other ends
    ['09:00', '10:00'], // ends where the other starts
  ])('allows touching boundaries: %s–%s', (start, end) => {
    expect(validateBooking(draft(start, end), ctx({ existing }))).toEqual([])
  })

  it('ignores bookings on other dates', () => {
    expect(validateBooking(draft('10:00', '11:00', '2026-10-24'), ctx({ existing }))).toEqual([])
  })

  it('names the conflicting booking in the message', () => {
    const [issue] = validateBooking(draft('10:00', '11:00'), ctx({ existing: [booking('a', '10:00', '11:00', TOMORROW, 'Standup')] }))
    expect(issue.message).toBe('Overlaps with 10:00–11:00 “Standup”.')
  })
})

describe('past time (now = 10:07 on 2026-10-22)', () => {
  it('rejects past dates', () => {
    expect(codes(validateBooking(draft('10:00', '11:00', YESTERDAY), ctx()))).toContain('PAST_DATE')
  })

  it.each([
    ['09:00', '10:00', 'PAST_TIME'],
    ['10:00', '11:00', 'PAST_TIME'], // started before 10:07
    ['10:15', '11:00', null],
    ['16:00', '17:00', null],
  ])('today %s–%s -> %s', (start, end, expected) => {
    const result = codes(validateBooking(draft(start, end, TODAY), ctx()))
    if (expected) expect(result).toContain(expected)
    else expect(result).toEqual([])
  })

  it('allows a start exactly equal to the current minute', () => {
    const now = new Date(2026, 9, 22, 10, 15, 30)
    expect(validateBooking(draft('10:15', '11:00', TODAY), ctx({ now }))).toEqual([])
  })

  it('treats the day boundary correctly just after midnight', () => {
    const now = new Date(2026, 9, 23, 0, 5)
    expect(codes(validateBooking(draft('10:00', '11:00', TODAY), ctx({ now })))).toContain('PAST_DATE')
    expect(validateBooking(draft('10:00', '11:00', TOMORROW), ctx({ now }))).toEqual([])
  })
})

describe('editing', () => {
  const upcoming = booking('a', '10:00', '11:00')

  it('does not conflict with itself', () => {
    expect(validateBooking(draft('10:00', '11:00'), ctx({ existing: [upcoming], editing: upcoming }))).toEqual([])
  })

  it('can extend into its own old slot but still conflicts with others', () => {
    const other = booking('b', '11:00', '12:00')
    const existing = [upcoming, other]
    expect(validateBooking(draft('10:00', '11:00'), ctx({ existing, editing: upcoming }))).toEqual([])
    expect(codes(validateBooking(draft('10:00', '11:30'), ctx({ existing, editing: upcoming })))).toEqual(['OVERLAP'])
  })

  it('rejects moving an upcoming booking into the past', () => {
    const today = booking('t', '15:00', '16:00', TODAY)
    expect(codes(validateBooking(draft('09:00', '10:00', TODAY), ctx({ existing: [today], editing: today })))).toContain('PAST_TIME')
  })

  describe('past booking', () => {
    it('is not editable', () => {
      const past = booking('p', '09:00', '10:00', TODAY)
      expect(codes(validateBooking(draft('15:00', '16:00', TODAY), ctx({ existing: [past], editing: past })))).toEqual(['NOT_EDITABLE'])
    })
  })

  describe('in-progress booking', () => {
    const live = booking('l', '10:00', '11:00', TODAY)
    const run = (d: BookingDraft) => validateBooking(d, ctx({ existing: [live], editing: live }))

    it('allows changing only the end', () => {
      expect(run(draft('10:00', '11:30', TODAY))).toEqual([])
      expect(run(draft('10:00', '10:30', TODAY))).toEqual([]) // ending early
    })

    it('locks the start and the date', () => {
      expect(run(draft('10:15', '11:00', TODAY))).toContainEqual(
        expect.objectContaining({ code: 'START_LOCKED', field: 'start' }),
      )
      expect(run(draft('10:00', '11:00', TOMORROW))).toContainEqual(
        expect.objectContaining({ code: 'START_LOCKED', field: 'date' }),
      )
    })

    it('does not flag the already-passed start as PAST_TIME', () => {
      expect(codes(run(draft('10:00', '11:00', TODAY)))).not.toContain('PAST_TIME')
    })

    it('rejects an end that is already in the past', () => {
      const late = new Date(2026, 9, 22, 10, 40)
      const issues = validateBooking(draft('10:00', '10:30', TODAY), ctx({ now: late, existing: [live], editing: live }))
      expect(codes(issues)).toContain('END_IN_PAST')
    })
  })
})