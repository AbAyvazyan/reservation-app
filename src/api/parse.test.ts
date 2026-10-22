import { describe, expect, it } from 'vitest'
import { InvalidResponseError } from './errors'
import { parseBooking, parseBookingList, parseConflicts, parseErrorBody, parseIssues } from './parse'

const valid = { id: 'a', date: '2026-10-23', start: '10:00', end: '11:00', title: 'Standup' }

describe('parseBooking', () => {
  it('accepts a valid booking and drops empty titles', () => {
    expect(parseBooking(valid)).toEqual(valid)
    expect(parseBooking({ ...valid, title: '' })).not.toHaveProperty('title')
    expect(parseBooking({ ...valid, title: undefined })).not.toHaveProperty('title')
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['missing id', { ...valid, id: undefined }],
    ['empty id', { ...valid, id: '' }],
    ['impossible date', { ...valid, date: '2026-02-30' }],
    ['bad start', { ...valid, start: '25:00' }],
    ['bad end', { ...valid, end: '9am' }],
    ['numeric title', { ...valid, title: 5 }],
  ])('rejects %s', (_label, value) => {
    expect(() => parseBooking(value)).toThrow(InvalidResponseError)
  })
})

describe('parseBookingList', () => {
  it('rejects non-arrays and invalid items', () => {
    expect(() => parseBookingList({})).toThrow(InvalidResponseError)
    expect(() => parseBookingList([valid, { id: 'x' }])).toThrow(InvalidResponseError)
    expect(parseBookingList([valid])).toEqual([valid])
  })
})

describe('error body parsing is lenient', () => {
  it('parseErrorBody', () => {
    expect(parseErrorBody({ code: 'CONFLICT', message: 'Nope' })).toEqual({
      code: 'CONFLICT',
      message: 'Nope',
      details: undefined,
    })
    expect(parseErrorBody({ message: 'Only message' })?.code).toBe('UNKNOWN')
    expect(parseErrorBody({ code: 'X' })).toBeNull()
    expect(parseErrorBody('oops')).toBeNull()
  })

  it('parseIssues skips unknown codes/fields and malformed items', () => {
    const issues = parseIssues([
      { code: 'OVERLAP', field: 'form', message: 'Taken' },
      { code: 'MADE_UP', field: 'form', message: 'x' },
      { code: 'TOO_SHORT', field: 'nowhere', message: 'x' },
      'garbage',
    ])
    expect(issues).toEqual([{ code: 'OVERLAP', field: 'form', message: 'Taken' }])
    expect(parseIssues(undefined)).toEqual([])
  })

  it('parseConflicts keeps valid bookings and ignores bad entries', () => {
    expect(parseConflicts({ conflicts: [valid, { nope: true }] })).toEqual([valid])
    expect(parseConflicts(null)).toEqual([])
  })
})