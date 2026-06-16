import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { TranslationDialect } from '@/features/dictionary/types/dictionary.types';

export const dialectApi = {
  async list(): Promise<TranslationDialect[]> {
    const resp = await api.get<ApiResponse<TranslationDialect[]>>('/dialects');
    return resp.data.data;
  },
  async create(name: string, description: string): Promise<TranslationDialect> {
    const resp = await api.post<ApiResponse<TranslationDialect>>('/admin/dialects', { name, description });
    return resp.data.data;
  },
  async update(id: string, name: string, description: string): Promise<TranslationDialect> {
    const resp = await api.put<ApiResponse<TranslationDialect>>(`/admin/dialects/${id}`, { name, description });
    return resp.data.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/admin/dialects/${id}`);
  },
};
