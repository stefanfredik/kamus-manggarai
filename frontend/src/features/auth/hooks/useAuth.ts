import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/authApi';

export function useAuth() {
  const { user, accessToken, isAuthenticated, setUser, logout: clearAuth } = useAuthStore();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: Boolean(accessToken) && !user,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser]);

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      clearAuth();
    }
  }

  return {
    user: user ?? meQuery.data ?? null,
    isAuthenticated,
    isLoading: meQuery.isLoading,
    logout,
    loginUrl: authApi.googleLoginUrl(),
  };
}
