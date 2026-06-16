import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const footer = (
    <footer className="flex flex-wrap items-center justify-center gap-3 px-4 py-5 text-xs text-slate-500 dark:text-slate-400">
      <span>Made With Love by Fredik Stefan</span>
      <a
        href="https://www.instagram.com/stefanfredik"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-slate-600 transition hover:text-pink-600 dark:text-slate-300 dark:hover:text-pink-400"
        aria-label="Instagram Fredik Stefan"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
          <path d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-2.38a1.13 1.13 0 1 1 0 2.26 1.13 1.13 0 0 1 0-2.26Z" />
        </svg>
        @stefanfredik
      </a>
      <a
        href="https://www.facebook.com/fredikstefan"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
        aria-label="Facebook Fredik Stefan"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.25 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.24 0-1.63.77-1.63 1.56v1.9h2.77l-.44 2.91h-2.33V22C18.34 21.25 22 17.08 22 12.06Z" />
        </svg>
        @fredikstefan
      </a>
    </footer>
  );

  // ChatGPT-style: empty state centers the search in the viewport.
  // Once the user types, the search docks to the top and results appear below.
  if (!hasQuery) {
    return (
      <div className="relative flex min-h-full flex-col">
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-72" />
          <div className="relative z-10 w-full max-w-2xl animate-rise text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
              Apa kata yang ingin kamu cari?
            </h1>

            <div className="mt-8">
              <HeroSearch
                query={query}
                onQueryChange={handleQueryChange}
                direction={direction}
                onDirectionChange={handleDirection}
              />
            </div>
          </div>
        </div>
        {footer}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
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
      {footer}
    </div>
  );
}
