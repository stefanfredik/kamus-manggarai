import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { goetApi } from '../api/goetApi';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import { useDebounce } from '@/shared/hooks/useDebounce';

const PAGE_SIZE = 20;

export function GoetPage() {
  const [page, setPage] = useState(1);
  const [rawQuery, setRawQuery] = useState('');
  const query = useDebounce(rawQuery.trim(), 300);

  const q = useQuery({
    queryKey: ['goet', query, page],
    queryFn: () => goetApi.list(page, PAGE_SIZE, query),
    placeholderData: (prev) => prev,
  });

  const total = q.data?.meta.total ?? 0;
  const hasQuery = query.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Goet Manggarai</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Goet adalah pribahasa dan ungkapan Bahasa Manggarai yang berisi nasihat serta memiliki
          makna tertentu.
        </p>
      </header>

      {/* Sticky search bar so it stays reachable as the list grows. */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-slate-100 bg-white/90 px-4 pb-3 pt-1 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={rawQuery}
            onChange={(e) => {
              setRawQuery(e.target.value);
              setPage(1);
            }}
            className="input pl-10"
            placeholder="Cari goet atau artinya…"
          />
        </div>
        {!q.isLoading && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {hasQuery
              ? `${total.toLocaleString('id-ID')} hasil untuk "${query}"`
              : `${total.toLocaleString('id-ID')} goet`}
          </p>
        )}
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : q.data && q.data.items.length > 0 ? (
        <>
          <ul className="space-y-3">
            {q.data.items.map((g) => (
              <li key={g.id} className="card">
                <p className="text-lg font-semibold italic text-primary-700 dark:text-primary-300">
                  “{g.manggarai}”
                </p>
                <p className="mt-2 border-l-2 border-primary-200 pl-3 text-slate-700 dark:border-primary-700 dark:text-slate-200">
                  {g.meaning}
                </p>
              </li>
            ))}
          </ul>
          <Pagination
            page={q.data.meta.page}
            limit={q.data.meta.limit}
            total={q.data.meta.total}
            onPageChange={setPage}
          />
        </>
      ) : hasQuery ? (
        <EmptyState
          title={`Tidak ada goet untuk "${query}"`}
          description="Coba kata kunci lain."
        />
      ) : (
        <EmptyState
          title="Belum ada goet"
          description="Goet Manggarai akan muncul di sini setelah ditambahkan."
        />
      )}
    </div>
  );
}
