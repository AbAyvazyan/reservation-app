import {
  ApiError,
  ApiValidationError,
  ConflictError,
  NetworkError,
  NotFoundError,
  ServerError,
} from './errors'
import { parseConflicts, parseErrorBody, parseIssues } from './parse'

export interface HttpClientOptions {
  /** Prepended to every path. Empty = same origin. */
  baseUrl?: string
  /** Override for tests or custom transports. Resolved per call so global patches (MSW) apply. */
  fetch?: typeof fetch
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  json?: unknown
  signal?: AbortSignal
}

export interface HttpClient {
  /** Resolves with the parsed JSON body, or `undefined` for empty responses (e.g. 204). */
  request(path: string, options?: RequestOptions): Promise<unknown>
}

export function createHttpClient({ baseUrl = '', fetch: fetchImpl }: HttpClientOptions = {}): HttpClient {
  return {
    async request(path, { method = 'GET', json, signal } = {}) {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (json !== undefined) headers['Content-Type'] = 'application/json'

      let response: Response
      try {
        response = await (fetchImpl ?? fetch)(`${baseUrl}${path}`, {
          method,
          headers,
          body: json === undefined ? undefined : JSON.stringify(json),
          signal,
        })
      } catch (error) {
        // Aborts are intentional (e.g. the user switched date): let callers see the original error.
        if (signal?.aborted) throw error
        throw new NetworkError('Could not reach the server. Check your connection and try again.', {
          cause: error,
        })
      }

      const body = await readBody(response)
      if (!response.ok) throw toApiError(response.status, body)
      return body
    },
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text === '') return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export function toApiError(status: number, body: unknown): ApiError {
  const parsed = parseErrorBody(body)
  const message = parsed?.message ?? `Request failed with status ${status}.`

  if (status === 409) return new ConflictError(message, parseConflicts(parsed?.details))
  if (status === 400 || status === 422) return new ApiValidationError(message, status, parseIssues(parsed?.details))
  if (status === 404) return new NotFoundError(message)
  if (status >= 500) return new ServerError(message, status, parsed?.code ?? 'INTERNAL')
  return new ApiError(message, status, parsed?.code ?? 'UNKNOWN')
}