import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { SearchResultList } from '../components/SearchResultList';
import { useDialects, useSearch } from '../hooks/useSearch';
import { Pagination } from '@/shared/components/Pagination';
import type { SearchDirection } from '../types/dictionary.types';

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [direction, setDirection] = useState<SearchDirection>(
    (searchParams.get('dir') as SearchDirection) || 'manggarai_to_indonesia',
  );
  const [page, setPage] = useState(1);
  const limit = 20;
  const [selectedDialectIds, setSelectedDialectIds] = useState<string[]>([]);

  const dialectsQuery = useDialects();

  const search = useSearch({
    q: query,
    direction,
    dialectIds: selectedDialectIds,
    page,
    limit,
  });

  function handleQueryChange(q: string) {
    setQuery(q);
    setPage(1);
    if (q.trim()) {
      setSearchParams({ q, dir: direction }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  function handleDirection(d: SearchDirection) {
    setDirection(d);
    setPage(1);
    if (query.trim()) setSearchParams({ q: query, dir: d }, { replace: true });
  }

  const hasQuery = query.trim().length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <section className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-slate-100">
          Kamus Bahasa Manggarai
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600 dark:text-slate-300">
          Pencarian dua arah Manggarai ↔ Indonesia. Mendukung multi-dialek dan typo-tolerant.
        </p>
      </section>

      <div className="mb-6">
        <SearchBar
          query={query}
          onQueryChange={handleQueryChange}
          direction={direction}
          onDirectionChange={handleDirection}
          dialects={dialectsQuery.data ?? []}
          selectedDialectIds={selectedDialectIds}
          onSelectedDialectsChange={(ids) => {
            setSelectedDialectIds(ids);
            setPage(1);
          }}
          isLoading={search.isFetching && hasQuery}
        />
      </div>

      <SearchResultList
        data={search.data}
        isLoading={search.isLoading && hasQuery}
        isFetching={search.isFetching && hasQuery}
        query={query}
        hasQuery={hasQuery}
      />

      {search.data && search.data.total > limit && (
        <Pagination
          page={page}
          limit={limit}
          total={search.data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
