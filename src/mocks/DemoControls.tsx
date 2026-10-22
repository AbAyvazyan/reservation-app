import { useState } from 'react'
import type { ISODate } from '../domain/types'
import { Button } from '../shared/components/Button'
import { demoControls } from './controls'
import styles from './DemoControls.module.css'

/** Lets reviewers trigger every edge state without DevTools. Rendered only when mocks are on. */
export function DemoControls({ date }: { date: ISODate }) {
  const [slow, setSlow] = useState(demoControls.isSlowNetwork())
  const [message, setMessage] = useState('')

  return (
    <details className={styles.demo}>
      <summary>Demo controls (mock backend)</summary>
      <p>
        These act on the mock server only. Use them to see how the UI handles conflicts and failures.
      </p>
      <div className={styles.row}>
        <Button
          onClick={() => {
            const taken = demoControls.simulateOtherUserBooking(date)
            setMessage(
              taken
                ? `Someone else just booked ${taken.start}–${taken.end}. This screen does not know yet — try booking that exact time.`
                : 'No free slot left on this day (or the day is in the past).',
            )
          }}
        >
          Simulate another user’s booking
        </Button>
        <Button
          onClick={() => {
            demoControls.failNextRequest('read')
            setMessage('The next load will fail with a 500 (try changing the date).')
          }}
        >
          Fail next load
        </Button>
        <Button
          onClick={() => {
            demoControls.failNextRequest('write')
            setMessage('The next save or delete will fail with a 500.')
          }}
        >
          Fail next save
        </Button>
        <label>
          <input
            type="checkbox"
            checked={slow}
            onChange={(event) => {
              setSlow(event.target.checked)
              demoControls.setSlowNetwork(event.target.checked)
            }}
          />{' '}
          Slow network (+2 s)
        </label>
      </div>
      <p role="status" className={styles.message}>
        {message}
      </p>
    </details>
  )
}