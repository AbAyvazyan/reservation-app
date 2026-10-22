import { describe, expect, it } from 'vitest'
import { booking } from '../../domain/testUtils'
import { closedForm, formReducer, type FormState } from './formReducer'
import type { FormError } from './formError'

const conflict: FormError = { kind: 'conflict', message: 'taken', conflicts: [] }

const typedCreate = (): FormState => {
  let state = formReducer(closedForm(), { type: 'open-create', date: '2026-10-23' })
  state = formReducer(state, { type: 'change', field: 'start', value: '10:00' })
  state = formReducer(state, { type: 'change', field: 'end', value: '11:00' })
  return formReducer(state, { type: 'change', field: 'title', value: 'Kickoff' })
}

describe('formReducer', () => {
  it('opens create with optional prefilled times', () => {
    const state = formReducer(closedForm(), { type: 'open-create', date: '2026-10-23', start: '11:00', end: '12:00' })
    expect(state.mode).toEqual({ kind: 'create' })
    expect(state.values).toEqual({ date: '2026-10-23', start: '11:00', end: '12:00', title: '' })
  })

  it('opens edit populated from the booking', () => {
    const b = booking('a', '10:00', '11:00', '2026-10-23', 'Standup')
    const state = formReducer(closedForm(), { type: 'open-edit', booking: b })
    expect(state.mode).toEqual({ kind: 'edit', booking: b })
    expect(state.values).toEqual({ date: '2026-10-23', start: '10:00', end: '11:00', title: 'Standup' })
  })

  it('keeps every entered value when a submit fails (the 409 requirement)', () => {
    const before = typedCreate()
    const submitting = formReducer(before, { type: 'submit-start' })
    const failed = formReducer(submitting, { type: 'submit-error', error: conflict })

    expect(failed.values).toEqual(before.values)
    expect(failed.mode).toEqual({ kind: 'create' })
    expect(failed.status).toEqual({ kind: 'error', error: conflict })
  })

  it('clears a previous error as soon as the user edits a field, but keeps the values', () => {
    const failed = formReducer(typedCreate(), { type: 'submit-error', error: conflict })
    const edited = formReducer(failed, { type: 'change', field: 'start', value: '12:00' })
    expect(edited.status).toEqual({ kind: 'idle' })
    expect(edited.values).toMatchObject({ start: '12:00', end: '11:00', title: 'Kickoff' })
  })

  it('does not drop the submitting state if a field changes mid-flight', () => {
    const submitting = formReducer(typedCreate(), { type: 'submit-start' })
    expect(formReducer(submitting, { type: 'change', field: 'title', value: 'x' }).status).toEqual({ kind: 'submitting' })
  })

  it('a create draft follows the selected day and keeps its times', () => {
    const state = formReducer(typedCreate(), { type: 'select-date', date: '2026-10-24' })
    expect(state.mode).toEqual({ kind: 'create' })
    expect(state.values).toMatchObject({ date: '2026-10-24', start: '10:00', end: '11:00' })
  })

  it('an edit closes when the selected day changes', () => {
    const editing = formReducer(closedForm(), { type: 'open-edit', booking: booking('a', '10:00', '11:00') })
    expect(formReducer(editing, { type: 'select-date', date: '2026-10-24' }).mode).toEqual({ kind: 'closed' })
  })

  it('close resets the form', () => {
    const state = formReducer(typedCreate(), { type: 'close' })
    expect(state.mode).toEqual({ kind: 'closed' })
    expect(state.values).toMatchObject({ start: '', end: '', title: '' })
  })

  describe('while a save is in flight', () => {
    const submitting = () => formReducer(typedCreate(), { type: 'submit-start' })

    it('ignores attempts to open another form, so a late result cannot land on it', () => {
      const edit = booking('b', '13:00', '14:00')
      expect(formReducer(submitting(), { type: 'open-edit', booking: edit })).toEqual(submitting())
      expect(formReducer(submitting(), { type: 'open-create', date: '2026-10-23' })).toEqual(submitting())
    })

    it('ignores a date change instead of unlocking the form', () => {
      expect(formReducer(submitting(), { type: 'select-date', date: '2026-10-24' })).toEqual(submitting())
    })

    it('still records the outcome', () => {
      const failed = formReducer(submitting(), { type: 'submit-error', error: conflict })
      expect(failed.status).toEqual({ kind: 'error', error: conflict })
    })
  })
})
