import { api } from '@/lib/axios';
import type { ApiResponse, PaginationMeta } from '@/types/api.types';
import type {
  EntryDetail,
  EntrySummary,
  ReportItem,
  ReportPayload,
  SearchParams,
  SearchResult,
} from '../types/dictionary.types';

export const dictionaryApi = {
  async listEntries(
    page = 1,
    limit = 20,
    letter?: string,
    lang?: string,
  ): Promise<{ items: EntrySummary[]; meta: PaginationMeta }> {
    const params: Record<string, string | number> = { page, limit };
    if (letter) params.letter = letter;
    if (lang) params.lang = lang;
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
    const resp = await api.get<ApiResponse<SearchResult>>('/search', { params: queryParams });
    return resp.data.data;
  },

  async reportEntry(slug: string, payload: ReportPayload): Promise<void> {
    await api.post(`/entries/${encodeURIComponent(slug)}/reports`, payload);
  },

  async listMyReports(page = 1, limit = 20): Promise<{ items: ReportItem[]; meta: PaginationMeta }> {
    const resp = await api.get<ApiResponse<ReportItem[]>>('/reports', { params: { page, limit } });
    return { items: resp.data.data, meta: resp.data.meta ?? { page, limit, total: resp.data.data.length } };
  },
};
