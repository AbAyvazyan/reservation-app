import type { Booking } from '../../domain/types'
import type { FormError } from './formError'

export type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; booking: Booking }

export interface FormValues {
  date: string
  start: string
  end: string
  title: string
}

export type SubmitStatus = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'error'; error: FormError }

export interface FormState {
  mode: FormMode
  values: FormValues
  status: SubmitStatus
}

export type FormAction =
  | { type: 'open-create'; date: string; start?: string; end?: string }
  | { type: 'open-edit'; booking: Booking }
  | { type: 'close' }
  | { type: 'change'; field: keyof FormValues; value: string }
  | { type: 'select-date'; date: string }
  | { type: 'submit-start' }
  | { type: 'submit-error'; error: FormError }

export const closedForm = (date = ''): FormState => ({
  mode: { kind: 'closed' },
  values: { date, start: '', end: '', title: '' },
  status: { kind: 'idle' },
})

/**
 * Form state lives here, never derived from query data: a refetch after a 409 must not
 * touch what the user typed. Failed submits change `status` only; `values` survive.
 */
export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'open-create':
      return {
        mode: { kind: 'create' },
        values: { date: action.date, start: action.start ?? '', end: action.end ?? '', title: '' },
        status: { kind: 'idle' },
      }
    case 'open-edit': {
      const { booking } = action
      return {
        mode: { kind: 'edit', booking },
        values: { date: booking.date, start: booking.start, end: booking.end, title: booking.title ?? '' },
        status: { kind: 'idle' },
      }
    }
    case 'close':
      return closedForm(state.values.date)
    case 'change': {
      const values = { ...state.values, [action.field]: action.value }
      // Changing the start can invalidate the chosen end; the UI re-validates, we do not guess.
      return { ...state, values, status: state.status.kind === 'submitting' ? state.status : { kind: 'idle' } }
    }
    case 'select-date':
      // A create draft follows the selected day; an edit belongs to its own day, so it closes.
      return state.mode.kind === 'create'
        ? { ...state, values: { ...state.values, date: action.date }, status: { kind: 'idle' } }
        : closedForm(action.date)
    case 'submit-start':
      return { ...state, status: { kind: 'submitting' } }
    case 'submit-error':
      return { ...state, status: { kind: 'error', error: action.error } }
  }
}