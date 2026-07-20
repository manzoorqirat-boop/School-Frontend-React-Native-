'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// TanStack Query provider — wrap your app root (app/layout.tsx) with this.
// Gives every page automatic caching, background refetch, and loading/error
// states, replacing the raw fetch+useEffect pattern.
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,          // data fresh for 30s — no refetch storms
        refetchOnWindowFocus: true, // silently refresh when tab regains focus
        retry: 1,
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
