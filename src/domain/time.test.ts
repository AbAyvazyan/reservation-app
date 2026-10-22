import { afterEach, describe, expect, it, vi } from 'vitest'
import { addDays, asISODate, formatTime, minutesOfDay, parseISODate, parseTime, toISODate } from './time'

describe('parseTime', () => {
  it.each([
    ['00:00', 0],
    ['09:00', 540],
    ['17:45', 1065],
    ['23:59', 1439],
  ])('parses %s to %i minutes', (input, minutes) => {
    expect(parseTime(input)).toBe(minutes)
  })

  it.each(['', '9:00', '09:0', '24:00', '12:60', '09:00:00', ' 09:00', 'ab:cd'])(
    'rejects %j',
    (input) => {
      expect(parseTime(input)).toBeNull()
    },
  )
})

describe('formatTime', () => {
  it('zero-pads and round-trips with parseTime', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(545)).toBe('09:05')
    expect(parseTime(formatTime(1065))).toBe(1065)
  })
})

describe('parseISODate', () => {
  it.each(['2026-10-22', '2028-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(parseISODate(value)).toBe(value)
  })

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '26-10-22', '2026-1-5', '', 'tomorrow'])(
    'rejects %j',
    (value) => {
      expect(parseISODate(value)).toBeNull()
    },
  )

  it('asISODate throws on invalid input', () => {
    expect(() => asISODate('nope')).toThrow()
  })
})

describe('toISODate', () => {
  afterEach(() => vi.useRealTimers())

  it('uses the local calendar date, not UTC', () => {
    // 00:30 local on the 22nd is still the 21st in UTC for any positive UTC offset
    expect(toISODate(new Date(2026, 9, 22, 0, 30))).toBe('2026-10-22')
    // 23:30 local on the 22nd is already the 23rd in UTC for any negative UTC offset
    expect(toISODate(new Date(2026, 9, 22, 23, 30))).toBe('2026-10-22')
  })

  it('zero-pads month and day', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it.each([
    ['2026-10-22', 1, '2026-10-23'],
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2026-10-22', 0, '2026-10-22'],
  ])('%s %i days -> %s', (date, days, expected) => {
    expect(addDays(asISODate(date), days)).toBe(expected)
  })
})

describe('minutesOfDay', () => {
  it('ignores seconds', () => {
    expect(minutesOfDay(new Date(2026, 9, 22, 10, 7, 59))).toBe(607)
  })
})