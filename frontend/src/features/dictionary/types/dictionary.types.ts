// Neutral bidirectional model: a word exists in either language ('id' | 'mgr'),
// and translations link a word to its counterparts in the other language.

export type Language = 'id' | 'mgr';

export interface TranslationDialect {
  id: string;
  name: string;
  description?: string;
}

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
  dialect_id?: string;
}

export interface TranslationLink {
  translation_id: string;
  word_id: string;
  lemma: string;
  slug: string;
  part_of_speech?: string;
  notes?: string;
  source?: string;
  dialects?: TranslationDialect[];
  examples: TranslationExample[];
}

export interface EntrySummary {
  id: string;
  language: Language;
  lemma: string;
  slug: string;
  homonym_number?: number;
  part_of_speech?: string;
  translations?: string[];
  dialects?: TranslationDialect[];
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
  dialects?: TranslationDialect[];
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


export interface ReportItem {
  id: string;
  entry_id: string;
  entry_name?: string;
  entry_slug?: string;
  entry_language?: Language;
  reported_by?: string;
  reason: ReportPayload['reason'];
  description?: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolved_at?: string;
  created_at: string;
}
