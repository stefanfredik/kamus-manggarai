import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta } from '@/types/api.types';
import type {
  Dialect,
  EntryDetail,
  EntrySummary,
  ReportPayload,
  SearchParams,
  SearchResult,
} from '../types/dictionary.types';

export const dictionaryApi = {
  async listDialects(): Promise<Dialect[]> {
    const resp = await api.get<ApiResponse<Dialect[]>>('/dialects');
    return resp.data.data;
  },

  async listEntries(page = 1, limit = 20, dialectIds?: string[]): Promise<{ items: EntrySummary[]; meta: PaginationMeta }> {
    const params: Record<string, string | number> = { page, limit };
    if (dialectIds?.length) params.dialect_ids = dialectIds.join(',');
    const resp = await api.get<ApiResponse<EntrySummary[]>>('/entries', { params });
    return {
      items: resp.data.data,
      meta: resp.data.meta ?? { page, limit, total: resp.data.data.length },
    };
  },

  async getEntryDetail(slug: string): Promise<EntryDetail> {
    const resp = await api.get<ApiResponse<EntryDetail>>(`/entries/${encodeURIComponent(slug)}`);
    return resp.data.data;
  },

  async search(params: SearchParams): Promise<SearchResult> {
    const queryParams: Record<string, string | number> = {
      q: params.q,
      direction: params.direction ?? 'manggarai_to_indonesia',
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    };
    if (params.dialect_ids?.length) queryParams.dialect_ids = params.dialect_ids.join(',');
    const resp = await api.get<ApiResponse<SearchResult>>('/search', { params: queryParams });
    return resp.data.data;
  },

  async reportEntry(slug: string, payload: ReportPayload): Promise<void> {
    await api.post(`/entries/${encodeURIComponent(slug)}/reports`, payload);
  },
};
