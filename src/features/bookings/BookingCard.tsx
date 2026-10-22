import { canDelete, canEdit, type BookingStatus } from '../../domain/bookingStatus'
import { describeBooking } from '../../domain/format'
import { parseTime } from '../../domain/time'
import type { Booking } from '../../domain/types'
import { Button } from '../../shared/components/Button'
import styles from './bookings.module.css'
import { formatDuration } from './formatDate'

interface Props {
  booking: Booking
  status: BookingStatus
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

const STATUS_CLASS: Record<BookingStatus, string> = {
  upcoming: styles.cardUpcoming,
  'in-progress': styles.cardLive,
  past: styles.cardPast,
}

const STATUS_LABEL: Partial<Record<BookingStatus, string>> = {
  'in-progress': 'In progress',
  past: 'Past',
}

export function BookingCard({ booking, status, onEdit, onDelete }: Props) {
  const label = describeBooking(booking)
  const badge = STATUS_LABEL[status]

  const minutes = (parseTime(booking.end) ?? 0) - (parseTime(booking.start) ?? 0)

  return (
    <li className={`${styles.card} ${STATUS_CLASS[status]}`}>
      <div className={styles.cardTime}>
        <p className={styles.time}>
          {booking.start}–{booking.end}
        </p>
        <p className={styles.duration}>{formatDuration(minutes)}</p>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.title}>{booking.title ?? 'Untitled booking'}</p>
        {badge && (
          <span className={`${styles.badge} ${status === 'in-progress' ? styles.badgeLive : ''}`}>{badge}</span>
        )}
      </div>
      <div className={styles.actions}>
        {canEdit(status) && (
          <Button size="sm" aria-label={`Edit booking ${label}`} onClick={() => onEdit(booking)}>
            Edit
          </Button>
        )}
        {canDelete(status) && (
          <Button size="sm" aria-label={`Delete booking ${label}`} onClick={() => onDelete(booking)}>
            Delete
          </Button>
        )}
      </div>
    </li>
  )
}
