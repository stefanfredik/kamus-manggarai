import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { reviewApi } from '../api/reviewApi';
import { Pagination } from '@/shared/components/Pagination';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatRelative, formatTranslations } from '@/shared/utils/formatters';

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
            <Link key={s.id} to={`/validator/${s.id}`} className="group card flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5 hover:shadow-card">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">
                  {s.payload.manggarai} <span className="text-slate-400">→</span> {formatTranslations(s.payload.senses)}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  oleh {s.submitter_name} • {formatRelative(s.created_at)}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary-600">
                Review
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
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
