export const bookingKeys = {
  all: ['bookings'] as const,
  byDate: (date: string) => ['bookings', date] as const,
}