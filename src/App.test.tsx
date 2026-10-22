import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { createTestQueryClient, testApi } from './test/renderWithProviders'

describe('App', () => {
  it('renders the page with injected api and query client', async () => {
    render(<App api={testApi} queryClient={createTestQueryClient()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Meeting Room Booking' })).toBeInTheDocument()
    expect(await screen.findByText('No bookings for this day.')).toBeInTheDocument()
  })
})