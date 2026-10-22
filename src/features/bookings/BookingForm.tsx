import { useEffect, useId, useRef, useState, type Dispatch, type FormEvent } from 'react'
import { endOptions, startOptions, type TimeOption } from '../../domain/availability'
import { getStatus } from '../../domain/bookingStatus'
import type { Booking, ValidationIssue } from '../../domain/types'
import { validateBooking } from '../../domain/validation'
import { Alert } from '../../shared/components/Alert'
import { Button } from '../../shared/components/Button'
import styles from './bookings.module.css'
import { formatLongDate } from './formatDate'
import type { FormAction, FormState } from './formReducer'

interface Props {
  state: FormState
  existing: Booking[]
  now: Date
  dispatch: Dispatch<FormAction>
  onSubmit: () => void
  onClose: () => void
  onRecreate: () => void
}

const ERROR_TITLES = {
  conflict: 'That time slot is no longer available',
  validation: 'Please fix the highlighted fields',
  'not-found': 'This booking no longer exists',
  network: 'Connection problem',
  server: 'Server error',
  unknown: 'Something went wrong',
} as const

function TimeSelect({
  id,
  label,
  value,
  options,
  issues,
  disabled,
  hint,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: TimeOption[]
  issues: ValidationIssue[]
  disabled?: boolean
  hint?: string
  onChange: (value: string) => void
}) {
  const describedBy = [issues.length > 0 && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ')
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={issues.length > 0 || undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.value}
            {option.disabled ? ' (unavailable)' : ''}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {issues.length > 0 && (
        <p id={`${id}-error`} className={styles.error}>
          {issues.map((issue) => issue.message).join(' ')}
        </p>
      )}
    </div>
  )
}

export function BookingForm({ state, existing, now, dispatch, onSubmit, onClose, onRecreate }: Props) {
  const { mode, values, status } = state
  const baseId = useId()
  const [attempted, setAttempted] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  const editing = mode.kind === 'edit' ? mode.booking : undefined
  const startLocked = editing !== undefined && getStatus(editing, now) === 'in-progress'
  const submitting = status.kind === 'submitting'
  const ctx = { existing, editing, now }

  const clientIssues = validateBooking(values, ctx)
  const serverIssues = status.kind === 'error' && status.error.kind === 'validation' ? status.error.issues : []
  // Before the first submit attempt, "choose a time" nags would only be noise.
  const visible = [...clientIssues, ...serverIssues].filter(
    (issue, index, all) =>
      (attempted || issue.code !== 'INVALID_TIME') &&
      all.findIndex((other) => other.code === issue.code && other.field === issue.field) === index,
  )
  const forField = (field: ValidationIssue['field']) => visible.filter((issue) => issue.field === field)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const errorKind = status.kind === 'error' ? status.error.kind : null
  useEffect(() => {
    if (errorKind) alertRef.current?.focus()
  }, [errorKind])

  const startId = `${baseId}-start`
  const endId = `${baseId}-end`
  const titleId = `${baseId}-title`

  function handleStartChange(start: string) {
    dispatch({ type: 'change', field: 'start', value: start })
    // An end that no longer fits the new start would be silently wrong; clear it instead.
    const stillOffered = endOptions(values.date, start, ctx).some((option) => option.value === values.end)
    if (values.end && !stillOffered) dispatch({ type: 'change', field: 'end', value: '' })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setAttempted(true)
    if (clientIssues.length > 0) {
      const first = clientIssues.find((issue) => issue.field === 'start' || issue.field === 'end' || issue.field === 'title')
      const target = first?.field === 'start' ? startId : first?.field === 'end' ? endId : first ? titleId : null
      if (target) document.getElementById(target)?.focus()
      return
    }
    onSubmit()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-labelledby={`${baseId}-heading`}>
      <h2 id={`${baseId}-heading`} ref={headingRef} tabIndex={-1}>
        {mode.kind === 'edit' ? 'Edit booking' : 'New booking'}
      </h2>
      <p className={styles.muted}>{formatLongDate(values.date)}</p>

      {status.kind === 'error' && (
        <Alert ref={alertRef} variant="error" title={ERROR_TITLES[status.error.kind]}>
          <p>{status.error.message}</p>
          {status.error.kind === 'not-found' && mode.kind === 'edit' && (
            <Button onClick={onRecreate}>Create as new booking</Button>
          )}
        </Alert>
      )}

      <fieldset disabled={submitting}>
        <TimeSelect
          id={startId}
          label="Start time"
          value={values.start}
          options={startOptions(values.date, ctx)}
          issues={forField('start')}
          disabled={startLocked && values.start === editing?.start}
          hint={startLocked ? 'The start cannot change once the meeting has begun.' : undefined}
          onChange={handleStartChange}
        />
        <TimeSelect
          id={endId}
          label="End time"
          value={values.end}
          options={endOptions(values.date, values.start, ctx)}
          issues={forField('end')}
          hint={values.start ? undefined : 'Choose a start time first.'}
          onChange={(end) => dispatch({ type: 'change', field: 'end', value: end })}
        />
        <div className={styles.field}>
          <label htmlFor={titleId}>Title (optional)</label>
          <input
            id={titleId}
            value={values.title}
            autoComplete="off"
            aria-invalid={forField('title').length > 0 || undefined}
            aria-describedby={forField('title').length > 0 ? `${titleId}-error` : undefined}
            onChange={(event) => dispatch({ type: 'change', field: 'title', value: event.target.value })}
          />
          {forField('title').length > 0 && (
            <p id={`${titleId}-error`} className={styles.error}>
              {forField('title')[0].message}
            </p>
          )}
        </div>
      </fieldset>

      {(forField('form').length > 0 || forField('date').length > 0) && (
        <ul className={styles.formErrors}>
          {[...forField('date'), ...forField('form')].map((issue) => (
            <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        <Button type="submit" variant="primary" loading={submitting}>
          {submitting ? 'Saving…' : mode.kind === 'edit' ? 'Save changes' : 'Book room'}
        </Button>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
