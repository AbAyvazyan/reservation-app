import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  // Globals are off in this Vitest setup, so Testing Library cannot auto-cleanup.
  afterEach(() => {
    cleanup()
  })

  it('uses role="alert" for the error variant', () => {
    render(
      <Alert variant="error" title="Payment failed">
        Try again later
      </Alert>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Try again later')
  })

  it('uses role="status" for the info variant', () => {
    render(
      <Alert variant="info" title="Heads up">
        Room is free after noon
      </Alert>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Room is free after noon')
  })

  it('calls onDismiss when the Dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(
      <Alert variant="warning" title="Careful" onDismiss={onDismiss}>
        Booking overlaps another one
      </Alert>,
    )

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})