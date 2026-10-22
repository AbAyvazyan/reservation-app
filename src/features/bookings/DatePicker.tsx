import { addDays, parseISODate } from '../../domain/time'
import type { ISODate } from '../../domain/types'
import { Button } from '../../shared/components/Button'
import styles from './bookings.module.css'

interface Props {
  value: ISODate
  today: ISODate
  onChange: (date: ISODate) => void
}

export function DatePicker({ value, today, onChange }: Props) {
  return (
    <div className={styles.datePicker} role="group" aria-label="Choose date">
      <Button aria-label="Previous day" onClick={() => onChange(addDays(value, -1))}>
        ‹
      </Button>
      <label className={styles.dateField}>
        Date
        <input
          type="date"
          value={value}
          onChange={(event) => {
            const next = parseISODate(event.target.value)
            if (next) onChange(next)
          }}
        />
      </label>
      <Button aria-label="Next day" onClick={() => onChange(addDays(value, 1))}>
        ›
      </Button>
      <Button onClick={() => onChange(today)} disabled={value === today}>
        Today
      </Button>
    </div>
  )
}