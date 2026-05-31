import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setAuth(token);
      const redirect = params.get('redirect') || '/dashboard';
      navigate(redirect, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [params, setAuth, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-sm text-slate-500">Menyelesaikan login…</p>
      </div>
    </div>
  );
}
