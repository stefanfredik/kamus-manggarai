import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PageLayout } from '@/shared/components/layout/PageLayout';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { HomePage } from '@/features/dictionary/pages/HomePage';
import { EntryDetailPage } from '@/features/dictionary/pages/EntryDetailPage';
import { DialectBrowsePage } from '@/features/dictionary/pages/DialectBrowsePage';
import { AuthCallback } from '@/features/auth/components/AuthCallback';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';

const DashboardPage = lazy(() =>
  import('@/features/contribution/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const SubmitPage = lazy(() =>
  import('@/features/contribution/pages/SubmitPage').then((m) => ({ default: m.SubmitPage })),
);
const SubmissionsPage = lazy(() =>
  import('@/features/contribution/pages/SubmissionsPage').then((m) => ({ default: m.SubmissionsPage })),
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

function withLayout(node: React.ReactNode) {
  return (
    <PageLayout>
      <Suspense fallback={<div className="py-20 text-center text-slate-500">Memuat…</div>}>
        {node}
      </Suspense>
    </PageLayout>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: withLayout(<HomePage />) },
  { path: '/kata/:slug', element: withLayout(<EntryDetailPage />) },
  { path: '/dialek', element: withLayout(<DialectBrowsePage />) },
  { path: '/dialek/:dialect', element: withLayout(<DialectBrowsePage />) },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/masuk', element: withLayout(<LoginPage />) },
  { path: '/daftar', element: withLayout(<RegisterPage />) },

  {
    path: '/dashboard',
    element: withLayout(
      <ProtectedRoute roles={['contributor', 'validator', 'admin']}>
        <DashboardPage />
      </ProtectedRoute>,
    ),
  },
  {
    path: '/dashboard/submit',
    element: withLayout(
      <ProtectedRoute roles={['contributor', 'validator', 'admin']}>
        <SubmitPage />
      </ProtectedRoute>,
    ),
  },
  {
    path: '/dashboard/submissions',
    element: withLayout(
      <ProtectedRoute roles={['contributor', 'validator', 'admin']}>
        <SubmissionsPage />
      </ProtectedRoute>,
    ),
  },

  {
    path: '/validator',
    element: withLayout(
      <ProtectedRoute roles={['validator', 'admin']}>
        <ReviewQueuePage />
      </ProtectedRoute>,
    ),
  },
  {
    path: '/validator/:id',
    element: withLayout(
      <ProtectedRoute roles={['validator', 'admin']}>
        <ReviewDetailPage />
      </ProtectedRoute>,
    ),
  },

  {
    path: '/admin',
    element: withLayout(
      <ProtectedRoute roles={['admin']}>
        <AdminDashboardPage />
      </ProtectedRoute>,
    ),
  },
  {
    path: '/admin/users',
    element: withLayout(
      <ProtectedRoute roles={['admin']}>
        <AdminDashboardPage initialTab="users" />
      </ProtectedRoute>,
    ),
  },
  {
    path: '/admin/dialects',
    element: withLayout(
      <ProtectedRoute roles={['admin']}>
        <AdminDashboardPage initialTab="dialects" />
      </ProtectedRoute>,
    ),
  },
  {
    path: '/admin/reports',
    element: withLayout(
      <ProtectedRoute roles={['admin']}>
        <AdminDashboardPage initialTab="reports" />
      </ProtectedRoute>,
    ),
  },
  {
    path: '/admin/analytics',
    element: withLayout(
      <ProtectedRoute roles={['admin']}>
        <AdminDashboardPage initialTab="analytics" />
      </ProtectedRoute>,
    ),
  },

  { path: '*', element: withLayout(<NotFound />) },
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
