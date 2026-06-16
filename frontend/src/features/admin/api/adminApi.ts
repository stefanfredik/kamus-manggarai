import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta, User } from '@/types/api.types';
import type {
  SubmissionDerivedInput,
  SubmissionTranslationInput,
} from '@/features/contribution/api/contributionApi';

export interface ReportItem {
  id: string;
  entry_id: string;
  entry_name?: string;
  entry_slug?: string;
  entry_language?: 'id' | 'mgr';
  reported_by?: string;
  reason: string;
  description?: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface AnalyticsData {
  total_entries: number;
  submissions_by_status: Record<string, number>;
  top_contributors: Array<{ user_id: string; name: string; total: number }>;
  growth_by_month: Array<{ month: string; total: number }>;
}

// WordUpdatePayload is the editable shape of a published word. Language and slug
// are immutable on the backend, so they are intentionally absent here.
export interface WordUpdatePayload {
  headword: string;
  part_of_speech?: string;
  source?: string;
  dialect_ids?: string[];
  translations: SubmissionTranslationInput[];
  derived?: SubmissionDerivedInput[];
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: User['role'];
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  role: User['role'];
}

export const adminApi = {
  async listUsers(page = 1, limit = 20): Promise<{ items: User[]; meta: PaginationMeta }> {
    const resp = await api.get<ApiResponse<User[]>>('/admin/users', { params: { page, limit } });
    return { items: resp.data.data, meta: resp.data.meta ?? { page, limit, total: resp.data.data.length } };
  },
  async createUser(payload: CreateUserPayload): Promise<User> {
    const resp = await api.post<ApiResponse<User>>('/admin/users', payload);
    return resp.data.data;
  },
  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    const resp = await api.put<ApiResponse<User>>(`/admin/users/${id}`, payload);
    return resp.data.data;
  },
  async resetPassword(id: string, password: string): Promise<void> {
    await api.patch(`/admin/users/${id}/password`, { password });
  },
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },
  async toggleValidator(id: string): Promise<User> {
    const resp = await api.patch<ApiResponse<User>>(`/admin/users/${id}/toggle-validator`);
    return resp.data.data;
  },
  async toggleSuspend(id: string): Promise<User> {
    const resp = await api.patch<ApiResponse<User>>(`/admin/users/${id}/toggle-suspend`);
    return resp.data.data;
  },
  async listReports(page = 1, limit = 20): Promise<{ items: ReportItem[]; meta: PaginationMeta }> {
    const resp = await api.get<ApiResponse<ReportItem[]>>('/admin/reports', { params: { page, limit } });
    return { items: resp.data.data, meta: resp.data.meta ?? { page, limit, total: resp.data.data.length } };
  },
  async handleReport(id: string, action: 'resolved' | 'dismissed'): Promise<void> {
    await api.patch(`/admin/reports/${id}`, { action });
  },
  async getAnalytics(): Promise<AnalyticsData> {
    const resp = await api.get<ApiResponse<AnalyticsData>>('/admin/analytics');
    return resp.data.data;
  },
  async updateWord(id: string, payload: WordUpdatePayload): Promise<void> {
    await api.put(`/admin/words/${id}`, payload);
  },
  async deleteWord(id: string): Promise<void> {
    await api.delete(`/admin/words/${id}`);
  },
};
