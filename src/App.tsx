import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiProvider } from './api/ApiProvider'
import { createHttpBookingsApi, type BookingsApi } from './api/bookingsApi'
import { config } from './config'
import { BookingPage } from './features/bookings/BookingPage'
import { DemoControls } from './mocks/DemoControls'
import { createQueryClient } from './queryClient'
import { ErrorBoundary } from './shared/components/ErrorBoundary'

interface Props {
  /** Injection points: tests and a future real backend swap these, nothing else changes. */
  api?: BookingsApi
  queryClient?: QueryClient
}

function App({ api, queryClient }: Props) {
  const [defaultApi] = useState(() => createHttpBookingsApi({ baseUrl: config.apiBaseUrl }))
  const [defaultClient] = useState(createQueryClient)

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient ?? defaultClient}>
        <ApiProvider api={api ?? defaultApi}>
          <BookingPage
            renderDemoControls={config.useMocks ? (date) => <DemoControls date={date} /> : undefined}
          />
        </ApiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App