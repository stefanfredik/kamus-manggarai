import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDialects } from '../hooks/useSearch';
import { useEntryList } from '../hooks/useEntryDetail';
import { EntryCard } from '../components/EntryCard';
import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';

export function DialectBrowsePage() {
  const { dialect: dialectSlug } = useParams<{ dialect?: string }>();
  const [page, setPage] = useState(1);
  const limit = 20;

  const dialectsQuery = useDialects();
  const dialect = dialectsQuery.data?.find((d) => d.slug === dialectSlug);
  const dialectIds = dialect ? [dialect.id] : [];

  const list = useEntryList(page, limit, dialectIds);

  if (!dialectSlug) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Daftar Dialek</h1>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          Telusuri kosakata berdasarkan dialek Bahasa Manggarai.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dialectsQuery.data?.map((d) => (
            <Link
              key={d.id}
              to={`/dialek/${d.slug}`}
              className="card transition-shadow hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{d.name}</h2>
              {d.region && <p className="mt-0.5 text-xs text-slate-500">{d.region}</p>}
              {d.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {d.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (dialectsQuery.isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-center text-slate-500">Memuat…</div>;
  }
  if (!dialect) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState title="Dialek tidak ditemukan" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-slate-500">
        <Link to="/dialek" className="hover:text-primary-600">
          ← Semua dialek
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">{dialect.name}</h1>
        {dialect.region && <p className="mt-0.5 text-sm text-slate-500">{dialect.region}</p>}
        {dialect.description && (
          <p className="mt-2 text-slate-600 dark:text-slate-300">{dialect.description}</p>
        )}
      </header>

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
        <EmptyState title="Belum ada kosakata untuk dialek ini" />
      )}
    </div>
  );
}
