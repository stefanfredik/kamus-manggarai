import { Link, useParams } from 'react-router-dom';
import { useEntryDetail } from '../hooks/useEntryDetail';
import { EntryDetailView } from '../components/EntryDetailView';
import { extractError } from '@/lib/axios';

export function EntryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const query = useEntryDetail(slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Link to="/" className="hover:text-primary-600">
          ← Kembali ke pencarian
        </Link>
      </nav>

      {query.isLoading ? (
        <div className="space-y-4">
          <div className="card animate-pulse">
            <div className="h-8 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="card animate-pulse">
            <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ) : query.error ? (
        <div className="card text-center">
          <p className="text-slate-700 dark:text-slate-200">{extractError(query.error)}</p>
          <Link to="/" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
            Kembali ke beranda
          </Link>
        </div>
      ) : query.data ? (
        <EntryDetailView entry={query.data} />
      ) : null}
    </div>
  );
}
