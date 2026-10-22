import { useReducer, useRef, useState, type ReactNode } from 'react'
import { describeBooking } from '../../domain/format'
import { toISODate } from '../../domain/time'
import type { Booking, ISODate } from '../../domain/types'
import { Alert } from '../../shared/components/Alert'
import { Button } from '../../shared/components/Button'
import { useNow } from '../../shared/useNow'
import { BookingForm } from './BookingForm'
import styles from './bookings.module.css'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import { DatePicker } from './DatePicker'
import { DayTimeline } from './DayTimeline'
import { formatLongDate } from './formatDate'
import { toFormError } from './formError'
import { closedForm, formReducer } from './formReducer'
import { useBookings, useCreateBooking, useDeleteBooking, useUpdateBooking } from './hooks'
import { useSelectedDate } from './useSelectedDate'

interface Notice {
  variant: 'success' | 'info'
  message: string
}

interface Props {
  /** Slot for dev-only tooling; keeps this feature free of any mock-server imports. */
  renderDemoControls?: (date: ISODate) => ReactNode
}

export function BookingPage({ renderDemoControls }: Props) {
  const now = useNow()
  const today = toISODate(now)
  const [date, setDate] = useSelectedDate(today)
  const query = useBookings(date)
  const bookings = query.data

  const [form, dispatch] = useReducer(formReducer, date, closedForm)
  const [trackedDate, setTrackedDate] = useState(date)
  if (trackedDate !== date) {
    // The date can change from outside (back button, link): keep the form consistent during render.
    setTrackedDate(date)
    dispatch({ type: 'select-date', date })
  }

  const createBooking = useCreateBooking()
  const updateBooking = useUpdateBooking()
  const deleteBooking = useDeleteBooking()

  const [notice, setNotice] = useState<Notice | null>(null)
  const [toDelete, setToDelete] = useState<Booking | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const newBookingRef = useRef<HTMLButtonElement>(null)

  const canCreate = date >= today

  function finishForm(message: string) {
    dispatch({ type: 'close' })
    setNotice({ variant: 'success', message })
    newBookingRef.current?.focus()
  }

  function submit() {
    const { mode, values } = form
    const title = values.title.trim()
    const callbacks = {
      onError: (error: unknown) => dispatch({ type: 'submit-error', error: toFormError(error) }),
    }
    dispatch({ type: 'submit-start' })

    if (mode.kind === 'create') {
      createBooking.mutate(
        { date: values.date, start: values.start, end: values.end, title },
        { ...callbacks, onSuccess: (saved) => finishForm(`Booked ${describeBooking(saved)}.`) },
      )
    } else if (mode.kind === 'edit') {
      updateBooking.mutate(
        { id: mode.booking.id, patch: { start: values.start, end: values.end, title } },
        { ...callbacks, onSuccess: (saved) => finishForm(`Updated booking to ${describeBooking(saved)}.`) },
      )
    }
  }

  function closeDeleteDialog() {
    setToDelete(null)
    setDeleteError(null)
    // The dialog restores focus to its trigger, which no longer exists after a delete.
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function confirmDelete() {
    if (!toDelete) return
    const target = toDelete
    deleteBooking.mutate(
      { id: target.id, date: target.date },
      {
        onSuccess: () => {
          if (form.mode.kind === 'edit' && form.mode.booking.id === target.id) dispatch({ type: 'close' })
          setNotice({ variant: 'success', message: `Deleted ${describeBooking(target)}.` })
          closeDeleteDialog()
        },
        onError: (error) => {
          const mapped = toFormError(error)
          if (mapped.kind === 'not-found') {
            setNotice({ variant: 'info', message: 'That booking was already removed by someone else.' })
            closeDeleteDialog()
          } else {
            setDeleteError(mapped.message)
          }
        },
      },
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Meeting Room Booking</h1>
        <p className={styles.muted}>Working hours 09:00–18:00 · bookings of 30 minutes to 2 hours</p>
      </header>

      <DatePicker
        value={date}
        today={today}
        onChange={(next) => {
          setNotice(null)
          setDate(next)
        }}
      />

      {notice && (
        <Alert variant={notice.variant} onDismiss={() => setNotice(null)}>
          <p>{notice.message}</p>
        </Alert>
      )}

      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="day-heading">
          <div className={styles.panelHeader}>
            <h2 id="day-heading" ref={headingRef} tabIndex={-1}>
              {formatLongDate(date)}
            </h2>
            <Button
              ref={newBookingRef}
              variant="primary"
              disabled={!canCreate}
              onClick={() => dispatch({ type: 'open-create', date })}
            >
              New booking
            </Button>
          </div>

          {!canCreate && (
            <Alert variant="info" title="Past day">
              <p>Past days are read-only: you can look, but not book, edit or delete.</p>
            </Alert>
          )}

          <DayTimeline
            date={date}
            now={now}
            bookings={bookings}
            isPending={query.isPending}
            isError={query.isError}
            isFetching={query.isFetching}
            canCreate={canCreate}
            onRetry={() => void query.refetch()}
            onNew={() => dispatch({ type: 'open-create', date })}
            onEdit={(booking) => dispatch({ type: 'open-edit', booking })}
            onDelete={(booking) => {
              setNotice(null)
              setToDelete(booking)
            }}
            onBookGap={(start, end) => dispatch({ type: 'open-create', date, start, end })}
          />
        </section>

        <aside className={styles.panel} aria-label="Booking form">
          {form.mode.kind === 'closed' ? (
            <p className={styles.muted}>
              {canCreate
                ? 'Choose “New booking”, a free slot, or edit an existing booking.'
                : 'Select today or a future day to make a booking.'}
            </p>
          ) : (
            <BookingForm
              key={form.mode.kind === 'edit' ? form.mode.booking.id : 'create'}
              state={form}
              existing={bookings ?? []}
              now={now}
              dispatch={dispatch}
              onSubmit={submit}
              onClose={() => dispatch({ type: 'close' })}
              onRecreate={() =>
                dispatch({
                  type: 'open-create',
                  date: form.values.date,
                  start: form.values.start,
                  end: form.values.end,
                  title: form.values.title,
                })
              }
            />
          )}
        </aside>
      </div>

      {renderDemoControls?.(date)}

      <ConfirmDeleteDialog
        booking={toDelete}
        pending={deleteBooking.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      />
    </div>
  )
}