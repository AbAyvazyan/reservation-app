import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

let shouldThrow = false

function Flaky() {
  if (shouldThrow) throw new Error('Boom')
  return <p>Content loaded</p>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = false
  })

  // Globals are off in this Vitest setup, so Testing Library cannot auto-cleanup.
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the default fallback when a child throws', () => {
    // React logs caught errors to console.error; silence the expected noise for this test only.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    shouldThrow = true

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    expect(alert).toHaveTextContent('Boom')
  })

  it('re-renders children after "Try again" once the child stops throwing', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    shouldThrow = true

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )

    shouldThrow = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('Content loaded')).toBeInTheDocument()
  })
})