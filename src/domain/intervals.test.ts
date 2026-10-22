import { describe, expect, it } from 'vitest'
import { findConflicts, overlaps } from './intervals'
import { booking, TOMORROW } from './testUtils'
import { asISODate } from './time'

describe('overlaps (half-open intervals)', () => {
  it.each([
    [{ start: 600, end: 660 }, { start: 660, end: 720 }, false], // touching: 10-11 vs 11-12
    [{ start: 660, end: 720 }, { start: 600, end: 660 }, false], // touching, reversed
    [{ start: 600, end: 660 }, { start: 645, end: 705 }, true], // partial
    [{ start: 600, end: 720 }, { start: 630, end: 660 }, true], // contains
    [{ start: 630, end: 660 }, { start: 600, end: 720 }, true], // contained
    [{ start: 600, end: 660 }, { start: 600, end: 660 }, true], // identical
    [{ start: 600, end: 660 }, { start: 700, end: 760 }, false], // apart
  ])('%j vs %j -> %s', (a, b, expected) => {
    expect(overlaps(a, b)).toBe(expected)
  })
})

describe('findConflicts', () => {
  const existing = [
    booking('a', '10:00', '11:00'),
    booking('b', '12:00', '13:00'),
    booking('c', '10:00', '11:00', '2026-10-24'),
  ]
  const date = asISODate(TOMORROW)

  it('returns only same-day overlapping bookings', () => {
    expect(findConflicts({ start: 630, end: 690 }, date, existing).map((b) => b.id)).toEqual(['a'])
  })

  it('allows a booking that touches the boundary', () => {
    expect(findConflicts({ start: 660, end: 720 }, date, existing)).toEqual([])
  })

  it('ignores the booking being edited', () => {
    expect(findConflicts({ start: 600, end: 660 }, date, existing, 'a')).toEqual([])
  })
})