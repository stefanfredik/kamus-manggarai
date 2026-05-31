import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta, User } from '@/types/api.types';

export interface ReportItem {
  id: string;
  entry_id: string;
  entry_name?: string;
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

export const adminApi = {
  async listUsers(page = 1, limit = 20): Promise<{ items: User[]; meta: PaginationMeta }> {
    const resp = await api.get<ApiResponse<User[]>>('/admin/users', { params: { page, limit } });
    return { items: resp.data.data, meta: resp.data.meta ?? { page, limit, total: resp.data.data.length } };
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
};
