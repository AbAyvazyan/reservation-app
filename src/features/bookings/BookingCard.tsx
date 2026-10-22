import { canDelete, canEdit, type BookingStatus } from '../../domain/bookingStatus'
import { describeBooking } from '../../domain/format'
import type { Booking } from '../../domain/types'
import { Button } from '../../shared/components/Button'
import styles from './bookings.module.css'

interface Props {
  booking: Booking
  status: BookingStatus
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

const STATUS_LABEL: Partial<Record<BookingStatus, string>> = {
  'in-progress': 'In progress',
  past: 'Past',
}

export function BookingCard({ booking, status, onEdit, onDelete }: Props) {
  const label = describeBooking(booking)
  const badge = STATUS_LABEL[status]

  return (
    <li className={`${styles.card} ${status === 'past' ? styles.cardPast : ''}`}>
      <div>
        <p className={styles.time}>
          {booking.start}–{booking.end}
          {badge && <span className={styles.badge}>{badge}</span>}
        </p>
        <p className={styles.title}>{booking.title ?? 'Untitled booking'}</p>
      </div>
      <div className={styles.actions}>
        {canEdit(status) && (
          <Button aria-label={`Edit booking ${label}`} onClick={() => onEdit(booking)}>
            Edit
          </Button>
        )}
        {canDelete(status) && (
          <Button aria-label={`Delete booking ${label}`} onClick={() => onDelete(booking)}>
            Delete
          </Button>
        )}
      </div>
    </li>
  )
}