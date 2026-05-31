import { useQuery } from '@tanstack/react-query';
import { dictionaryApi } from '../api/dictionaryApi';

export function useEntryDetail(slug: string | undefined) {
  return useQuery({
    queryKey: ['entry', slug],
    queryFn: () => dictionaryApi.getEntryDetail(slug as string),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}

export function useEntryList(page: number, limit: number, dialectIds: string[]) {
  return useQuery({
    queryKey: ['entries', page, limit, [...dialectIds].sort()],
    queryFn: () => dictionaryApi.listEntries(page, limit, dialectIds),
    placeholderData: (prev) => prev,
  });
}
