'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from './api';   // your existing api.ts

// Thin wrappers so pages get caching for free while still using your api.ts.
export function useApiQuery<T = any>(key: any[], path: string, enabled = true) {
  return useQuery<T>({ queryKey: key, queryFn: () => API.get<T>(path), enabled });
}

export function useApiMutation<T = any>(
  fn: (body: any) => Promise<T>,
  invalidate?: any[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { if (invalidate) qc.invalidateQueries({ queryKey: invalidate }); },
  });
}
