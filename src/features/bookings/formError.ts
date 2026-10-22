import { ApiValidationError, ConflictError, NetworkError, NotFoundError, ServerError } from '../../api/errors'
import { describeBooking } from '../../domain/format'
import type { Booking, ValidationIssue } from '../../domain/types'

/** What the form needs to know about a failed submit, independent of HTTP details. */
export type FormError =
  | { kind: 'conflict'; message: string; conflicts: Booking[] }
  | { kind: 'validation'; message: string; issues: ValidationIssue[] }
  | { kind: 'not-found'; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'server'; message: string }
  | { kind: 'unknown'; message: string }

export function toFormError(error: unknown): FormError {
  if (error instanceof ConflictError) {
    const what = error.conflicts.length > 0 ? error.conflicts.map(describeBooking).join(', ') : 'another booking'
    return {
      kind: 'conflict',
      conflicts: error.conflicts,
      message: `That time was just taken by ${what}. The schedule has been refreshed — your entries are still here, so pick another time.`,
    }
  }
  if (error instanceof ApiValidationError) {
    return { kind: 'validation', issues: error.issues, message: error.message }
  }
  if (error instanceof NotFoundError) {
    return { kind: 'not-found', message: 'This booking was removed by someone else.' }
  }
  if (error instanceof NetworkError) {
    return { kind: 'network', message: 'You appear to be offline. Your entries are kept — try again when you are back online.' }
  }
  if (error instanceof ServerError) {
    return { kind: 'server', message: 'The server had a problem. Your entries are kept — please try again.' }
  }
  return { kind: 'unknown', message: 'Something unexpected happened. Your entries are kept — please try again.' }
}