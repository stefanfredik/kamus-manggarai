import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Flag, XCircle } from 'lucide-react';
import { dictionaryApi } from '@/features/dictionary/api/dictionaryApi';
import type { ReportItem } from '@/features/dictionary/types/dictionary.types';
import { Pagination } from '@/shared/components/Pagination';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatRelative } from '@/shared/utils/formatters';
import { extractError } from '@/lib/axios';

const STATUS_LABEL: Record<ReportItem['status'], { label: string; cls: string; icon: typeof Flag }> = {
  open: { label: 'Menunggu admin', cls: 'badge-warning', icon: Flag },
  resolved: { label: 'Selesai', cls: 'badge-success', icon: CheckCircle2 },
  dismissed: { label: 'Ditutup', cls: 'badge-danger', icon: XCircle },
};

const REASON_LABEL: Record<ReportItem['reason'], string> = {
  ejaan_salah: 'Ejaan salah',
  arti_tidak_tepat: 'Arti tidak tepat',
  contoh_salah: 'Contoh kalimat salah',
  konten_tidak_pantas: 'Konten tidak pantas',
  lainnya: 'Lainnya',
};

export function ReportsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const query = useQuery({
    queryKey: ['reports', 'mine', page, limit],
    queryFn: () => dictionaryApi.listMyReports(page, limit),
  });

  const reports = query.data?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Laporan Saya</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pantau status laporan kosakata yang pernah kamu kirim.
        </p>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
          {extractError(query.error)}
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}

          <Pagination
            page={query.data!.meta.page}
            limit={query.data!.meta.limit}
            total={query.data!.meta.total}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <EmptyState
          title="Belum ada laporan"
          description="Jika menemukan kosakata yang kurang tepat, buka detail kosakata lalu klik Laporkan."
        />
      )}
    </div>
  );
}

function ReportCard({ report }: { report: ReportItem }) {
  const status = STATUS_LABEL[report.status];
  const StatusIcon = status.icon;
  const entryUrl = report.entry_slug ? `/kata/${report.entry_slug}` : undefined;

  return (
    <div className="card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={status.cls}>
              <StatusIcon size={13} /> {status.label}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
              {REASON_LABEL[report.reason] ?? report.reason}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Dikirim {formatRelative(report.created_at)}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-50">{report.entry_name || 'Kosakata'}</h3>
            {entryUrl && (
              <Link to={entryUrl} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300">
                Buka entri <ExternalLink size={14} />
              </Link>
            )}
          </div>

          {report.description && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200">
              {report.description}
            </p>
          )}

          {report.status === 'open' && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Admin belum memproses laporan ini.
            </p>
          )}
          {report.status === 'resolved' && (
            <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">
              Laporan sudah ditinjau dan ditandai selesai.
            </p>
          )}
          {report.status === 'dismissed' && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Laporan sudah ditinjau dan ditutup tanpa perubahan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
