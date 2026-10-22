import { useCallback, useSyncExternalStore } from 'react'
import { parseISODate } from '../../domain/time'
import type { ISODate } from '../../domain/types'

const PARAM = 'date'
const CHANGE_EVENT = 'selected-date-change'

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

const getSnapshot = () => window.location.search

/**
 * The selected day lives in the URL (`?date=YYYY-MM-DD`) so reloads and shared links keep it.
 * A missing or invalid value falls back to today; selecting today clears the parameter.
 */
export function useSelectedDate(today: ISODate): [ISODate, (date: ISODate) => void] {
  const search = useSyncExternalStore(subscribe, getSnapshot, () => '')
  const date = parseISODate(new URLSearchParams(search).get(PARAM) ?? '') ?? today

  const setDate = useCallback(
    (next: ISODate) => {
      const url = new URL(window.location.href)
      if (next === today) url.searchParams.delete(PARAM)
      else url.searchParams.set(PARAM, next)
      window.history.replaceState(null, '', url)
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
    [today],
  )

  return [date, setDate]
}