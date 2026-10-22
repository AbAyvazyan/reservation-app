export const config = {
  /** Serve /api from the in-browser MSW mock unless explicitly disabled. */
  useMocks: import.meta.env.VITE_USE_MOCKS !== 'false',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
}