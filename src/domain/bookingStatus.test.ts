import { describe, expect, it } from 'vitest'
import { canDelete, canEdit, getStatus } from './bookingStatus'
import { booking, NOW, TODAY, TOMORROW, YESTERDAY } from './testUtils'

describe('getStatus (now = 10:07 on 2026-10-22)', () => {
  it.each([
    ['yesterday', booking('x', '15:00', '16:00', YESTERDAY), 'past'],
    ['tomorrow', booking('x', '09:00', '10:00', TOMORROW), 'upcoming'],
    ['earlier today', booking('x', '09:00', '10:00', TODAY), 'past'],
    ['ended exactly now', booking('x', '09:00', '10:07', TODAY), 'past'],
    ['started before now', booking('x', '10:00', '11:00', TODAY), 'in-progress'],
    ['starts exactly now', booking('x', '10:07', '11:00', TODAY), 'in-progress'],
    ['starts later today', booking('x', '10:15', '11:00', TODAY), 'upcoming'],
  ])('%s -> %s', (_label, b, expected) => {
    expect(getStatus(b, NOW)).toBe(expected)
  })
})

describe('editability', () => {
  it('only past bookings are read-only', () => {
    expect(canEdit('past')).toBe(false)
    expect(canDelete('past')).toBe(false)
    expect(canEdit('in-progress')).toBe(true)
    expect(canDelete('in-progress')).toBe(true)
    expect(canEdit('upcoming')).toBe(true)
  })
})