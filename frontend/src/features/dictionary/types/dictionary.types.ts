// Bidirectional model: Indonesian <-> Manggarai. A Manggarai headword (entry)
// can have multiple senses (Indonesian translations) plus derived words.

export interface DerivedWord {
  id: string;
  entry_id: string;
  word: string;
  translation: string;
  sort_order: number;
  created_at: string;
}

export interface Sense {
  id: string;
  entry_id: string;
  indonesian: string;
  part_of_speech?: string;
  notes?: string;
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
  translations?: string[];
}

export interface EntryDetail {
  id: string;
  manggarai: string;
  slug: string;
  homonym_number?: number;
  source?: string;
  status: 'published' | 'archived';
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  senses: Sense[];
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
