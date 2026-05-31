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

export function useEntryList(page: number, limit: number, letter?: string, lang?: string) {
  return useQuery({
    queryKey: ['entries', page, limit, letter ?? '', lang ?? ''],
    queryFn: () => dictionaryApi.listEntries(page, limit, letter, lang),
    placeholderData: (prev) => prev,
  });
}
