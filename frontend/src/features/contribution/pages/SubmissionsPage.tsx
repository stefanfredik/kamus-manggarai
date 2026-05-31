import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { contributionApi } from '../api/contributionApi';
import { SubmissionFormModal } from '../components/SubmissionFormModal';
import { Pagination } from '@/shared/components/Pagination';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatRelative, formatTranslations } from '@/shared/utils/formatters';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu', cls: 'badge-warning' },
  approved: { label: 'Disetujui', cls: 'badge-success' },
  rejected: { label: 'Ditolak', cls: 'badge-danger' },
};

export function SubmissionsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const limit = 20;
  const query = useQuery({
    queryKey: ['submissions', 'mine', page, limit],
    queryFn: () => contributionApi.listMine(page, limit),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Submission Saya</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Submit Baru
        </button>
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
                    <h3 className="font-semibold">
                      {s.payload.headword} <span className="text-slate-400">→</span> {formatTranslations(s.payload.translations)}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={status.cls}>{status.label}</span>
                      {s.was_edited && <span className="badge-primary">Direvisi</span>}
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
          action={
            <button onClick={() => setModalOpen(true)} className="btn-primary">
              <Plus size={16} /> Submit pertama
            </button>
          }
        />
      )}

      <SubmissionFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
