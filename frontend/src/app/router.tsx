import { lazy, Suspense, useEffect, useRef } from 'react';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { HomePage } from '@/features/dictionary/pages/HomePage';
import { EntryDetailPage } from '@/features/dictionary/pages/EntryDetailPage';
import { BrowsePage } from '@/features/dictionary/pages/BrowsePage';
import { GoetPage } from '@/features/goet/pages/GoetPage';
import { AuthCallback } from '@/features/auth/components/AuthCallback';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';

const DashboardPage = lazy(() =>
  import('@/features/contribution/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const SubmissionsPage = lazy(() =>
  import('@/features/contribution/pages/SubmissionsPage').then((m) => ({ default: m.SubmissionsPage })),
);
const ReportsPage = lazy(() =>
  import('@/features/contribution/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const ReviewQueuePage = lazy(() =>
  import('@/features/review/pages/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage })),
);
const ReviewDetailPage = lazy(() =>
  import('@/features/review/pages/ReviewDetailPage').then((m) => ({ default: m.ReviewDetailPage })),
);
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const ProfilePage = lazy(() =>
  import('@/features/auth/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const LeaderboardPage = lazy(() =>
  import('@/features/auth/pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
);

function SuspenseFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="space-y-3">
        <div className="skeleton h-8 w-1/3" />
        <div className="card h-24 animate-pulse" />
        <div className="card h-24 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Persistent shell: PageLayout (and the Sidebar with its collapse state) stays
 * mounted across navigations. Resets the main scroll position on route change.
 */
function RootLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <PageLayout mainRef={mainRef}>
      <Suspense fallback={<SuspenseFallback />}>
        <Outlet />
      </Suspense>
    </PageLayout>
  );
}

export const router = createBrowserRouter([
  // Auth callback runs outside the layout shell.
  { path: '/auth/callback', element: <AuthCallback /> },

  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/kata/:slug', element: <EntryDetailPage /> },
      { path: '/jelajah', element: <BrowsePage /> },
      { path: '/jelajah/:letter', element: <BrowsePage /> },
      { path: '/goet', element: <GoetPage /> },
      { path: '/pahlawan', element: <LeaderboardPage /> },
      { path: '/masuk', element: <LoginPage /> },
      { path: '/daftar', element: <RegisterPage /> },

      {
        path: '/dashboard',
        element: (
          <ProtectedRoute roles={['contributor', 'validator', 'admin']}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/submissions',
        element: (
          <ProtectedRoute roles={['contributor', 'validator', 'admin']}>
            <SubmissionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/reports',
        element: (
          <ProtectedRoute roles={['contributor', 'validator', 'admin']}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/profile',
        element: (
          <ProtectedRoute roles={['contributor', 'validator', 'admin']}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },

      {
        path: '/validator',
        element: (
          <ProtectedRoute roles={['validator', 'admin']}>
            <ReviewQueuePage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/validator/:id',
        element: (
          <ProtectedRoute roles={['validator', 'admin']}>
            <ReviewDetailPage />
          </ProtectedRoute>
        ),
      },

      {
        path: '/admin',
        element: (
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage initialTab="users" />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/kosakata',
        element: (
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage initialTab="kosakata" />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/reports',
        element: (
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage initialTab="reports" />
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/analytics',
        element: (
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage initialTab="analytics" />
          </ProtectedRoute>
        ),
      },

      { path: '*', element: <NotFound /> },
    ],
  },
]);

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-2 text-slate-500">Halaman tidak ditemukan.</p>
    </div>
  );
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
