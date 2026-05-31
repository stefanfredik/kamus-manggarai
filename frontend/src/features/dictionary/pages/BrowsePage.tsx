import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEntryList } from '../hooks/useEntryDetail';
import { EntryCard } from '../components/EntryCard';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function BrowsePage() {
  const { letter: letterParam } = useParams<{ letter?: string }>();
  const activeLetter = letterParam?.toUpperCase();
  const [page, setPage] = useState(1);
  const limit = 20;

  const list = useEntryList(page, limit, activeLetter?.toLowerCase());

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Jelajah Kosakata</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Telusuri kosakata berdasarkan huruf awal (Bahasa Indonesia).
        </p>
      </header>

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
    </div>
  );
}
