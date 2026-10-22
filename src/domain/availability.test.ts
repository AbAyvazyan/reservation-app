import { describe, expect, it } from 'vitest'
import { endOptions, freeGaps, startOptions } from './availability'
import { booking, NOW, TODAY, TOMORROW, YESTERDAY } from './testUtils'

const ctx = (existing = [booking('a', '10:00', '11:00')]) => ({ existing, now: NOW })
const enabled = (options: { value: string; disabled: boolean }[]) =>
  options.filter((o) => !o.disabled).map((o) => o.value)

describe('startOptions', () => {
  it('spans the working day on a 15-minute grid, leaving room for the minimum duration', () => {
    const options = startOptions(TOMORROW, ctx([]))
    expect(options[0].value).toBe('09:00')
    expect(options.at(-1)?.value).toBe('17:30')
    expect(options).toHaveLength(35)
    expect(options.every((o) => !o.disabled)).toBe(true)
  })

  it('disables starts inside or too close before an existing booking, but allows touching it', () => {
    const options = startOptions(TOMORROW, ctx())
    const state = (v: string) => options.find((o) => o.value === v)
    expect(state('09:30')?.disabled).toBe(false)
    expect(state('09:45')?.disabled).toBe(true) // 09:45–10:15 overlaps
    expect(state('10:00')?.disabled).toBe(true)
    expect(state('10:45')?.disabled).toBe(true)
    expect(state('11:00')?.disabled).toBe(false)
  })

  it('disables every option on a past date, with a reason', () => {
    const options = startOptions(YESTERDAY, ctx([]))
    expect(options.every((o) => o.disabled && o.reason)).toBe(true)
  })

  it('disables starts before the current time today', () => {
    const options = startOptions(TODAY, ctx([]))
    expect(options.find((o) => o.value === '10:00')?.disabled).toBe(true)
    expect(options.find((o) => o.value === '10:15')?.disabled).toBe(false)
    expect(options.find((o) => o.value === '10:15')?.reason).toBeUndefined()
  })
})

describe('startOptions while editing a meeting in progress', () => {
  it('keeps the booking\'s own start available even after most of it has elapsed', () => {
    const own = booking('l', '10:00', '11:00', TODAY)
    const late = new Date(2026, 9, 22, 10, 45)
    const option = startOptions(TODAY, { existing: [own], editing: own, now: late }).find((o) => o.value === '10:00')
    expect(option).toEqual({ value: '10:00', disabled: false })
  })
})

describe('endOptions', () => {
  it('offers ends from +30 min up to +2 h', () => {
    expect(endOptions(TOMORROW, '12:00', ctx([])).map((o) => o.value)).toEqual([
      '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00',
    ])
  })

  it('stops at the end of the working day', () => {
    expect(endOptions(TOMORROW, '17:00', ctx([])).map((o) => o.value)).toEqual(['17:30', '17:45', '18:00'])
  })

  it('disables ends that would overlap the next booking but allows touching it', () => {
    const options = endOptions(TOMORROW, '09:00', ctx())
    expect(enabled(options)).toEqual(['09:30', '09:45', '10:00'])
    expect(options.find((o) => o.value === '10:15')?.reason).toMatch(/Overlaps with 10:00–11:00/)
  })

  it('returns nothing for an unset or invalid start', () => {
    expect(endOptions(TOMORROW, '', ctx())).toEqual([])
  })

  it('lets the booking being edited extend over its own slot', () => {
    const own = booking('a', '10:00', '11:00')
    const options = endOptions(TOMORROW, '10:00', { existing: [own], editing: own, now: NOW })
    expect(options.every((o) => !o.disabled)).toBe(true)
  })
})
describe('freeGaps (now = 10:07 on 2026-10-22)', () => {
  const g = (date: string, existing: ReturnType<typeof booking>[]) =>
    freeGaps(date, existing, NOW).map((x) => `${x.start / 60}-${x.end / 60}`)

  it('returns the whole working day on an empty future date', () => {
    expect(g(TOMORROW, [])).toEqual(['9-18'])
  })

  it('splits around bookings and keeps touching neighbours gap-free', () => {
    const existing = [booking('a', '10:00', '11:00'), booking('b', '11:00', '12:00'), booking('c', '17:30', '18:00')]
    expect(g(TOMORROW, existing)).toEqual(['9-10', '12-17.5'])
  })

  it('drops gaps shorter than the minimum duration', () => {
    const existing = [booking('a', '09:15', '17:45')]
    expect(g(TOMORROW, existing)).toEqual([]) // 15 min on each side
  })

  it('handles unsorted input and ignores other dates', () => {
    const existing = [booking('b', '14:00', '15:00'), booking('a', '10:00', '11:00'), booking('x', '09:00', '18:00', '2026-10-25')]
    expect(g(TOMORROW, existing)).toEqual(['9-10', '11-14', '15-18'])
  })

  it('starts today from the next grid slot after now', () => {
    expect(g(TODAY, [])).toEqual(['10.25-18']) // 10:07 -> 10:15
  })

  it('treats a meeting in progress as busy from the clipped start', () => {
    expect(g(TODAY, [booking('l', '10:00', '11:00', TODAY)])).toEqual(['11-18'])
  })

  it('has no gaps on past dates', () => {
    expect(g(YESTERDAY, [])).toEqual([])
  })

  it('has no gaps late in the day today', () => {
    expect(freeGaps(TODAY, [], new Date(2026, 9, 22, 17, 45))).toEqual([])
  })
})
