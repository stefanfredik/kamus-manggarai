import { useQuery } from '@tanstack/react-query';
import { dictionaryApi } from '../api/dictionaryApi';
import type { SearchDirection } from '../types/dictionary.types';
import { useDebounce } from '@/shared/hooks/useDebounce';

export function useSearch(params: {
  q: string;
  direction: SearchDirection;
  dialectIds: string[];
  page: number;
  limit: number;
}) {
  const debouncedQ = useDebounce(params.q, 300);
  const enabled = debouncedQ.trim().length > 0;

  return useQuery({
    queryKey: ['search', debouncedQ, params.direction, [...params.dialectIds].sort(), params.page, params.limit],
    queryFn: () =>
      dictionaryApi.search({
        q: debouncedQ,
        direction: params.direction,
        dialect_ids: params.dialectIds,
        page: params.page,
        limit: params.limit,
      }),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useDialects() {
  return useQuery({
    queryKey: ['dialects'],
    queryFn: dictionaryApi.listDialects,
    staleTime: 5 * 60_000,
  });
}
