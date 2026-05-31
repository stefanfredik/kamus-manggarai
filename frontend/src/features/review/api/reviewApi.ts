import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta } from '@/types/api.types';
import type { Submission, SubmissionPayload } from '@/features/contribution/api/contributionApi';

export const reviewApi = {
  async getQueue(page = 1, limit = 20): Promise<{ items: Submission[]; meta: PaginationMeta }> {
    const resp = await api.get<ApiResponse<Submission[]>>('/review/queue', { params: { page, limit } });
    return { items: resp.data.data, meta: resp.data.meta ?? { page, limit, total: resp.data.data.length } };
  },
  async getDetail(id: string): Promise<Submission> {
    const resp = await api.get<ApiResponse<Submission>>(`/review/queue/${id}`);
    return resp.data.data;
  },
  async approve(id: string): Promise<Submission> {
    const resp = await api.post<ApiResponse<Submission>>(`/review/queue/${id}/approve`);
    return resp.data.data;
  },
  async reject(id: string, notes: string): Promise<Submission> {
    const resp = await api.post<ApiResponse<Submission>>(`/review/queue/${id}/reject`, { notes });
    return resp.data.data;
  },
  async revise(id: string, payload: SubmissionPayload, notes?: string): Promise<Submission> {
    const resp = await api.put<ApiResponse<Submission>>(`/review/queue/${id}/revise`, { payload, notes });
    return resp.data.data;
  },
};
