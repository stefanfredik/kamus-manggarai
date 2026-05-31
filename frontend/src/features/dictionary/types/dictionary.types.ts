// Simplified bidirectional model: Indonesian <-> Manggarai with derived words.

export interface DerivedWord {
  id: string;
  entry_id: string;
  word: string;
  translation: string;
  sort_order: number;
  created_at: string;
}

export interface EntrySummary {
  id: string;
  indonesian: string;
  manggarai: string;
  slug: string;
  homonym_number?: number;
  part_of_speech?: string;
}

export interface EntryDetail {
  id: string;
  indonesian: string;
  manggarai: string;
  slug: string;
  homonym_number?: number;
  part_of_speech?: string;
  notes?: string;
  source?: string;
  status: 'published' | 'archived';
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  derived_words: DerivedWord[];
}

export type SearchDirection = 'manggarai_to_indonesia' | 'indonesia_to_manggarai';

export interface SearchResult {
  items: EntrySummary[];
  total: number;
  page: number;
  limit: number;
  suggestions?: string[];
}

export interface SearchParams {
  q: string;
  direction?: SearchDirection;
  page?: number;
  limit?: number;
}

export interface ReportPayload {
  reason: 'ejaan_salah' | 'arti_tidak_tepat' | 'contoh_salah' | 'konten_tidak_pantas' | 'lainnya';
  description?: string;
}
