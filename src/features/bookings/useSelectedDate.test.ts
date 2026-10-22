import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { asISODate } from '../../domain/time'
import { useSelectedDate } from './useSelectedDate'

const TODAY = asISODate('2026-10-22')

afterEach(() => window.history.replaceState(null, '', '/'))

describe('useSelectedDate', () => {
  it('defaults to today when the URL has no date', () => {
    const { result } = renderHook(() => useSelectedDate(TODAY))
    expect(result.current[0]).toBe(TODAY)
  })

  it('reads a valid date from the URL', () => {
    window.history.replaceState(null, '', '/?date=2026-11-05')
    const { result } = renderHook(() => useSelectedDate(TODAY))
    expect(result.current[0]).toBe('2026-11-05')
  })

  it.each(['2026-02-30', 'tomorrow', ''])('ignores an invalid date (%j)', (value) => {
    window.history.replaceState(null, '', `/?date=${value}`)
    const { result } = renderHook(() => useSelectedDate(TODAY))
    expect(result.current[0]).toBe(TODAY)
  })

  it('writes the URL when the date changes and clears it for today', () => {
    const { result } = renderHook(() => useSelectedDate(TODAY))

    act(() => result.current[1](asISODate('2026-10-25')))
    expect(result.current[0]).toBe('2026-10-25')
    expect(window.location.search).toBe('?date=2026-10-25')

    act(() => result.current[1](TODAY))
    expect(result.current[0]).toBe(TODAY)
    expect(window.location.search).toBe('')
  })

  it('follows browser back/forward navigation', () => {
    const { result } = renderHook(() => useSelectedDate(TODAY))
    act(() => {
      window.history.replaceState(null, '', '/?date=2026-12-01')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current[0]).toBe('2026-12-01')
  })
})