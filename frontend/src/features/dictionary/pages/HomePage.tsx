import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { HeroSearch } from '../components/HeroSearch';
import { SearchResultList } from '../components/SearchResultList';
import { useSearch } from '../hooks/useSearch';
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

  const search = useSearch({ q: query, direction, page, limit });

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

  // ChatGPT-style: empty state centers the search in the viewport.
  // Once the user types, the search docks to the top and results appear below.
  if (!hasQuery) {
    return (
      <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-16">
        <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-72" />
        <div className="relative z-10 w-full max-w-2xl animate-rise text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-pop shadow-primary-600/20">
            <Search size={26} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
            Apa kata yang ingin kamu cari?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-slate-500 dark:text-slate-400">
            Kamus dua arah Bahasa Manggarai ↔ Indonesia. Ketik untuk mencari secara instan.
          </p>

          <div className="mt-8">
            <HeroSearch
              query={query}
              onQueryChange={handleQueryChange}
              direction={direction}
              onDirectionChange={handleDirection}
              centered
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <HeroSearch
          query={query}
          onQueryChange={handleQueryChange}
          direction={direction}
          onDirectionChange={handleDirection}
          isLoading={search.isFetching}
        />
      </div>

      <div className="mt-6">
        <SearchResultList
          data={search.data}
          isLoading={search.isLoading && hasQuery}
          isFetching={search.isFetching && hasQuery}
          query={query}
          hasQuery={hasQuery}
        />
      </div>

      {search.data && search.data.total > limit && (
        <Pagination page={page} limit={limit} total={search.data.total} onPageChange={setPage} />
      )}
    </div>
  );
}
