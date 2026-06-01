// Neutral bidirectional model: a word exists in either language ('id' | 'mgr'),
// and translations link a word to its counterparts in the other language.

export type Language = 'id' | 'mgr';

export interface DerivedWord {
  id: string;
  word_id: string;
  word: string;
  translation: string;
  sort_order: number;
  created_at: string;
}

export interface TranslationExample {
  id: string;
  manggarai: string;
  indonesian: string;
  sort_order: number;
}

export interface TranslationLink {
  translation_id: string;
  word_id: string;
  lemma: string;
  slug: string;
  part_of_speech?: string;
  notes?: string;
  source?: string;
  examples?: TranslationExample[];
}

export interface EntrySummary {
  id: string;
  language: Language;
  lemma: string;
  slug: string;
  homonym_number?: number;
  part_of_speech?: string;
  translations?: string[];
}

export interface EntryDetail {
  id: string;
  language: Language;
  lemma: string;
  slug: string;
  homonym_number?: number;
  part_of_speech?: string;
  status: 'published' | 'archived';
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  translations: TranslationLink[];
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
