import { useQuery } from '@tanstack/react-query';
import { dictionaryApi } from '../api/dictionaryApi';
import type { SearchDirection } from '../types/dictionary.types';
import { useDebounce } from '@/shared/hooks/useDebounce';

export function useSearch(params: {
  q: string;
  direction: SearchDirection;
  page: number;
  limit: number;
}) {
  const debouncedQ = useDebounce(params.q, 300);
  const enabled = debouncedQ.trim().length > 0;

  return useQuery({
    queryKey: ['search', debouncedQ, params.direction, params.page, params.limit],
    queryFn: () =>
      dictionaryApi.search({
        q: debouncedQ,
        direction: params.direction,
        page: params.page,
        limit: params.limit,
      }),
    enabled,
    placeholderData: (prev) => prev,
  });
}
