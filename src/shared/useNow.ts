import { useEffect, useState } from 'react'

const MINUTE = 60_000

/**
 * The current time, refreshed on every minute boundary (and when the tab becomes visible again,
 * because background timers are throttled). Availability depends on it: a 10:15 slot must turn
 * unavailable at 10:16 without a user action, and "today" must roll over at midnight.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date())
        schedule()
      }, MINUTE - (Date.now() % MINUTE))
    }
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }

    schedule()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return now
}