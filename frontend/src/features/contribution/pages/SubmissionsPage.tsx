import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contributionApi } from '../api/contributionApi';
import { Pagination } from '@/shared/components/Pagination';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatRelative } from '@/shared/utils/formatters';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' },
  approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' },
  rejected: { label: 'Ditolak', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' },
};

export function SubmissionsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const query = useQuery({
    queryKey: ['submissions', 'mine', page, limit],
    queryFn: () => contributionApi.listMine(page, limit),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Submission Saya</h1>
        <Link to="/dashboard/submit" className="btn-primary">+ Submit Baru</Link>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-20" />
          ))}
        </div>
      ) : query.data && query.data.items.length > 0 ? (
        <div className="space-y-2">
          {query.data.items.map((s) => {
            const status = STATUS_LABEL[s.status] ?? STATUS_LABEL.pending;
            return (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{s.payload.base_form}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={`badge ${status.color}`}>{status.label}</span>
                      {s.was_edited && <span className="badge bg-blue-100 text-blue-700">Direvisi</span>}
                      <span>Dikirim {formatRelative(s.created_at)}</span>
                    </div>
                    {s.review_notes && (
                      <div className="mt-2 rounded bg-slate-50 p-2 text-sm dark:bg-slate-700/40">
                        <span className="font-medium">Catatan reviewer: </span>
                        <span className="text-slate-600 dark:text-slate-300">{s.review_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Pagination
            page={query.data.meta.page}
            limit={query.data.meta.limit}
            total={query.data.meta.total}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState
          title="Belum ada submission"
          description="Mulai berkontribusi dengan menambahkan kosakata baru."
          action={<Link to="/dashboard/submit" className="btn-primary">Submit pertama</Link>}
        />
      )}
    </div>
  );
}
