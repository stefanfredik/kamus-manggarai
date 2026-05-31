import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AnalyticsData } from '../api/adminApi';

type Tab = 'analytics' | 'users' | 'reports';

interface Props {
  initialTab?: Tab;
}

export function AdminDashboardPage({ initialTab = 'analytics' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Admin Dashboard</h1>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {(['analytics', 'users', 'reports'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? 'border-b-2 border-primary-600 text-primary-700 dark:text-primary-300'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {labelFor(t)}
          </button>
        ))}
      </div>

      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}

function labelFor(t: Tab) {
  return ({
    analytics: 'Analytics',
    users: 'Pengguna',
    reports: 'Laporan',
  } as Record<Tab, string>)[t];
}

function AnalyticsTab() {
  const q = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: adminApi.getAnalytics,
  });

  if (q.isLoading) return <div className="text-slate-500">Memuat…</div>;
  if (!q.data) return <div className="text-slate-500">Tidak ada data.</div>;

  const a: AnalyticsData = q.data;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total kata published" value={a.total_entries} />
        <Stat label="Pending review" value={a.submissions_by_status?.pending ?? 0} />
        <Stat label="Approved" value={a.submissions_by_status?.approved ?? 0} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold">Top kontributor</h3>
          {a.top_contributors.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data.</p>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {a.top_contributors.map((c, i) => (
                <li key={c.user_id} className="flex items-center justify-between">
                  <span>{i + 1}. {c.name}</span>
                  <span className="font-semibold">{c.total}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold">Pertumbuhan per bulan</h3>
          {a.growth_by_month.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {a.growth_by_month.map((m) => (
                <li key={m.month} className="flex items-center justify-between">
                  <span>{m.month}</span>
                  <span className="font-semibold">{m.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-2xl font-bold text-primary-600">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'users'], queryFn: () => adminApi.listUsers(1, 100) });
  const toggleValidator = useMutation({
    mutationFn: adminApi.toggleValidator,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
  const toggleSuspend = useMutation({
    mutationFn: adminApi.toggleSuspend,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  if (q.isLoading) return <div>Memuat…</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-700">
            <th className="pb-2">Nama</th>
            <th className="pb-2">Email</th>
            <th className="pb-2">Role</th>
            <th className="pb-2">Status</th>
            <th className="pb-2 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {q.data?.items.map((u) => (
            <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/60">
              <td className="py-2">{u.name}</td>
              <td className="py-2 text-slate-500">{u.email}</td>
              <td className="py-2">
                <span className="badge">{u.role}</span>
              </td>
              <td className="py-2">
                {u.is_suspended ? (
                  <span className="badge-danger">Suspended</span>
                ) : (
                  <span className="badge-success">Aktif</span>
                )}
              </td>
              <td className="py-2 text-right">
                {u.role !== 'admin' && (
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => toggleValidator.mutate(u.id)}
                      className="text-xs text-primary-600 hover:underline"
                      disabled={toggleValidator.isPending}
                    >
                      {u.role === 'validator' ? 'Cabut Validator' : 'Jadikan Validator'}
                    </button>
                    <button
                      onClick={() => toggleSuspend.mutate(u.id)}
                      className="text-xs text-rose-600 hover:underline"
                      disabled={toggleSuspend.isPending}
                    >
                      {u.is_suspended ? 'Aktifkan' : 'Suspend'}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => adminApi.listReports(1, 100) });
  const handle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resolved' | 'dismissed' }) => adminApi.handleReport(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  if (q.isLoading) return <div>Memuat…</div>;

  return (
    <div className="space-y-2">
      {q.data?.items.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">Tidak ada laporan terbuka.</div>
      ) : (
        q.data?.items.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{r.entry_name ?? 'Kosakata'}</div>
                <div className="mt-1 text-xs text-slate-500">{r.reason}</div>
                {r.description && <p className="mt-2 text-sm">{r.description}</p>}
              </div>
              <div className="flex gap-1.5">
                <button
                  className="btn-outline text-xs"
                  onClick={() => handle.mutate({ id: r.id, action: 'resolved' })}
                >
                  Resolve
                </button>
                <button
                  className="btn-outline text-xs"
                  onClick={() => handle.mutate({ id: r.id, action: 'dismissed' })}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
