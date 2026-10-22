import type { Booking, ValidationIssue } from '../domain/types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
    this.status = status
    this.code = code
  }
}

/** 409: the requested slot overlaps existing bookings (possibly created by someone else). */
export class ConflictError extends ApiError {
  readonly conflicts: Booking[]

  constructor(message: string, conflicts: Booking[]) {
    super(message, 409, 'CONFLICT')
    this.conflicts = conflicts
  }
}

/** 400/422: the server rejected the input; `issues` map onto form fields. */
export class ApiValidationError extends ApiError {
  readonly issues: ValidationIssue[]

  constructor(message: string, status: number, issues: ValidationIssue[]) {
    super(message, status, 'VALIDATION_ERROR')
    this.issues = issues
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ServerError extends ApiError {}

/** The request never produced an HTTP response (offline, DNS, CORS, ...). */
export class NetworkError extends ApiError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 0, 'NETWORK_ERROR', options)
  }
}

/** The server answered, but not with the shape the contract promises. */
export class InvalidResponseError extends ApiError {
  constructor(message: string) {
    super(message, 0, 'INVALID_RESPONSE')
  }
}