import { api } from '@/lib/axios';
import type { ApiResponse, User } from '@/types/api.types';

export interface AuthResult {
  access_token: string;
  expires_in: number;
  user: User;
}

export const authApi = {
  async getMe(): Promise<User> {
    const resp = await api.get<ApiResponse<User>>('/auth/me');
    return resp.data.data;
  },
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
  googleLoginUrl(): string {
    const base = (import.meta.env.VITE_API_BASE_URL as string) || '/api/v1';
    return `${base}/auth/google`;
  },
  async register(input: { email: string; name: string; password: string }): Promise<AuthResult> {
    const resp = await api.post<ApiResponse<AuthResult>>('/auth/register', input);
    return resp.data.data;
  },
  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const resp = await api.post<ApiResponse<AuthResult>>('/auth/login', input);
    return resp.data.data;
  },
};
