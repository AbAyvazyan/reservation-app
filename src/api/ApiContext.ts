import { createContext, useContext } from 'react'
import type { BookingsApi } from './bookingsApi'

export const ApiContext = createContext<BookingsApi | null>(null)

export function useBookingsApi(): BookingsApi {
  const api = useContext(ApiContext)
  if (api === null) throw new Error('useBookingsApi must be used inside <ApiProvider>.')
  return api
}