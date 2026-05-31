import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/refresh')) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken();
        }
        const newToken = await refreshPromise;
        refreshPromise = null;

        if (newToken && original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api.request(original);
        }
      } catch (refreshError) {
        refreshPromise = null;
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

async function refreshAccessToken(): Promise<string | null> {
  try {
    const resp = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const newToken = resp.data?.data?.access_token as string | undefined;
    const user = resp.data?.data?.user;
    if (newToken) {
      useAuthStore.getState().setAuth(newToken, user);
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    if (data?.error?.message) return data.error.message;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Terjadi kesalahan';
}

interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}
