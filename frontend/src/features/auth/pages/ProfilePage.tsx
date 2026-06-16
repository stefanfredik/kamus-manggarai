import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, Mail, Shield, Calendar, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/authApi';
import { extractError } from '@/lib/axios';
import { useToast } from '@/shared/components/Toast';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

export function ProfilePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize values from auth store
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ name, email }),
    onSuccess: () => {
      if (user) {
        const updatedUser = { ...user, name, email };
        setUser(updatedUser);
        qc.setQueryData(['auth', 'me'], updatedUser);
        qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      }
      toast.success('Profil berhasil diperbarui.');
      setError(null);
    },
    onError: (err) => {
      setError(extractError(err));
    },
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-slate-500">Anda harus masuk terlebih dahulu.</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Email tidak valid');
      return;
    }

    updateMutation.mutate();
  }

  // Format joined date
  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola detail profil pribadi dan opsi keamanan akun Anda.
        </p>
      </header>

      <div className="space-y-6">
        {/* User Card Header */}
        <div className="card flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left bg-gradient-to-r from-primary-50/50 to-primary-100/10 dark:from-primary-950/20 dark:to-primary-900/5 border border-primary-100/30 dark:border-primary-900/10 p-5 rounded-2xl">
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.name} 
              className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-500/20" 
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-150 text-2xl font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{user.name}</h2>
            <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-900/50 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:text-primary-300 capitalize">
                <Shield size={12} /> {user.role}
              </span>
              {user.is_google_user && (
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-350">
                  Google Account
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="card p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <UserIcon size={18} className="text-slate-500" /> Detail Profil
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-350">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input text-sm"
                required
                placeholder="Masukkan nama lengkap Anda"
                disabled={updateMutation.isPending}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-350">
                Alamat Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pr-10 text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800/40 disabled:text-slate-500"
                  required
                  placeholder="name@example.com"
                  disabled={user.is_google_user || updateMutation.isPending}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </span>
              </div>
              {user.is_google_user && (
                <p className="mt-1 text-[11px] text-slate-400 leading-normal">
                  Alamat email akun Google Anda diverifikasi dan tidak dapat diubah di sini.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500">
                  Role Akun
                </label>
                <div className="input border-slate-100 bg-slate-50/50 dark:border-slate-850 dark:bg-slate-800/40 text-slate-500 text-sm flex items-center capitalize">
                  {user.role}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-500 flex items-center gap-1.5">
                  <Calendar size={14} /> Bergabung Sejak
                </label>
                <div className="input border-slate-100 bg-slate-50/50 dark:border-slate-850 dark:bg-slate-800/40 text-slate-500 text-sm flex items-center">
                  {joinedDate}
                </div>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="btn-primary text-sm py-2 px-5"
              >
                {updateMutation.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>

        {/* Security Settings Section */}
        {!user.is_google_user && (
          <div className="card p-6 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <KeyRound size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Kata Sandi Akun</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ganti kata sandi secara berkala untuk menjaga keamanan akun Anda.
                  </p>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="btn-outline w-full text-xs font-semibold py-2 px-4 flex items-center justify-center gap-1.5"
                >
                  <KeyRound size={13} /> Ganti Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </div>
  );
}
