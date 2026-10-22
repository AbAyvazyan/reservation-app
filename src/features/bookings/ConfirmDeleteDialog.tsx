import { useEffect, useId, useRef } from 'react'
import { describeBooking } from '../../domain/format'
import type { Booking } from '../../domain/types'
import { Alert } from '../../shared/components/Alert'
import { Button } from '../../shared/components/Button'
import styles from './bookings.module.css'
import { formatLongDate } from './formatDate'

interface Props {
  booking: Booking | null
  pending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** Native modal <dialog>: the browser provides the focus trap, Esc handling and focus restore. */
export function ConfirmDeleteDialog({ booking, pending, error, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (booking && !dialog.open) dialog.showModal()
    if (!booking && dialog.open) dialog.close()
  }, [booking])

  const cancel = () => {
    if (!pending) onCancel()
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        cancel()
      }}
      onClose={() => {
        // The browser can still close a modal dialog itself (e.g. a repeated Esc). Keep React in sync;
        // if a delete is in flight, reopen so the pending state stays visible.
        if (!booking) return
        if (pending) ref.current?.showModal()
        else onCancel()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancel()
      }}
    >
      {booking && (
        <div className={styles.dialogBody}>
          <h2 id={titleId}>Delete this booking?</h2>
          <p>
            {describeBooking(booking)} on {formatLongDate(booking.date)}
          </p>
          {error && (
            <Alert variant="error" title="Could not delete">
              <p>{error}</p>
            </Alert>
          )}
          <div className={styles.actions}>
            <Button onClick={cancel} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" loading={pending} onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}