import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Flag, PenLine, Plus, Trash2, XCircle } from 'lucide-react';
import { adminApi, type AnalyticsData, type ReportItem } from '../api/adminApi';
import { WordEditModal } from '../components/WordEditModal';
import { dictionaryApi } from '@/features/dictionary/api/dictionaryApi';
import { goetApi, type Goet } from '@/features/goet/api/goetApi';
import type { Language, SearchDirection } from '@/features/dictionary/types/dictionary.types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { User } from '@/types/api.types';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { Pagination } from '@/shared/components/Pagination';
import { ActionMenu } from '@/shared/components/ActionMenu';
import { Modal } from '@/shared/components/Modal';
import { useToast } from '@/shared/components/Toast';
import { formatRelative } from '@/shared/utils/formatters';
import { extractError } from '@/lib/axios';

type Tab = 'analytics' | 'users' | 'reports' | 'kosakata' | 'goet';

interface Props {
  initialTab?: Tab;
}

export function AdminDashboardPage({ initialTab = 'analytics' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Admin Dashboard</h1>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {(['analytics', 'kosakata', 'goet', 'users', 'reports'] as Tab[]).map((t) => (
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
      {tab === 'kosakata' && <KosakataTab />}
      {tab === 'goet' && <GoetTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}

function labelFor(t: Tab) {
  return ({
    analytics: 'Analytics',
    kosakata: 'Kosakata',
    goet: 'Goet',
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
  // The Go API serializes empty slices as null, so guard before reading them.
  const contributors = a.top_contributors ?? [];
  const growth = a.growth_by_month ?? [];
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
          {contributors.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data.</p>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {contributors.map((c, i) => (
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
          {growth.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {growth.map((m) => (
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

const PAGE_SIZE = 20;

const KOSAKATA_LANGS: { value: Language; label: string }[] = [
  { value: 'mgr', label: 'Bahasa Manggarai' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

function KosakataTab() {
  const qc = useQueryClient();
  const toast = useToast();

  const [lang, setLang] = useState<Language>('mgr');
  const [rawQuery, setRawQuery] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebounce(rawQuery.trim(), 300);

  // Editing needs the full entry (translations + derived); we fetch it lazily by
  // slug when the admin clicks edit, then hand it to the modal.
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; lemma: string } | null>(null);

  // Both views are scoped to the selected language. Without a query we page the
  // full list (filtered by lang); with one we search the matching direction.
  const direction: SearchDirection =
    lang === 'id' ? 'indonesia_to_manggarai' : 'manggarai_to_indonesia';
  const listQ = useQuery({
    queryKey: ['admin', 'words', 'list', lang, page],
    queryFn: () => dictionaryApi.listEntries(page, PAGE_SIZE, undefined, lang),
    enabled: query === '',
    placeholderData: (prev) => prev,
  });
  const searchQ = useQuery({
    queryKey: ['admin', 'words', 'search', query, direction, page],
    queryFn: () => dictionaryApi.search({ q: query, direction, page, limit: PAGE_SIZE }),
    enabled: query !== '',
    placeholderData: (prev) => prev,
  });

  const editQ = useQuery({
    queryKey: ['entry', editSlug],
    queryFn: () => dictionaryApi.getEntryDetail(editSlug as string),
    enabled: Boolean(editSlug),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteWord(id),
    onSuccess: () => {
      toast.success('Kosakata dihapus.');
      qc.invalidateQueries({ queryKey: ['admin', 'words'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(extractError(err)),
  });

  function selectLang(next: Language) {
    setLang(next);
    setPage(1);
  }

  const items = query === '' ? listQ.data?.items ?? [] : searchQ.data?.items ?? [];
  const total = query === '' ? listQ.data?.meta.total ?? 0 : searchQ.data?.total ?? 0;
  const isLoading = query === '' ? listQ.isLoading : searchQ.isLoading;
  const counterpartLabel = lang === 'id' ? 'Manggarai' : 'Indonesia';

  return (
    <div className="space-y-4">
      {/* Language selector: Indonesian and Manggarai words are listed separately. */}
      <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-sm dark:bg-slate-700/40">
        {KOSAKATA_LANGS.map((l) => (
          <button
            key={l.value}
            onClick={() => selectLang(l.value)}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              lang === l.value
                ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-200'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <input
        value={rawQuery}
        onChange={(e) => {
          setRawQuery(e.target.value);
          setPage(1);
        }}
        className="input"
        placeholder={`Cari kosakata Bahasa ${lang === 'id' ? 'Indonesia' : 'Manggarai'}…`}
      />

      {isLoading ? (
        <div className="card text-sm text-slate-500">Memuat…</div>
      ) : items.length === 0 ? (
        <div className="card text-center text-sm text-slate-500">Tidak ada kosakata.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-700">
                <th className="pb-2">Kata</th>
                <th className="pb-2">Terjemahan ({counterpartLabel})</th>
                <th className="pb-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 dark:border-slate-700/60">
                  <td className="py-2 font-medium">{w.lemma}</td>
                  <td className="py-2 text-slate-500">{w.translations?.join(', ') ?? '—'}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditSlug(w.slug)}
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                      >
                        <PenLine size={13} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: w.id, lemma: w.lemma })}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} limit={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}

      {editSlug && editQ.data && (
        <WordEditModal
          open={Boolean(editSlug)}
          onClose={() => setEditSlug(null)}
          entry={editQ.data}
        />
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        dismissible={!deleteMutation.isPending}
        labelledBy="delete-word-title"
      >
        <h2 id="delete-word-title" className="text-lg font-semibold">
          Hapus kosakata
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Yakin ingin menghapus <span className="font-semibold">{deleteTarget?.lemma}</span>? Tautan
          terjemahan dan kata turunannya akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteMutation.isPending}
            className="btn-outline"
          >
            Batal
          </button>
          <button
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
            className="btn-danger"
          >
            {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function GoetTab() {
  const qc = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [rawQuery, setRawQuery] = useState('');
  const query = useDebounce(rawQuery.trim(), 300);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Goet | null>(null);
  const [deleteItem, setDeleteItem] = useState<Goet | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'goet', query, page],
    queryFn: () => goetApi.list(page, PAGE_SIZE, query),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'goet'] });
    qc.invalidateQueries({ queryKey: ['goet'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goetApi.remove(id),
    onSuccess: () => {
      toast.success('Goet dihapus.');
      invalidate();
      setDeleteItem(null);
    },
    onError: (err) => toast.error(extractError(err)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={rawQuery}
          onChange={(e) => {
            setRawQuery(e.target.value);
            setPage(1);
          }}
          className="input flex-1"
          placeholder="Cari goet atau artinya…"
        />
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus size={15} /> Tambah Goet
        </button>
      </div>

      {q.isLoading ? (
        <div className="card text-sm text-slate-500">Memuat…</div>
      ) : q.data && q.data.items.length > 0 ? (
        <>
          <div className="space-y-2">
            {q.data.items.map((g) => (
              <div key={g.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold italic text-primary-700 dark:text-primary-300">
                      “{g.manggarai}”
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{g.meaning}</p>
                  </div>
                  <ActionMenu
                    items={[
                      { label: 'Edit', onClick: () => setEditItem(g) },
                      { label: 'Hapus', onClick: () => setDeleteItem(g), variant: 'danger' },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={q.data.meta.page}
            limit={q.data.meta.limit}
            total={q.data.meta.total}
            onPageChange={setPage}
          />
        </>
      ) : (
        <div className="card text-center text-sm text-slate-500">
          {query ? `Tidak ada goet untuk "${query}".` : 'Belum ada goet.'}
        </div>
      )}

      <GoetFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={invalidate} />
      {editItem && (
        <GoetFormModal
          open={Boolean(editItem)}
          onClose={() => setEditItem(null)}
          onSaved={invalidate}
          goet={editItem}
        />
      )}

      <Modal
        open={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        dismissible={!deleteMutation.isPending}
        labelledBy="delete-goet-title"
      >
        <h2 id="delete-goet-title" className="text-lg font-semibold">
          Hapus goet
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Yakin ingin menghapus goet ini? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setDeleteItem(null)}
            disabled={deleteMutation.isPending}
            className="btn-outline"
          >
            Batal
          </button>
          <button
            onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
            disabled={deleteMutation.isPending}
            className="btn-danger"
          >
            {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function GoetFormModal({
  open,
  onClose,
  onSaved,
  goet,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  goet?: Goet;
}) {
  const toast = useToast();
  const isEdit = Boolean(goet);

  const [manggarai, setManggarai] = useState('');
  const [meaning, setMeaning] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setManggarai(goet?.manggarai ?? '');
    setMeaning(goet?.meaning ?? '');
    setError(null);
  }, [open, goet]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { manggarai: manggarai.trim(), meaning: meaning.trim() };
      return isEdit ? goetApi.update(goet!.id, payload) : goetApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Goet diperbarui.' : 'Goet ditambahkan.');
      onSaved();
      onClose();
    },
    onError: (err) => setError(extractError(err)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!manggarai.trim()) return setError('Teks goet (Manggarai) wajib diisi');
    if (!meaning.trim()) return setError('Arti goet wajib diisi');
    mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={() => !mutation.isPending && onClose()}
      dismissible={!mutation.isPending}
      labelledBy="goet-form-title"
      className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-pop dark:bg-slate-800"
    >
      <h2 id="goet-form-title" className="text-lg font-semibold">
        {isEdit ? 'Edit Goet' : 'Tambah Goet'}
      </h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Goet (Bahasa Manggarai) *</label>
          <textarea
            value={manggarai}
            onChange={(e) => setManggarai(e.target.value)}
            rows={2}
            className="input"
            placeholder="Mis. Neka langkas haeng wa, neka..."
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Arti / Makna *</label>
          <textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={3}
            className="input"
            placeholder="Penjelasan makna dan nasihat dari goet ini…"
            required
          />
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="btn-outline">
            Batal
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const q = useQuery({ queryKey: ['admin', 'users'], queryFn: () => adminApi.listUsers(1, 100) });

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const toggleValidator = useMutation({
    mutationFn: adminApi.toggleValidator,
    onSuccess: invalidate,
    onError: (err) => toast.error(extractError(err)),
  });
  const toggleSuspend = useMutation({
    mutationFn: adminApi.toggleSuspend,
    onSuccess: invalidate,
    onError: (err) => toast.error(extractError(err)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success('Pengguna dihapus.');
      invalidate();
      setDeleteUser(null);
    },
    onError: (err) => toast.error(extractError(err)),
  });

  if (q.isLoading) return <div>Memuat…</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus size={15} /> Tambah Pengguna
        </button>
      </div>

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
            {q.data?.items.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/60">
                  <td className="py-2">
                    {u.name}
                    {isSelf && <span className="ml-1 text-xs text-slate-400">(Anda)</span>}
                  </td>
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
                    <div className="flex justify-end">
                      <ActionMenu
                        items={[
                          { label: 'Edit', onClick: () => setEditUser(u) },
                          { label: 'Ganti Password', onClick: () => setPasswordUser(u) },
                          ...(u.role !== 'admin'
                            ? [
                                {
                                  label: u.role === 'validator' ? 'Cabut Validator' : 'Jadikan Validator',
                                  onClick: () => toggleValidator.mutate(u.id),
                                },
                                {
                                  label: u.is_suspended ? 'Aktifkan' : 'Suspend',
                                  onClick: () => toggleSuspend.mutate(u.id),
                                },
                                {
                                  label: 'Hapus',
                                  onClick: () => setDeleteUser(u),
                                  variant: 'danger' as const,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={invalidate}
      />
      {editUser && (
        <UserFormModal
          open={Boolean(editUser)}
          onClose={() => setEditUser(null)}
          onSaved={invalidate}
          user={editUser}
        />
      )}
      {passwordUser && (
        <PasswordModal
          open={Boolean(passwordUser)}
          onClose={() => setPasswordUser(null)}
          user={passwordUser}
        />
      )}

      <Modal
        open={Boolean(deleteUser)}
        onClose={() => setDeleteUser(null)}
        dismissible={!deleteMutation.isPending}
        labelledBy="delete-user-title"
      >
        <h2 id="delete-user-title" className="text-lg font-semibold">
          Hapus pengguna
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Yakin ingin menghapus <span className="font-semibold">{deleteUser?.name}</span>? Submission
          milik pengguna ini akan ikut terhapus. Kosakata yang sudah dipublikasikan tetap ada.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setDeleteUser(null)}
            disabled={deleteMutation.isPending}
            className="btn-outline"
          >
            Batal
          </button>
          <button
            onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
            disabled={deleteMutation.isPending}
            className="btn-danger"
          >
            {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

const ROLES: User['role'][] = ['contributor', 'validator', 'admin'];

// UserFormModal creates a new user (no `user` prop) or edits an existing one.
function UserFormModal({
  open,
  onClose,
  onSaved,
  user,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: User;
}) {
  const toast = useToast();
  const isEdit = Boolean(user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('contributor');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setRole(user?.role ?? 'contributor');
    setPassword('');
    setError(null);
  }, [open, user]);

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? adminApi.updateUser(user!.id, { name: name.trim(), email: email.trim(), role })
        : adminApi
            .createUser({ name: name.trim(), email: email.trim(), password, role })
            .then(() => undefined),
    onSuccess: () => {
      toast.success(isEdit ? 'Pengguna diperbarui.' : 'Pengguna ditambahkan.');
      onSaved();
      onClose();
    },
    onError: (err) => setError(extractError(err)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Nama wajib diisi');
    if (!email.trim() || !email.includes('@')) return setError('Email tidak valid');
    if (!isEdit && password.length < 8) return setError('Password minimal 8 karakter');
    mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={() => !mutation.isPending && onClose()}
      dismissible={!mutation.isPending}
      labelledBy="user-form-title"
    >
      <h2 id="user-form-title" className="text-lg font-semibold">
        {isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}
      </h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Nama *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </div>
        {!isEdit && (
          <div>
            <label className="mb-1 block text-sm font-medium">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Minimal 8 karakter"
              required
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">Role *</label>
          <select value={role} onChange={(e) => setRole(e.target.value as User['role'])} className="input">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="btn-outline">
            Batal
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
}) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => adminApi.resetPassword(user.id, password),
    onSuccess: () => {
      toast.success('Password diperbarui.');
      onClose();
    },
    onError: (err) => setError(extractError(err)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Password minimal 8 karakter');
    mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={() => !mutation.isPending && onClose()}
      dismissible={!mutation.isPending}
      labelledBy="password-modal-title"
    >
      <h2 id="password-modal-title" className="text-lg font-semibold">
        Ganti Password
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Atur password baru untuk <span className="font-semibold">{user.name}</span>.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          placeholder="Password baru (minimal 8 karakter)"
          required
        />
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={mutation.isPending} className="btn-outline">
            Batal
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReportsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => adminApi.listReports(1, 100) });
  const handle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resolved' | 'dismissed' }) => adminApi.handleReport(id, action),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast.success(variables.action === 'resolved' ? 'Laporan ditandai selesai.' : 'Laporan ditutup tanpa perubahan.');
    },
    onError: (err) => toast.error(extractError(err)),
  });

  const reports = q.data?.items ?? [];
  const urgentCount = reports.filter((r) => r.reason === 'konten_tidak_pantas').length;
  const activeId = handle.variables?.id;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Laporan terbuka</div>
          <div className="mt-2 text-2xl font-semibold">{q.isLoading ? '...' : reports.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Prioritas tinggi</div>
          <div className="mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-300">{q.isLoading ? '...' : urgentCount}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Alur kerja</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Buka entri, koreksi bila perlu, lalu tandai selesai. Tutup jika laporan tidak valid.
          </p>
        </div>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
          {extractError(q.error)}
        </div>
      ) : reports.length === 0 ? (
        <div className="card text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 size={22} />
          </div>
          <h3 className="font-semibold">Tidak ada laporan terbuka</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Semua laporan sudah diproses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportReviewCard
              key={report.id}
              report={report}
              isBusy={handle.isPending && activeId === report.id}
              onResolve={() => handle.mutate({ id: report.id, action: 'resolved' })}
              onDismiss={() => handle.mutate({ id: report.id, action: 'dismissed' })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const REPORT_REASON_LABELS: Record<string, string> = {
  ejaan_salah: 'Ejaan salah',
  arti_tidak_tepat: 'Arti tidak tepat',
  contoh_salah: 'Contoh kalimat salah',
  konten_tidak_pantas: 'Konten tidak pantas',
  lainnya: 'Lainnya',
};

function ReportReviewCard({
  report,
  isBusy,
  onResolve,
  onDismiss,
}: {
  report: ReportItem;
  isBusy: boolean;
  onResolve: () => void;
  onDismiss: () => void;
}) {
  const isUrgent = report.reason === 'konten_tidak_pantas';
  const entryUrl = report.entry_slug ? `/kata/${report.entry_slug}` : undefined;

  return (
    <div className="card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${isUrgent ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'}`}>
              <Flag size={13} /> {REPORT_REASON_LABELS[report.reason] ?? report.reason}
            </span>
            {report.entry_language && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {report.entry_language === 'id' ? 'Indonesia' : 'Manggarai'}
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">{formatRelative(report.created_at)}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{report.entry_name || 'Kosakata'}</h3>
            {entryUrl && (
              <a
                href={entryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300"
              >
                Buka entri <ExternalLink size={14} />
              </a>
            )}
          </div>

          {report.description ? (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200">
              {report.description}
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-slate-500 dark:text-slate-400">Pelapor tidak menambahkan detail.</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            className="btn-outline border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-900/20"
            disabled={isBusy}
            onClick={onDismiss}
            title="Tutup laporan jika tidak valid atau tidak perlu perubahan."
          >
            <XCircle size={16} /> Tutup
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={isBusy}
            onClick={onResolve}
            title="Tandai selesai setelah entri diperiksa atau diperbaiki."
          >
            <CheckCircle2 size={16} /> {isBusy ? 'Memproses...' : 'Selesai'}
          </button>
        </div>
      </div>
    </div>
  );
}

