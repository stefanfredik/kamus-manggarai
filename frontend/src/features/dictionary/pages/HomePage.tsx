import { useState } from 'react';
import { HeroSearch } from '../components/HeroSearch';
import { SearchResultList } from '../components/SearchResultList';
import { useSearch } from '../hooks/useSearch';
import { Pagination } from '@/shared/components/Pagination';
import type { SearchDirection } from '../types/dictionary.types';

export function HomePage() {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<SearchDirection>('manggarai_to_indonesia');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [isFocused, setIsFocused] = useState(false);

  const search = useSearch({ q: query, direction, page, limit });

  function handleQueryChange(q: string) {
    setQuery(q);
    setPage(1);
  }

  function handleDirection(d: SearchDirection) {
    setDirection(d);
    setPage(1);
  }

  const hasQuery = query.trim().length > 0;
  const isSearchActive = hasQuery || isFocused;
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
        href="https://www.facebook.com/stefanfredik"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
        aria-label="Facebook Stefan Fredik"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.25 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.24 0-1.63.77-1.63 1.56v1.9h2.77l-.44 2.91h-2.33V22C18.34 21.25 22 17.08 22 12.06Z" />
        </svg>
        @stefanfredik
      </a>
    </footer>
  );

  // ChatGPT-style: empty state centers the search in the viewport.
  // Once the user types or focuses, the search docks to the top and results appear below.
  return (
    <div className="relative flex min-h-full flex-col">
      {/* Background radial glow, only visible when no query/focus */}
      <div className={`hero-glow pointer-events-none absolute inset-x-0 top-0 h-72 transition-opacity duration-300 ${isSearchActive ? 'opacity-0' : 'opacity-100'}`} />

      <div className={`mx-auto w-full px-4 transition-all duration-500 ease-out ${isSearchActive
        ? 'max-w-3xl flex-1 py-6'
        : 'max-w-2xl flex flex-1 flex-col justify-center py-12'
        }`}>

        {/* Hero Header Content: animated height/opacity */}
        <div className={`relative z-10 text-center transition-all duration-300 ${isSearchActive
          ? 'max-h-0 opacity-0 overflow-hidden mb-0 scale-95 pointer-events-none'
          : 'max-h-[500px] opacity-100 mb-8 scale-100'
          }`}>
          <div className="mb-6 flex justify-center">
            <img
              src="/logo.jpg"
              alt="Logo Kamus Manggarai"
              className="h-28 w-28 rounded-xl object-cover border border-slate-100/50 dark:border-slate-800/50"
            />
          </div>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            🇲🇨 Kamus Dua Arah Digital
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
            Kamus Bahasa Manggarai
          </h1>
          <p className="mt-3 text-sm text-slate-500 sm:text-base dark:text-slate-400 max-w-lg mx-auto">
            Cari kosakata, terjemahan, variasi dialek daerah, dan contoh kalimat terjemahan Bahasa Manggarai ↔ Bahasa Indonesia secara mudah.
          </p>
        </div>

        {/* Search Bar Wrapper: becomes sticky when isSearchActive */}
        <div className={`z-20 transition-all duration-300 ${isSearchActive
          ? 'sticky top-0 -mx-4 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 shadow-sm'
          : 'relative'
          }`}>
          <HeroSearch
            query={query}
            onQueryChange={handleQueryChange}
            direction={direction}
            onDirectionChange={handleDirection}
            isLoading={hasQuery ? search.isFetching : false}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>

        {/* Quick search suggestions */}
        <div className={`transition-all duration-300 ${isSearchActive
          ? 'max-h-0 opacity-0 overflow-hidden mt-0 scale-95 pointer-events-none'
          : 'max-h-[200px] opacity-100 mt-8 scale-100'
          }`}>
        </div>

        {/* Results List: animated height/opacity */}
        <div className={`transition-all duration-500 ease-out ${hasQuery
          ? 'mt-6 opacity-100 translate-y-0 visible'
          : 'max-h-0 opacity-0 overflow-hidden mt-0 translate-y-4 invisible'
          }`}>
          <SearchResultList
            data={search.data}
            isLoading={search.isLoading && hasQuery}
            isFetching={search.isFetching && hasQuery}
            query={query}
            hasQuery={hasQuery}
          />
        </div>

        {/* Pagination */}
        {hasQuery && search.data && search.data.total > limit && (
          <div className="mt-6">
            <Pagination page={page} limit={limit} total={search.data.total} onPageChange={setPage} />
          </div>
        )}
      </div>
      {footer}
    </div>
  );
}
