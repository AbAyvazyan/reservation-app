import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api/errors'

const MAX_QUERY_RETRIES = 2

/** Retrying a 4xx cannot help; retrying a network blip or 5xx often does. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500
  return !isClientError && failureCount < MAX_QUERY_RETRIES
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  })
}