import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, type RenderHookOptions, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { ApiProvider } from '../api/ApiProvider'
import { createHttpBookingsApi, type BookingsApi } from '../api/bookingsApi'

export const testApi = createHttpBookingsApi({ baseUrl: 'http://localhost' })

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
}

export function createWrapper(options: { api?: BookingsApi; queryClient?: QueryClient } = {}) {
  const { api = testApi, queryClient = createTestQueryClient() } = options
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiProvider api={api}>{children}</ApiProvider>
      </QueryClientProvider>
    )
  }
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const queryClient = createTestQueryClient()
  return { queryClient, ...render(ui, { wrapper: createWrapper({ queryClient }), ...options }) }
}

export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options: RenderHookOptions<Props> & { queryClient?: QueryClient } = {},
) {
  const { queryClient = createTestQueryClient(), ...rest } = options
  return { queryClient, ...renderHook(hook, { wrapper: createWrapper({ queryClient }), ...rest }) }
}