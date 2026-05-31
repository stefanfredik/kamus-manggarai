import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta } from '@/types/api.types';

export interface SubmissionDerivedInput {
  word: string;
  translation: string;
}

export interface SubmissionSenseInput {
  indonesian: string;
  part_of_speech?: string;
  notes?: string;
}

export interface SubmissionPayload {
  manggarai: string;
  senses: SubmissionSenseInput[];
  source?: string;
  derived?: SubmissionDerivedInput[];
}

export interface Submission {
  id: string;
  submitted_by: string;
  submitter_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  payload: SubmissionPayload;
  reviewed_by?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  was_edited: boolean;
  resulting_entry_id?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export const contributionApi = {
  async submit(payload: SubmissionPayload): Promise<Submission> {
    const resp = await api.post<ApiResponse<Submission>>('/submissions', payload);
    return resp.data.data;
  },
  async listMine(page = 1, limit = 20): Promise<{ items: Submission[]; meta: PaginationMeta }> {
    const resp = await api.get<ApiResponse<Submission[]>>('/submissions', { params: { page, limit } });
    return { items: resp.data.data, meta: resp.data.meta ?? { page, limit, total: resp.data.data.length } };
  },
  async getDetail(id: string): Promise<Submission> {
    const resp = await api.get<ApiResponse<Submission>>(`/submissions/${id}`);
    return resp.data.data;
  },
  async edit(id: string, payload: SubmissionPayload): Promise<Submission> {
    const resp = await api.put<ApiResponse<Submission>>(`/submissions/${id}`, payload);
    return resp.data.data;
  },
  async listNotifications(page = 1, limit = 20): Promise<{ items: NotificationItem[]; unread: number; meta: PaginationMeta }> {
    const resp = await api.get<{ success: boolean; data: { items: NotificationItem[]; unread: number }; meta: PaginationMeta }>(
      '/notifications',
      { params: { page, limit } },
    );
    return { items: resp.data.data.items, unread: resp.data.data.unread, meta: resp.data.meta };
  },
  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },
};
