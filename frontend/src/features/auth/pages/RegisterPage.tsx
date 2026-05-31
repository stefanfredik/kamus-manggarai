import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { extractError } from '@/lib/axios';

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.register({ email, name, password }),
    onSuccess: (data) => {
      setAuth(data.access_token, data.user);
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => setError(extractError(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) {
      setError('Semua field wajib diisi');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-rise">
        <div className="surface p-7 shadow-card">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-soft">
              <span className="text-base font-bold">KM</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Buat akun baru</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sudah punya akun?{' '}
              <Link to="/masuk" className="font-medium text-primary-600 hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Nama lengkap
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="input"
                placeholder="Nama Anda"
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input"
                placeholder="nama@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input pr-16"
                  placeholder="Minimal 8 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="label">
                Konfirmasi password
              </label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="input"
                placeholder="Ketik ulang password"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
              {mutation.isPending ? 'Memproses…' : 'Buat Akun'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="divider" />
            <span className="text-xs text-slate-500 dark:text-slate-400">atau</span>
            <div className="divider" />
          </div>

          <a href={authApi.googleLoginUrl()} className="btn-outline w-full">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1H12v3.2h5.35c-.23 1.45-1.66 4.25-5.35 4.25-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.78 4.05 14.62 3 12 3 6.99 3 2.95 7.04 2.95 12.05S6.99 21.1 12 21.1c6.93 0 8.66-6.05 8.07-9.99h-7.07Z"
              />
            </svg>
            Daftar dengan Google
          </a>
        </div>
      </div>
    </div>
  );
}
