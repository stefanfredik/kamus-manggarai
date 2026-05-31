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

export function SearchResultList({ data, isLoading, isFetching, query, hasQuery }: SearchResultProps) {
  if (!hasQuery) {
    return (
      <EmptyState
        icon="🔍"
        title="Mulai ketik untuk mencari"
        description="Cari kata Manggarai atau padanan Indonesia. Hasil muncul instan saat Anda mengetik."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="mb-2 h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mb-3 h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon="😕"
        title={`Tidak ada hasil untuk "${query}"`}
        description="Coba periksa ejaan, pilih arah pencarian yang berbeda, atau hapus filter dialek."
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {data.total} hasil ditemukan
        </p>
        {isFetching && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            <span>Memperbarui…</span>
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.items.map((hit) => (
          <EntryCard key={hit.id} item={hit} />
        ))}
      </div>
    </div>
  );
}
