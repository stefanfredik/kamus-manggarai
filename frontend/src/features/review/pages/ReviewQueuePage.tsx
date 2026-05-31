import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reviewApi } from '../api/reviewApi';
import { Pagination } from '@/shared/components/Pagination';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatRelative } from '@/shared/utils/formatters';

export function ReviewQueuePage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const query = useQuery({
    queryKey: ['review', 'queue', page, limit],
    queryFn: () => reviewApi.getQueue(page, limit),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Antrian Review</h1>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      ) : query.data && query.data.items.length > 0 ? (
        <div className="space-y-2">
          {query.data.items.map((s) => (
            <Link key={s.id} to={`/validator/${s.id}`} className="card flex items-center justify-between gap-3 transition-shadow hover:shadow-md">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{s.payload.base_form}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  oleh {s.submitter_name} • {formatRelative(s.created_at)}
                </p>
              </div>
              <span className="text-sm text-primary-600">Review →</span>
            </Link>
          ))}
          <Pagination
            page={query.data.meta.page}
            limit={query.data.meta.limit}
            total={query.data.meta.total}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState title="Tidak ada submission yang menunggu review" />
      )}
    </div>
  );
}
