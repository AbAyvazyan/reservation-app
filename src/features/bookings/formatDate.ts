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