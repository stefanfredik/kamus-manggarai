import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta } from '@/types/api.types';

export interface Goet {
  id: string;
  manggarai: string;
  meaning: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface GoetPayload {
  manggarai: string;
  meaning: string;
}

export const goetApi = {
  async list(page = 1, limit = 20, q?: string): Promise<{ items: Goet[]; meta: PaginationMeta }> {
    const params: Record<string, string | number> = { page, limit };
    if (q && q.trim()) params.q = q.trim();
    const resp = await api.get<ApiResponse<Goet[]>>('/goet', { params });
    return { items: resp.data.data, meta: resp.data.meta ?? { page, limit, total: resp.data.data.length } };
  },
  async getById(id: string): Promise<Goet> {
    const resp = await api.get<ApiResponse<Goet>>(`/goet/${id}`);
    return resp.data.data;
  },
  async create(payload: GoetPayload): Promise<Goet> {
    const resp = await api.post<ApiResponse<Goet>>('/admin/goet', payload);
    return resp.data.data;
  },
  async update(id: string, payload: GoetPayload): Promise<Goet> {
    const resp = await api.put<ApiResponse<Goet>>(`/admin/goet/${id}`, payload);
    return resp.data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/admin/goet/${id}`);
  },
};
