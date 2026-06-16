import { Search, Frown } from 'lucide-react';
import type { SearchResult } from '../types/dictionary.types';
import { EntryCard } from './EntryCard';
import { EmptyState } from '@/shared/components/EmptyState';

interface SearchResultProps {
  data?: SearchResult;
  isLoading: boolean;
  isFetching: boolean;
  query: string;
  hasQuery: boolean;
}

// Accent- and case-insensitive normalization, mirroring the backend's
// immutable_unaccent so "woéng" and "woeng" compare equal.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function SearchResultList({ data, isLoading, isFetching, query, hasQuery }: SearchResultProps) {
  if (!hasQuery) {
    return (
      <EmptyState
        icon={<Search className="text-primary-500" />}
        title="Mulai ketik untuk mencari"
        description="Cari kata Manggarai atau padanan Indonesia. Hasil muncul instan saat Anda mengetik."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={<Frown className="text-slate-400" />}
        title={`Tidak ada hasil untuk "${query}"`}
        description={
          data?.suggestions && data.suggestions.length > 0
            ? `Mungkin maksud Anda: ${data.suggestions.join(', ')}`
            : 'Coba periksa ejaan atau pilih arah pencarian yang berbeda.'
        }
      />
    );
  }

  // Split the current page into exact-lemma matches and similar (fuzzy) matches
  // so a query like "rawuk" doesn't silently mix 1 exact hit with 34 lookalikes.
  const nq = normalize(query);
  const exact = data.items.filter((hit) => normalize(hit.lemma) === nq);
  const similar = data.items.filter((hit) => normalize(hit.lemma) !== nq);

  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-sm text-slate-500 dark:text-slate-400" aria-hidden>
          {data.total} hasil
        </p>
        {isFetching && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            <span>Memperbarui…</span>
          </div>
        )}
      </div>

      {/* Screen-reader announcement of result state for the live search. */}
      <p className="sr-only" role="status" aria-live="polite">
        {isFetching
          ? 'Memperbarui hasil pencarian…'
          : `${data.total} hasil untuk ${query}`}
      </p>

      {exact.length > 0 && (
        <div className="space-y-2.5">
          {exact.map((hit) => (
            <EntryCard key={hit.id} item={hit} />
          ))}
        </div>
      )}

      {similar.length > 0 && (
        <>
          {exact.length > 0 && (
            <div className="mb-2.5 mt-5 flex items-center gap-3 px-1">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Kata serupa
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          )}
          <div className="space-y-2.5">
            {similar.map((hit) => (
              <EntryCard key={hit.id} item={hit} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
