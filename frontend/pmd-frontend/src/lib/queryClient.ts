import { QueryClient } from '@tanstack/react-query'

// Server-state cache. Query functions call the existing api/* helpers (which go
// through requestJson — auth token, CSRF, refresh, error classification), so
// TanStack Query composes with the app's networking layer rather than replacing
// it. Conservative defaults: cache for 30s, retry once, no refetch-on-focus.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
