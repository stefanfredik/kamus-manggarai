import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PenLine, ClipboardList } from 'lucide-react';
import { contributionApi } from '../api/contributionApi';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();
  const submissionsQuery = useQuery({
    queryKey: ['submissions', 'mine', 'summary'],
    queryFn: () => contributionApi.listMine(1, 100),
  });

  const items = submissionsQuery.data?.items ?? [];
  const stats = {
    total: items.length,
    pending: items.filter((s) => s.status === 'pending').length,
    approved: items.filter((s) => s.status === 'approved').length,
    rejected: items.filter((s) => s.status === 'rejected').length,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Halo, {user?.name?.split(' ')[0] ?? 'Kontributor'}</h1>
        <p className="mt-1 text-slate-500">
          Bantu kami melestarikan Bahasa Manggarai dengan menambahkan kosakata.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Total submission" value={stats.total} />
        <StatCard label="Menunggu review" value={stats.pending} accent="amber" />
        <StatCard label="Diterima" value={stats.approved} accent="emerald" />
        <StatCard label="Ditolak" value={stats.rejected} accent="rose" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/dashboard/submit" className="card transition-all hover:-translate-y-0.5 hover:shadow-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <PenLine size={20} />
          </div>
          <h2 className="mt-3 font-semibold">Submit Kosakata Baru</h2>
          <p className="mt-1 text-sm text-slate-500">Tambahkan kata Manggarai dengan arti dan contoh kalimat.</p>
        </Link>
        <Link to="/dashboard/submissions" className="card transition-all hover:-translate-y-0.5 hover:shadow-card">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
            <ClipboardList size={20} />
          </div>
          <h2 className="mt-3 font-semibold">Riwayat Submission</h2>
          <p className="mt-1 text-sm text-slate-500">Lihat status submission yang pernah Anda kirim.</p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'amber' | 'emerald' | 'rose' }) {
  const color = accent === 'amber'
    ? 'text-amber-600'
    : accent === 'emerald'
      ? 'text-emerald-600'
      : accent === 'rose'
        ? 'text-rose-600'
        : 'text-primary-600';
  return (
    <div className="card">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
