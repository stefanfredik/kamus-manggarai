import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEntryList } from '../hooks/useEntryDetail';
import { useSearch } from '../hooks/useSearch';
import { EntryCard } from '../components/EntryCard';
import { HeroSearch } from '../components/HeroSearch';
import { SearchResultList } from '../components/SearchResultList';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import type { SearchDirection } from '../types/dictionary.types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function BrowsePage() {
  const { letter: letterParam } = useParams<{ letter?: string }>();
  const activeLetter = letterParam?.toUpperCase();
  const [page, setPage] = useState(1);
  const limit = 20;

  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const direction = (searchParams.get('dir') as SearchDirection) || 'manggarai_to_indonesia';
  const [searchPage, setSearchPage] = useState(1);
  const hasQuery = query.trim().length > 0;

  const list = useEntryList(page, limit, activeLetter?.toLowerCase());
  const search = useSearch({ q: query, direction, page: searchPage, limit });

  function handleQueryChange(q: string) {
    setSearchPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (q.trim()) next.set('q', q);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }

  function handleDirection(d: SearchDirection) {
    setSearchPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('dir', d);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Jelajah Kosakata</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Cari kata secara langsung atau telusuri berdasarkan huruf awal (Bahasa Indonesia).
        </p>
      </header>

      <div className="mb-6">
        <HeroSearch
          query={query}
          onQueryChange={handleQueryChange}
          direction={direction}
          onDirectionChange={handleDirection}
          isLoading={search.isFetching && hasQuery}
          autoFocus={false}
          placeholder="Cari kosakata…"
        />
      </div>

      {hasQuery ? (
        <>
          <SearchResultList
            data={search.data}
            isLoading={search.isLoading && hasQuery}
            isFetching={search.isFetching && hasQuery}
            query={query}
            hasQuery={hasQuery}
          />
          {search.data && search.data.total > limit && (
            <Pagination
              page={searchPage}
              limit={limit}
              total={search.data.total}
              onPageChange={setSearchPage}
            />
          )}
        </>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-1.5">
            <Link
              to="/jelajah"
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                !activeLetter
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Semua
            </Link>
            {LETTERS.map((l) => (
              <Link
                key={l}
                to={`/jelajah/${l.toLowerCase()}`}
                onClick={() => setPage(1)}
                className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                  activeLetter === l
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {l}
              </Link>
            ))}
          </div>

          {list.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : list.data && list.data.items.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.data.items.map((item) => (
                  <EntryCard key={item.id} item={item} />
                ))}
              </div>
              <Pagination
                page={list.data.meta.page}
                limit={list.data.meta.limit}
                total={list.data.meta.total}
                onPageChange={setPage}
              />
            </>
          ) : (
            <EmptyState title="Belum ada kosakata" description="Coba huruf lain atau kembali nanti." />
          )}
        </>
      )}
    </div>
  );
}
