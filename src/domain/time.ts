import type { ISODate, Minutes, TimeHHmm } from './types'

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n: number) => String(n).padStart(2, '0')

export function parseTime(value: string): Minutes | null {
  const match = TIME_RE.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

export function formatTime(minutes: Minutes): TimeHHmm {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}` as TimeHHmm
}

export function asTime(value: string): TimeHHmm {
  if (parseTime(value) === null) throw new Error(`Invalid time: ${value}`)
  return value as TimeHHmm
}

/** Accepts only real calendar dates in strict YYYY-MM-DD form. */
export function parseISODate(value: string): ISODate | null {
  const match = DATE_RE.exec(value)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(year, month - 1, day)
  const isReal =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return isReal ? (value as ISODate) : null
}

export function asISODate(value: string): ISODate {
  const parsed = parseISODate(value)
  if (parsed === null) throw new Error(`Invalid date: ${value}`)
  return parsed
}

/** Local calendar date. Never use toISOString(): it converts to UTC and shifts the day. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` as ISODate
}

export function addDays(date: ISODate, days: number): ISODate {
  const [year, month, day] = date.split('-').map(Number)
  return toISODate(new Date(year, month - 1, day + days))
}

/** Whole minutes since local midnight; seconds are ignored. */
export function minutesOfDay(date: Date): Minutes {
  return date.getHours() * 60 + date.getMinutes()
}