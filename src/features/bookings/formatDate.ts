import type { ISODate } from '../../domain/types'

const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export function formatLongDate(date: ISODate | string): string {
  const [year, month, day] = date.split('-').map(Number)
  return longDate.format(new Date(year, month - 1, day))
}
/** 45 -> "45 min", 60 -> "1 h", 90 -> "1 h 30 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
