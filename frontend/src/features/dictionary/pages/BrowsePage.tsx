import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEntryList } from '../hooks/useEntryDetail';
import { useSearch } from '../hooks/useSearch';
import { EntryCard } from '../components/EntryCard';
import { HeroSearch } from '../components/HeroSearch';
import { SearchResultList } from '../components/SearchResultList';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import type { Language } from '../types/dictionary.types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const LANG_TABS: Array<{ value: Language; label: string }> = [
  { value: 'mgr', label: 'Manggarai' },
  { value: 'id', label: 'Indonesia' },
];

// The active language tab also drives the search direction, so the search box
// doesn't need its own MGR↔ID toggle.
function directionFor(lang: Language) {
  return lang === 'id' ? 'indonesia_to_manggarai' : 'manggarai_to_indonesia';
}

export function BrowsePage() {
  const { letter: letterParam } = useParams<{ letter?: string }>();
  const activeLetter = letterParam?.toUpperCase();
  const [page, setPage] = useState(1);
  const limit = 24;

  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const lang = (searchParams.get('lang') as Language) || 'mgr';
  const direction = directionFor(lang);
  const [searchPage, setSearchPage] = useState(1);
  const hasQuery = query.trim().length > 0;

  const list = useEntryList(page, limit, activeLetter?.toLowerCase(), lang);
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

  function handleLang(l: Language) {
    setPage(1);
    setSearchPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('lang', l);
        return next;
      },
      { replace: true },
    );
  }

  const total = list.data?.meta.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Jelajah Kosakata</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Cari kata secara langsung atau telusuri berdasarkan huruf awal.
        </p>
      </header>

      {/* Sticky toolbar: keeps search + filters reachable in long lists. */}
      <div className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-slate-100 bg-white/90 px-4 pb-3 pt-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        {/* Language tabs sit above the search form and drive both browse and
            search direction. */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
            {LANG_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => handleLang(t.value)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  lang === t.value
                    ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-200'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {!hasQuery && !list.isLoading && (
            <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
              {total.toLocaleString('id-ID')} kata
            </span>
          )}
        </div>

        <HeroSearch
          query={query}
          onQueryChange={handleQueryChange}
          direction={direction}
          isLoading={search.isFetching && hasQuery}
          autoFocus={false}
          showDirectionToggle={false}
          placeholder={lang === 'id' ? 'Cari kata Indonesia…' : 'Cari kata Manggarai…'}
        />

        {!hasQuery && (
          /* A-Z strip: scrolls horizontally instead of wrapping on small screens. */
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            <Link
              to={`/jelajah?lang=${lang}`}
              className={`shrink-0 rounded-md px-2.5 py-1 text-sm font-medium ${
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
                to={`/jelajah/${l.toLowerCase()}?lang=${lang}`}
                onClick={() => setPage(1)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-medium ${
                  activeLetter === l
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {l}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
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
        ) : list.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
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
          <EmptyState
            title={activeLetter ? `Tidak ada kata berawalan "${activeLetter}"` : 'Belum ada kosakata'}
            description={
              activeLetter
                ? 'Coba huruf lain atau ganti bahasa.'
                : 'Kosakata akan muncul di sini setelah ditambahkan.'
            }
          />
        )}
      </div>
    </div>
  );
}
