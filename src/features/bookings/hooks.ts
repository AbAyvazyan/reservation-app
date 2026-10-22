import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useBookingsApi } from '../../api/ApiContext'
import type { BookingPatch } from '../../api/bookingsApi'
import { addDays } from '../../domain/time'
import type { Booking, BookingDraft, ISODate } from '../../domain/types'
import { bookingKeys } from './queryKeys'

const PREFETCH_STALE_MS = 30_000

export function useBookings(date: ISODate) {
  const api = useBookingsApi()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: bookingKeys.byDate(date),
    queryFn: ({ signal }) => api.list(date, signal),
  })

  // Warm the neighbouring days so day-by-day navigation feels instant.
  const loaded = query.isSuccess
  useEffect(() => {
    if (!loaded) return
    for (const neighbour of [addDays(date, -1), addDays(date, 1)]) {
      void queryClient.prefetchQuery({
        queryKey: bookingKeys.byDate(neighbour),
        queryFn: ({ signal }) => api.list(neighbour, signal),
        staleTime: PREFETCH_STALE_MS,
      })
    }
  }, [api, date, loaded, queryClient])

  return query
}

/**
 * Create and update are deliberately NOT optimistic: the server can still answer 409, and
 * showing a booking that then vanishes is worse than a short pending state. After either
 * outcome we refetch, so a rejection always leaves the schedule fresh.
 */
export function useCreateBooking() {
  const api = useBookingsApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draft: BookingDraft) => api.create(draft),
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
  })
}

export function useUpdateBooking() {
  const api = useBookingsApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BookingPatch }) => api.update(id, patch),
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
  })
}

/** Deleting is safe to do optimistically: the user's intent is unambiguous and rollback is trivial. */
export function useDeleteBooking() {
  const api = useBookingsApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; date: ISODate }) => api.remove(id),
    onMutate: async ({ id, date }) => {
      const key = bookingKeys.byDate(date)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Booking[]>(key)
      queryClient.setQueryData<Booking[]>(key, (list) => list?.filter((booking) => booking.id !== id))
      return { previous }
    },
    onError: (_error, { date }, context) => {
      if (context?.previous) queryClient.setQueryData(bookingKeys.byDate(date), context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
  })
}