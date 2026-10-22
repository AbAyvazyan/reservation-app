import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { booking, NOW, TODAY, TOMORROW, YESTERDAY } from '../../domain/testUtils'
import { demoControls } from '../../mocks/controls'
import { db } from '../../mocks/db'
import { server } from '../../mocks/node'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BookingPage } from './BookingPage'

function renderPage(date = TOMORROW) {
  window.history.replaceState(null, '', `/?date=${date}`)
  return { user: userEvent.setup(), ...renderWithProviders(<BookingPage />) }
}

beforeEach(() => {
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

describe('day view states', () => {
  it('shows a loading state, then the empty state', async () => {
    renderPage()
    expect(screen.getByText('Loading bookings…')).toBeInTheDocument()
    expect(await screen.findByText('No bookings for this day.')).toBeInTheDocument()
    expect(screen.queryByText('Loading bookings…')).not.toBeInTheDocument()
  })

  it('lists bookings with the free time between them', async () => {
    db.reset([booking('a', '10:00', '11:00', TOMORROW, 'Standup')])
    renderPage()
    expect(await screen.findByText('Standup')).toBeInTheDocument()
    expect(screen.getByText('Free 09:00–10:00')).toBeInTheDocument()
    expect(screen.getByText('Free 11:00–18:00')).toBeInTheDocument()
  })

  it('shows an error with Retry, and recovers', async () => {
    demoControls.failNextRequest()
    const { user } = renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load bookings')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No bookings for this day.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('makes past days read-only', async () => {
    db.reset([booking('p', '10:00', '11:00', YESTERDAY, 'Old sync')])
    renderPage(YESTERDAY)
    expect(await screen.findByText('Old sync')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New booking' })).toBeDisabled()
    expect(screen.getByText(/Past days are read-only/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit booking/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete booking/ })).not.toBeInTheDocument()
  })
})

describe('creating a booking', () => {
  it('books a room and announces success', async () => {
    const { user } = renderPage()
    await screen.findByText('No bookings for this day.')

    await user.click(screen.getByRole('button', { name: 'New booking' }))
    await user.selectOptions(screen.getByLabelText('Start time'), '10:00')
    await user.selectOptions(screen.getByLabelText('End time'), '11:00')
    await user.type(screen.getByLabelText('Title (optional)'), 'Kickoff')
    await user.click(screen.getByRole('button', { name: 'Book room' }))

    expect(await screen.findByText('Booked 10:00–11:00 “Kickoff”.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Edit booking 10:00–11:00 “Kickoff”/ })).toBeInTheDocument()
    expect(db.all()).toHaveLength(1)
    expect(screen.queryByLabelText('Start time')).not.toBeInTheDocument()
  })

  it('disables unavailable end times and allows touching an existing booking', async () => {
    db.reset([booking('a', '11:00', '12:00')])
    const { user } = renderPage()
    await screen.findByText(/Free 09:00–11:00/)

    await user.click(screen.getByRole('button', { name: 'New booking' }))
    await user.selectOptions(screen.getByLabelText('Start time'), '10:00')

    const ends = within(screen.getByLabelText('End time'))
    expect(ends.getByRole('option', { name: '11:00' })).toBeEnabled() // touches 11:00 start
    expect(ends.getByRole('option', { name: '11:15 (unavailable)' })).toBeDisabled()
  })

  it('asks for the missing time instead of submitting an incomplete form', async () => {
    const { user } = renderPage()
    await screen.findByText('No bookings for this day.')
    await user.click(screen.getByRole('button', { name: 'New booking' }))
    await user.click(screen.getByRole('button', { name: 'Book room' }))

    expect(screen.getByText('Choose a start time.')).toBeInTheDocument()
    expect(screen.getByLabelText('Start time')).toHaveFocus()
    expect(db.all()).toHaveLength(0)
  })
})

describe('server conflict (409) when the UI thought the slot was free', () => {
  it('shows a clear message, refreshes the list and keeps everything the user entered', async () => {
    const { user } = renderPage()
    await screen.findByText('No bookings for this day.')

    await user.click(screen.getByRole('button', { name: 'New booking' }))
    await user.selectOptions(screen.getByLabelText('Start time'), '10:00')
    await user.selectOptions(screen.getByLabelText('End time'), '11:00')
    await user.type(screen.getByLabelText('Title (optional)'), 'My meeting')

    // Another user grabs the slot after our list was loaded: the UI still shows it as free.
    db.insert({ date: TOMORROW, start: '10:00', end: '11:00', title: 'Taken first' })
    expect(screen.queryByText('Taken first')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Book room' }))

    // 1. clear message, naming the conflict, announced as an alert and focused
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That time slot is no longer available')
    expect(alert).toHaveTextContent('10:00–11:00 “Taken first”')
    expect(alert).toHaveFocus()

    // 2. the list was refreshed
    expect(await screen.findByText('Taken first')).toBeInTheDocument()

    // 3. nothing the user entered was lost
    expect(screen.getByLabelText('Start time')).toHaveValue('10:00')
    expect(screen.getByLabelText('End time')).toHaveValue('11:00')
    expect(screen.getByLabelText('Title (optional)')).toHaveValue('My meeting')

    // 4. the conflict is now flagged inline using the fresh data, and no booking was created
    expect(await screen.findByText(/Overlaps with 10:00–11:00 “Taken first”/)).toBeInTheDocument()
    expect(db.all().map((b) => b.title)).toEqual(['Taken first'])
  })

  it('lets the user pick another time after a conflict and succeed', async () => {
    const { user } = renderPage()
    await screen.findByText('No bookings for this day.')
    await user.click(screen.getByRole('button', { name: 'New booking' }))
    await user.selectOptions(screen.getByLabelText('Start time'), '10:00')
    await user.selectOptions(screen.getByLabelText('End time'), '11:00')
    db.insert({ date: TOMORROW, start: '10:00', end: '11:00', title: 'Taken first' })
    await user.click(screen.getByRole('button', { name: 'Book room' }))
    await screen.findByRole('alert')

    await user.selectOptions(screen.getByLabelText('Start time'), '11:00')
    await user.selectOptions(screen.getByLabelText('End time'), '12:00')
    await user.click(screen.getByRole('button', { name: 'Book room' }))

    expect(await screen.findByText('Booked 11:00–12:00.')).toBeInTheDocument()
  })
})

describe('other failures keep the entered data', () => {
  it('keeps the form after a server error and succeeds on retry', async () => {
    const { user } = renderPage()
    await screen.findByText('No bookings for this day.')
    await user.click(screen.getByRole('button', { name: 'New booking' }))
    await user.selectOptions(screen.getByLabelText('Start time'), '13:00')
    await user.selectOptions(screen.getByLabelText('End time'), '14:00')

    demoControls.failNextRequest()
    await user.click(screen.getByRole('button', { name: 'Book room' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Server error')
    expect(screen.getByLabelText('Start time')).toHaveValue('13:00')

    await user.click(screen.getByRole('button', { name: 'Book room' }))
    expect(await screen.findByText('Booked 13:00–14:00.')).toBeInTheDocument()
  })

  it('shows a connection message when the network is down', async () => {
    const { user } = renderPage()
    await screen.findByText('No bookings for this day.')
    await user.click(screen.getByRole('button', { name: 'New booking' }))
    await user.selectOptions(screen.getByLabelText('Start time'), '13:00')
    await user.selectOptions(screen.getByLabelText('End time'), '14:00')

    server.use(http.post('*/api/bookings', () => HttpResponse.error()))
    await user.click(screen.getByRole('button', { name: 'Book room' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection problem')
    expect(screen.getByLabelText('End time')).toHaveValue('14:00')
  })
})

describe('editing', () => {
  it('does not conflict with itself and saves', async () => {
    db.reset([booking('a', '10:00', '11:00', TOMORROW, 'Standup')])
    const { user } = renderPage()
    await user.click(await screen.findByRole('button', { name: /Edit booking 10:00–11:00/ }))

    expect(screen.getByRole('heading', { name: 'Edit booking' })).toBeInTheDocument()
    expect(screen.getByLabelText('Start time')).toHaveValue('10:00')
    expect(screen.queryByText(/Overlaps with/)).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('End time'), '11:30')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Updated booking to 10:00–11:30 “Standup”.')).toBeInTheDocument()
  })

  it('offers to recreate when the booking was deleted by someone else', async () => {
    db.reset([booking('a', '10:00', '11:00', TOMORROW, 'Standup')])
    const { user } = renderPage()
    await user.click(await screen.findByRole('button', { name: /Edit booking 10:00–11:00/ }))
    await user.selectOptions(screen.getByLabelText('End time'), '11:30')

    db.remove('a')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('removed by someone else')
    await user.click(screen.getByRole('button', { name: 'Create as new booking' }))

    expect(screen.getByRole('heading', { name: 'New booking' })).toBeInTheDocument()
    expect(screen.getByLabelText('Start time')).toHaveValue('10:00')
    expect(screen.getByLabelText('End time')).toHaveValue('11:30')
    expect(screen.getByLabelText('Title (optional)')).toHaveValue('Standup')
  })
})

describe('deleting', () => {
  it('asks for confirmation, then removes the booking', async () => {
    db.reset([booking('a', '10:00', '11:00', TOMORROW, 'Standup')])
    const { user } = renderPage()
    await user.click(await screen.findByRole('button', { name: /Delete booking 10:00–11:00/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/10:00–11:00 “Standup”/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Deleted 10:00–11:00 “Standup”.')).toBeInTheDocument()
    expect(await screen.findByText('No bookings for this day.')).toBeInTheDocument()
    expect(db.all()).toHaveLength(0)
  })

  it('cancelling leaves the booking alone', async () => {
    db.reset([booking('a', '10:00', '11:00', TOMORROW, 'Standup')])
    const { user } = renderPage()
    await user.click(await screen.findByRole('button', { name: /Delete booking/ }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.all()).toHaveLength(1)
  })

  it('rolls back and explains when the server refuses', async () => {
    db.reset([booking('a', '10:00', '11:00', TOMORROW, 'Standup')])
    const { user } = renderPage()
    await user.click(await screen.findByRole('button', { name: /Delete booking/ }))

    demoControls.failNextRequest()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Could not delete')
    expect(await screen.findByText('Standup')).toBeInTheDocument() // rolled back
    expect(db.all()).toHaveLength(1)
  })
})

describe('editing a meeting that is in progress (now = 10:07)', () => {
  it('shows the locked start as available, keeps end and title editable', async () => {
    db.reset([booking('l', '10:00', '11:00', TODAY, 'Live')])
    const { user } = renderPage(TODAY)
    await user.click(await screen.findByRole('button', { name: /Edit booking 10:00–11:00/ }))

    const start = screen.getByLabelText('Start time')
    expect(start).toBeDisabled()
    expect(start).toHaveValue('10:00')
    // An unavailable option would be labelled "10:00 (unavailable)", so the exact name proves it is offered normally.
    expect(within(start).getByRole('option', { name: '10:00' })).toBeInTheDocument()
    expect(screen.getByText(/start cannot change once the meeting has begun/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('End time'), '10:30')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Updated booking to 10:00–10:30 “Live”.')).toBeInTheDocument()
  })
})

describe('a save that is still in flight', () => {
  it('cannot be hijacked: a late 409 stays on the form that was submitted', async () => {
    db.reset([booking('a', '10:00', '11:00', TOMORROW, 'First'), booking('b', '13:00', '14:00', TOMORROW, 'Second')])
    server.use(
      http.patch('*/api/bookings/:id', async () => {
        await delay(60)
        return HttpResponse.json(
          { code: 'CONFLICT', message: 'taken', details: { conflicts: [] } },
          { status: 409 },
        )
      }),
    )
    const { user } = renderPage()
    await user.click(await screen.findByRole('button', { name: /Edit booking 10:00–11:00/ }))
    await user.selectOptions(screen.getByLabelText('End time'), '11:30')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    // While A is saving, the user tries to open B.
    await user.click(screen.getByRole('button', { name: /Edit booking 13:00–14:00/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('no longer available')
    expect(screen.getByLabelText('Start time')).toHaveValue('10:00') // still A, with its typed end
    expect(screen.getByLabelText('End time')).toHaveValue('11:30')
  })
})
