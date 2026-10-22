import { freeGaps } from '../../domain/availability'
import { getStatus } from '../../domain/bookingStatus'
import { formatTime, parseTime } from '../../domain/time'
import type { Booking, ISODate } from '../../domain/types'
import { Alert } from '../../shared/components/Alert'
import { Button } from '../../shared/components/Button'
import { Skeleton } from '../../shared/components/Skeleton'
import { BookingCard } from './BookingCard'
import styles from './bookings.module.css'

interface Props {
  date: ISODate
  now: Date
  bookings: Booking[] | undefined
  isPending: boolean
  isError: boolean
  isFetching: boolean
  canCreate: boolean
  onRetry: () => void
  onNew: () => void
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
  onBookGap: (start: string, end: string) => void
}

type Row =
  | { kind: 'booking'; start: number; booking: Booking }
  | { kind: 'gap'; start: number; end: number }

function buildRows(date: ISODate, bookings: Booking[], now: Date): Row[] {
  const rows: Row[] = [
    ...bookings.map((booking): Row => ({ kind: 'booking', start: parseTime(booking.start) ?? 0, booking })),
    ...freeGaps(date, bookings, now).map((gap): Row => ({ kind: 'gap', start: gap.start, end: gap.end })),
  ]
  return rows.sort((a, b) => a.start - b.start)
}

/** One-click booking from a free gap proposes up to an hour; the user can adjust before saving. */
const GAP_PRESET_MINUTES = 60

const presetEnd = (gap: { start: number; end: number }) =>
  formatTime(Math.min(gap.end, gap.start + GAP_PRESET_MINUTES))

export function DayTimeline({
  date,
  now,
  bookings,
  isPending,
  isError,
  isFetching,
  canCreate,
  onRetry,
  onNew,
  onEdit,
  onDelete,
  onBookGap,
}: Props) {
  if (isPending) {
    return (
      <div role="status" aria-busy="true">
        <span className="visually-hidden">Loading bookings…</span>
        <Skeleton lines={4} height="3rem" />
      </div>
    )
  }

  const errorAlert = isError && (
    <Alert variant="error" title={bookings ? 'Could not refresh bookings' : 'Could not load bookings'}>
      <p>Check your connection and try again.</p>
      <Button onClick={onRetry}>Retry</Button>
    </Alert>
  )

  if (!bookings) return <>{errorAlert}</>

  const refreshing = (
    <p className={styles.refreshing} role="status">
      {isFetching ? 'Updating…' : ''}
    </p>
  )

  if (bookings.length === 0) {
    return (
      <>
        {errorAlert}
        {refreshing}
        <div className={styles.empty}>
          <p>No bookings for this day.</p>
          {canCreate && (
            <Button variant="primary" onClick={onNew}>
              Book the room
            </Button>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {errorAlert}
      {refreshing}
      <ol className={styles.list} aria-label="Bookings and free time">
        {buildRows(date, bookings, now).map((row) =>
          row.kind === 'booking' ? (
            <BookingCard
              key={row.booking.id}
              booking={row.booking}
              status={getStatus(row.booking, now)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : (
            <li key={`gap-${row.start}`} className={styles.gap}>
              <span>
                Free {formatTime(row.start)}–{formatTime(row.end)}
              </span>
              {canCreate && (
                <Button
                  aria-label={`Book from ${formatTime(row.start)} to ${presetEnd(row)}`}
                  onClick={() => onBookGap(formatTime(row.start), presetEnd(row))}
                >
                  Book
                </Button>
              )}
            </li>
          ),
        )}
      </ol>
    </>
  )
}