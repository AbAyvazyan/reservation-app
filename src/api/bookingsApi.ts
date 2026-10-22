import type { Booking, BookingDraft } from '../domain/types'
import { createHttpClient, type HttpClient, type HttpClientOptions } from './http'
import { parseBooking, parseBookingList } from './parse'

export type BookingPatch = Partial<BookingDraft>

/** The only thing the UI knows about the backend. Swap the implementation, not the UI. */
export interface BookingsApi {
  list(date: string, signal?: AbortSignal): Promise<Booking[]>
  create(draft: BookingDraft): Promise<Booking>
  update(id: string, patch: BookingPatch): Promise<Booking>
  remove(id: string): Promise<void>
}

export function createHttpBookingsApi(
  options: HttpClientOptions | HttpClient = {},
): BookingsApi {
  const client: HttpClient = 'request' in options ? options : createHttpClient(options)
  const item = (id: string) => `/api/bookings/${encodeURIComponent(id)}`

  return {
    async list(date, signal) {
      const body = await client.request(`/api/bookings?date=${encodeURIComponent(date)}`, { signal })
      return parseBookingList(body)
    },
    async create(draft) {
      return parseBooking(await client.request('/api/bookings', { method: 'POST', json: draft }))
    },
    async update(id, patch) {
      return parseBooking(await client.request(item(id), { method: 'PATCH', json: patch }))
    },
    async remove(id) {
      await client.request(item(id), { method: 'DELETE' })
    },
  }
}