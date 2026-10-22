import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 22, 10, 14, 30))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks on the minute boundary, not 60 seconds after mount', () => {
    const { result } = renderHook(() => useNow())
    expect(result.current.getMinutes()).toBe(14)

    act(() => {
      vi.advanceTimersByTime(29_000)
    })
    expect(result.current.getMinutes()).toBe(14)

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current.getMinutes()).toBe(15)
    expect(result.current.getSeconds()).toBe(0)
  })

  it('rolls over to the next day at midnight', () => {
    vi.setSystemTime(new Date(2026, 9, 22, 23, 59, 30))
    const { result } = renderHook(() => useNow())
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(result.current.getDate()).toBe(23)
  })

  it('refreshes immediately when the tab becomes visible again', () => {
    const { result } = renderHook(() => useNow())
    vi.setSystemTime(new Date(2026, 9, 22, 11, 2, 0))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.getHours()).toBe(11)
  })

  it('cleans up its timer on unmount', () => {
    const { unmount } = renderHook(() => useNow())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})