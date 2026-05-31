import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LoginButton } from '@/features/auth/components/LoginButton';
import { useEffect, useState } from 'react';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [dark, setDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <span className="text-sm font-bold">KM</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-tight">Kamus Manggarai</div>
            <div className="text-xs text-slate-500 leading-tight">Bahasa Manggarai ↔ Indonesia</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navLinkClass}>Beranda</NavLink>
          <NavLink to="/dialek" className={navLinkClass}>Dialek</NavLink>
          {isAuthenticated && (
            <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
          )}
          {user?.role === 'validator' || user?.role === 'admin' ? (
            <NavLink to="/validator" className={navLinkClass}>Review</NavLink>
          ) : null}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark((v) => !v)}
            className="btn-ghost h-9 w-9 p-0"
            aria-label="Toggle tema"
            title="Toggle tema"
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {!isAuthenticated && <LoginButton />}

          {isAuthenticated && user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden text-sm sm:inline">{user.name.split(' ')[0]}</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link to="/dashboard" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/dashboard/submissions" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => setMenuOpen(false)}>
                    Submission saya
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); void logout(); }}
                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;
}
