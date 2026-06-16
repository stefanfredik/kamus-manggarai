import { Link, NavLink } from 'react-router-dom';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  Search,
  BookOpen,
  House,
  ClipboardList,
  CircleCheck,
  Flag,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/shared/theme';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type IconType = ComponentType<{ className?: string; size?: number | string }>;

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  end?: boolean;
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const mainNav: NavItem[] = [
    { to: '/', label: 'Cari Kata', icon: Search, end: true },
    { to: '/jelajah', label: 'Jelajah', icon: BookOpen },
    { to: '/goet', label: 'Goet', icon: ClipboardList },
  ];

  const userNav: NavItem[] = [];
  if (isAuthenticated) {
    userNav.push({ to: '/dashboard', label: 'Dashboard', icon: House });
    userNav.push({ to: '/dashboard/submissions', label: 'Submission Saya', icon: ClipboardList });
    userNav.push({ to: '/dashboard/reports', label: 'Laporan Saya', icon: Flag });
  }
  if (user?.role === 'validator' || user?.role === 'admin') {
    userNav.push({ to: '/validator', label: 'Review', icon: CircleCheck });
  }
  if (user?.role === 'admin') {
    userNav.push({ to: '/admin', label: 'Admin', icon: Settings });
  }

  const width = collapsed ? 'lg:w-[68px]' : 'lg:w-64';

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-slate-50 transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:z-auto lg:translate-x-0 ${width} ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand + collapse */}
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <Link to="/" onClick={onClose} className="flex min-w-0 items-center gap-2.5">
            <img 
              src="/logo.jpg" 
              alt="Logo Kamus Manggarai" 
              className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-sm border border-slate-100 dark:border-slate-800"
            />
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold leading-tight tracking-tight">
                  Kamus Manggarai
                </div>
                <div className="truncate text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                  Manggarai ↔ Indonesia
                </div>
              </div>
            )}
          </Link>
          <button
            onClick={onToggleCollapse}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 lg:flex"
            aria-label={collapsed ? 'Lebarkan sidebar' : 'Lipat sidebar'}
            title={collapsed ? 'Lebarkan sidebar' : 'Lipat sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {mainNav.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onClose} />
          ))}

          {userNav.length > 0 && (
            <>
              {!collapsed && (
                <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Kontribusi
                </div>
              )}
              {collapsed && <div className="my-2 border-t border-slate-200 dark:border-slate-800" />}
              {userNav.map((item) => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onClose} />
              ))}
            </>
          )}
        </nav>

        {/* Footer: theme toggle + account */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            onClick={toggleTheme}
            className={`mb-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Ganti tema"
            aria-label="Ganti tema"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>}
          </button>

          {isAuthenticated && user ? (
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 ${
                  collapsed ? 'justify-center' : ''
                }`}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {!collapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-medium">{user.name}</div>
                    <div className="truncate text-[11px] capitalize text-slate-500 dark:text-slate-400">
                      {user.role}
                    </div>
                  </div>
                )}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop dark:border-slate-700 dark:bg-slate-800"
                >
                  <Link
                    to="/dashboard"
                    role="menuitem"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                    onClick={() => { setMenuOpen(false); onClose(); }}
                  >
                    <House size={15} /> Dashboard
                  </Link>
                  <button
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); void logout(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={`flex gap-1.5 ${collapsed ? 'flex-col' : ''}`}>
              <Link
                to="/masuk"
                onClick={onClose}
                className="btn-outline flex-1 text-sm"
                title="Masuk"
              >
                {collapsed ? <ArrowRight size={16} /> : 'Masuk'}
              </Link>
              {!collapsed && (
                <Link to="/daftar" onClick={onClose} className="btn-primary flex-1 text-sm">
                  Daftar
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={item.label}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
            : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
        }`
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}
