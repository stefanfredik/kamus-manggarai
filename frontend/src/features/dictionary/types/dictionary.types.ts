export interface Dialect {
  id: string;
  name: string;
  slug: string;
  description?: string;
  region?: string;
  is_active: boolean;
  sort_order: number;
}

export interface EntrySummary {
  id: string;
  base_form: string;
  slug: string;
  part_of_speech?: string;
  dialects: string[];
  brief_meaning: string;
}

export interface ExampleSentence {
  id: string;
  sentence_source: string;
  sentence_translation: string;
}

export interface Definition {
  id: string;
  meaning: string;
  context_notes?: string;
  sort_order: number;
  sentences?: ExampleSentence[];
}

export interface EntryDialect {
  id: string;
  entry_id: string;
  dialect_id: string;
  dialect_name?: string;
  dialect_slug?: string;
  local_spelling?: string;
  is_available: boolean;
  definitions?: Definition[];
}

export interface RelatedEntry {
  id: string;
  base_form: string;
  slug: string;
  relation_type: 'sinonim' | 'antonim' | 'turunan' | 'berkaitan';
}

export interface EntryDetail {
  id: string;
  base_form: string;
  slug: string;
  part_of_speech?: string;
  notes?: string;
  status: 'published' | 'archived';
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  dialects: EntryDialect[];
  related_entries: RelatedEntry[];
}

export type SearchDirection = 'manggarai_to_indonesia' | 'indonesia_to_manggarai';

export interface SearchHit {
  id: string;
  base_form: string;
  slug: string;
  part_of_speech?: string;
  dialects: string[];
  meanings: string[];
}

export interface SearchResult {
  items: SearchHit[];
  total: number;
  page: number;
  limit: number;
  suggestions?: string[];
}

export interface SearchParams {
  q: string;
  direction?: SearchDirection;
  dialect_ids?: string[];
  page?: number;
  limit?: number;
}

export interface ReportPayload {
  reason: 'ejaan_salah' | 'arti_tidak_tepat' | 'contoh_salah' | 'konten_tidak_pantas' | 'lainnya';
  description?: string;
}
