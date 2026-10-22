import type { ReactNode } from 'react'
import { ApiContext } from './ApiContext'
import type { BookingsApi } from './bookingsApi'

export function ApiProvider({ api, children }: { api: BookingsApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}