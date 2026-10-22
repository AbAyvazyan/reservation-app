import { describe, expect, it } from 'vitest'
import { endOptions, startOptions } from './availability'
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