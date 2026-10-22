import { act, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, ServerError } from '../../api/errors'
import { booking, NOW, TOMORROW } from '../../domain/testUtils'
import { asISODate } from '../../domain/time'
import { db } from '../../mocks/db'
import { server } from '../../mocks/node'
import { renderHookWithProviders } from '../../test/renderWithProviders'
import { useBookings, useCreateBooking, useDeleteBooking } from './hooks'
import { bookingKeys } from './queryKeys'

const DAY = asISODate(TOMORROW)

beforeEach(() => {
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

function setup() {
  return renderHookWithProviders(() => ({
    bookings: useBookings(DAY),
    create: useCreateBooking(),
    remove: useDeleteBooking(),
  }))
}

describe('useBookings', () => {
  it('loads the day and warms the neighbouring days', async () => {
    db.reset([booking('a', '10:00', '11:00')])
    const { result, queryClient } = setup()

    await waitFor(() => expect(result.current.bookings.data).toHaveLength(1))
    await waitFor(() => {
      expect(queryClient.getQueryData(bookingKeys.byDate('2026-10-22'))).toBeDefined()
      expect(queryClient.getQueryData(bookingKeys.byDate('2026-10-24'))).toBeDefined()
    })
  })
})

describe('409 conflict on create', () => {
  it('rejects with ConflictError and refreshes the stale list', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.bookings.data).toEqual([]))

    // Another user books the slot after our list was fetched: the UI still believes it is free.
    db.insert({ date: TOMORROW, start: '10:00', end: '11:00', title: 'Taken' })
    expect(result.current.bookings.data).toEqual([])

    await act(async () => {
      result.current.create.mutate({ date: TOMORROW, start: '10:30', end: '11:30' })
    })

    await waitFor(() => expect(result.current.create.error).toBeInstanceOf(ConflictError))
    await waitFor(() => expect(result.current.bookings.data).toHaveLength(1))
    expect(result.current.bookings.data?.[0]).toMatchObject({ title: 'Taken' })
  })
})

describe('optimistic delete', () => {
  it('removes the booking immediately and keeps it removed on success', async () => {
    db.reset([booking('a', '10:00', '11:00')])
    const { result } = setup()
    await waitFor(() => expect(result.current.bookings.data).toHaveLength(1))

    await act(async () => {
      result.current.remove.mutate({ id: 'a', date: DAY })
    })
    await waitFor(() => expect(result.current.bookings.data).toEqual([]))
    expect(db.all()).toEqual([])
  })

  it('rolls back and refetches when the server refuses', async () => {
    db.reset([booking('a', '10:00', '11:00')])
    server.use(
      http.delete('*/api/bookings/:id', async () => {
        await delay(50)
        return HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })
      }),
    )
    const { result } = setup()
    await waitFor(() => expect(result.current.bookings.data).toHaveLength(1))

    await act(async () => {
      result.current.remove.mutate({ id: 'a', date: DAY })
    })
    await waitFor(() => expect(result.current.bookings.data).toEqual([])) // optimistic

    await waitFor(() => expect(result.current.remove.error).toBeInstanceOf(ServerError))
    await waitFor(() => expect(result.current.bookings.data).toHaveLength(1)) // rolled back
  })
})