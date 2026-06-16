import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Check, BookOpen, FileText, Layers } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type WordUpdatePayload } from '../api/adminApi';
import { dialectApi } from '../api/dialectApi';
import type {
  SubmissionDerivedInput,
  SubmissionExampleInput,
  SubmissionTranslationInput,
} from '@/features/contribution/api/contributionApi';
import type { EntryDetail, Language } from '@/features/dictionary/types/dictionary.types';
import { extractError } from '@/lib/axios';
import { Modal } from '@/shared/components/Modal';
import { useToast } from '@/shared/components/Toast';

const PARTS_OF_SPEECH = [
  'nomina',
  'verba',
  'adjektiva',
  'adverbia',
  'pronomina',
  'numeralia',
  'partikel',
  'interjeksi',
];



const LANG_LABEL: Record<Language, string> = {
  mgr: 'Manggarai',
  id: 'Indonesia',
};

type TranslationDraft = {
  lemma: string;
  part_of_speech: string;
  notes: string;
  dialect_ids: string[];
  examples: SubmissionExampleInput[];
  showNotes: boolean;
};

const emptyTranslation = (): TranslationDraft => ({
  lemma: '',
  part_of_speech: '',
  notes: '',
  dialect_ids: [],
  examples: [],
  showNotes: false,
});

// cleanExamples trims each pair and drops any where both sides are blank,
// returning undefined when nothing remains so the field is omitted from JSON.
function cleanExamples(
  examples: SubmissionExampleInput[],
): SubmissionExampleInput[] | undefined {
  const cleaned = examples
    .map((ex) => ({
      manggarai: ex.manggarai.trim(),
      indonesian: ex.indonesian.trim(),
      dialect_id: ex.dialect_id,
    }))
    .filter((ex) => ex.manggarai !== '' || ex.indonesian !== '');
  return cleaned.length > 0 ? cleaned : undefined;
}

interface WordEditModalProps {
  open: boolean;
  onClose: () => void;
  entry: EntryDetail;
}

export function WordEditModal({ open, onClose, entry }: WordEditModalProps) {
  const toast = useToast();
  const qc = useQueryClient();

  // Language and direction are immutable for an existing word; only the source
  // word maps to a single source, so we read it from the first translation link.
  const sourceLang = entry.language as Language;
  const targetLang: Language = sourceLang === 'mgr' ? 'id' : 'mgr';

  const [headword, setHeadword] = useState(entry.lemma);
  const [partOfSpeech, setPartOfSpeech] = useState(entry.part_of_speech ?? '');
  const [source, setSource] = useState('');
  const [rootDialectIds, setRootDialectIds] = useState<string[]>([]);
  const [translations, setTranslations] = useState<TranslationDraft[]>([emptyTranslation()]);
  const [derived, setDerived] = useState<SubmissionDerivedInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const { data: dialects = [] } = useQuery({
    queryKey: ['dialects'],
    queryFn: dialectApi.list,
  });

  // Snapshot of the seeded form, used to detect unsaved edits on close.
  const snapshotRef = useRef('');

  // Re-seed the form whenever a different entry is opened.
  useEffect(() => {
    if (!open) return;
    setHeadword(entry.lemma);
    setPartOfSpeech(entry.part_of_speech ?? '');
    setSource(entry.translations.find((t) => t.source)?.source ?? '');
    setRootDialectIds(entry.dialects?.map((d) => d.id) ?? []);
    setTranslations(
      entry.translations.length > 0
        ? entry.translations.map((t) => ({
            lemma: t.lemma,
            part_of_speech: t.part_of_speech ?? '',
            notes: t.notes ?? '',
            dialect_ids: t.dialects?.map((d) => d.id) ?? [],
            examples: (t.examples ?? []).map((ex) => ({
              manggarai: ex.manggarai,
              indonesian: ex.indonesian,
              dialect_id: ex.dialect_id,
            })),
            showNotes: Boolean(t.notes?.trim()),
          }))
        : [emptyTranslation()],
    );
    setDerived(
      entry.derived_words.map((d) => ({ word: d.word, translation: d.translation })),
    );
    setError(null);
    setSubmitted(false);
    // Snapshot the seeded values so close() can detect unsaved edits.
    snapshotRef.current = JSON.stringify({
      headword: entry.lemma,
      partOfSpeech: entry.part_of_speech ?? '',
      source: entry.translations.find((t) => t.source)?.source ?? '',
      rootDialectIds: entry.dialects?.map((d) => d.id) ?? [],
      translations: entry.translations.map((t) => ({
        lemma: t.lemma,
        part_of_speech: t.part_of_speech ?? '',
        notes: t.notes ?? '',
        dialect_ids: t.dialects?.map((d) => d.id) ?? [],
        examples: (t.examples ?? []).map((ex) => ({
          manggarai: ex.manggarai,
          indonesian: ex.indonesian,
          dialect_id: ex.dialect_id,
        })),
      })),
      derived: entry.derived_words.map((d) => ({ word: d.word, translation: d.translation })),
    });
  }, [open, entry]);

  // Serialize the current form the same way as the snapshot for comparison.
  function currentSnapshot() {
    return JSON.stringify({
      headword,
      partOfSpeech,
      source,
      rootDialectIds,
      translations: translations.map((t) => ({
        lemma: t.lemma,
        part_of_speech: t.part_of_speech,
        notes: t.notes,
        dialect_ids: t.dialect_ids,
        examples: t.examples.map((ex) => ({
          manggarai: ex.manggarai,
          indonesian: ex.indonesian,
          dialect_id: ex.dialect_id,
        })),
      })),
      derived,
    });
  }

  const updateMutation = useMutation({
    mutationFn: (payload: WordUpdatePayload) => adminApi.updateWord(entry.id, payload),
    onSuccess: () => {
      toast.success('Kosakata berhasil diperbarui.');
      qc.invalidateQueries({ queryKey: ['entry', entry.slug] });
      qc.invalidateQueries({ queryKey: ['admin', 'words'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      onClose();
    },
    onError: (err) => showError(extractError(err)),
  });

  function close() {
    if (updateMutation.isPending) return;
    if (currentSnapshot() !== snapshotRef.current && !window.confirm('Buang perubahan yang belum disimpan?')) {
      return;
    }
    onClose();
  }

  // Set the error and bring it into view — the modal scrolls, so a message at
  // the bottom can otherwise sit off-screen after the user hits save.
  function showError(msg: string) {
    setError(msg);
    requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  }

  // ---- translations ----
  function addTranslation() {
    setTranslations((prev) => [...prev, emptyTranslation()]);
  }
  function updateTranslation(idx: number, patch: Partial<TranslationDraft>) {
    setTranslations((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }
  function toggleDialect(tIdx: number, dialectId: string) {
    setTranslations((prev) =>
      prev.map((t, i) => {
        if (i !== tIdx) return t;
        const has = t.dialect_ids.includes(dialectId);
        return {
          ...t,
          dialect_ids: has ? t.dialect_ids.filter((d) => d !== dialectId) : [...t.dialect_ids, dialectId],
        };
      })
    );
  }
  function removeTranslation(idx: number) {
    setTranslations((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  // ---- examples (nested under a translation) ----
  function addExample(tIdx: number) {
    setTranslations((prev) =>
      prev.map((t, i) =>
        i === tIdx
          ? {
              ...t,
              examples: [...t.examples, { manggarai: '', indonesian: '', dialect_id: undefined }],
            }
          : t,
      ),
    );
  }
  function updateExample(tIdx: number, exIdx: number, patch: Partial<SubmissionExampleInput>) {
    setTranslations((prev) =>
      prev.map((t, i) =>
        i === tIdx
          ? { ...t, examples: t.examples.map((ex, j) => (j === exIdx ? { ...ex, ...patch } : ex)) }
          : t,
      ),
    );
  }
  function removeExample(tIdx: number, exIdx: number) {
    setTranslations((prev) =>
      prev.map((t, i) =>
        i === tIdx ? { ...t, examples: t.examples.filter((_, j) => j !== exIdx) } : t,
      ),
    );
  }

  // ---- derived ----
  function addDerived() {
    setDerived((prev) => [...prev, { word: '', translation: '' }]);
  }
  function updateDerived(idx: number, patch: Partial<SubmissionDerivedInput>) {
    setDerived((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }
  function removeDerived(idx: number) {
    setDerived((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitted(true);

    if (!headword.trim()) {
      showError(`Kata Bahasa ${LANG_LABEL[sourceLang]} wajib diisi`);
      return;
    }

    const cleanedTranslations = translations
      .filter((t) => t.lemma.trim() !== '')
      .map((t) => {
        const out: any = {
          lemma: t.lemma.trim(),
          part_of_speech: t.part_of_speech || undefined,
          notes: t.notes.trim() || undefined,
        };
        if (sourceLang === 'id' && t.dialect_ids.length > 0) {
          out.dialect_ids = t.dialect_ids;
        }
        const exs = cleanExamples(t.examples);
        if (exs) out.examples = exs;
        return out;
      });

    if (cleanedTranslations.length === 0) {
      showError(`Minimal satu terjemahan Bahasa ${LANG_LABEL[targetLang]} wajib diisi`);
      return;
    }

    const cleanedDerived = derived
      .map((d) => ({ word: d.word.trim(), translation: d.translation.trim() }))
      .filter((d) => d.word !== '');
    if (cleanedDerived.some((d) => d.translation === '')) {
      showError('Setiap kata turunan harus memiliki terjemahan');
      return;
    }

    updateMutation.mutate({
      headword: headword.trim(),
      part_of_speech: partOfSpeech || undefined,
      source: source || undefined,
      translations: cleanedTranslations,
      derived: cleanedDerived.length > 0 ? cleanedDerived : undefined,
      dialect_ids: sourceLang === 'mgr' && rootDialectIds.length > 0 ? rootDialectIds : undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!updateMutation.isPending}
      closeOnOverlayClick={false}
      labelledBy="edit-word-title"
      className="max-h-[92vh] sm:max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-3.5 sm:p-6 shadow-pop dark:bg-slate-800"
    >
      <h2 id="edit-word-title" className="text-xl font-bold">
        Edit Kosakata
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Mengubah kata utama Bahasa {LANG_LABEL[sourceLang]} beserta terjemahan dan kata turunannya.
        Arah bahasa tidak dapat diubah.
      </p>

      {/* Visual Roadmap/Stepper */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50/80 p-3 text-xs dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white text-[10px] font-bold shadow-sm">
            1
          </span>
          <span className="hidden sm:inline font-semibold text-slate-800 dark:text-slate-200">Kata Utama</span>
        </div>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700 mx-3" />
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white text-[10px] font-bold shadow-sm">
            2
          </span>
          <span className="hidden sm:inline font-semibold text-slate-800 dark:text-slate-200">Terjemahan</span>
        </div>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700 mx-3" />
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-bold">
            3
          </span>
          <span className="hidden sm:inline font-medium text-slate-500 dark:text-slate-400">Kata Turunan</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {/* Kata Utama Section */}
        <div className="space-y-4 rounded-xl border-0 sm:border border-slate-200 p-0 sm:p-5 dark:border-slate-700 bg-transparent sm:bg-slate-50/30 dark:bg-transparent dark:sm:bg-slate-800/20 shadow-none sm:shadow-soft">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold">
              <BookOpen size={16} />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span>Langkah 1: Kata Utama</span>
                <span className="badge badge-primary text-[10px] py-0 px-1.5 font-semibold">Wajib</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Koskata dasar yang didefinisikan (Bahasa {LANG_LABEL[sourceLang]}), beserta kelas kata dan dialeknya.
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Kata Bahasa {LANG_LABEL[sourceLang]} *
              </label>
              <input
                value={headword}
                onChange={(e) => setHeadword(e.target.value)}
                className={`input ${submitted && !headword.trim() ? 'border-rose-400 focus:border-rose-400' : ''}`}
                required
                aria-invalid={submitted && !headword.trim()}
                data-autofocus
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Kelas kata utama (opsional)</label>
                <select
                  value={partOfSpeech}
                  onChange={(e) => setPartOfSpeech(e.target.value)}
                  className="input"
                >
                  <option value="">— pilih —</option>
                  {PARTS_OF_SPEECH.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Sumber (opsional)</label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="input"
                  placeholder="Mis. KBBI, narasumber…"
                />
              </div>
            </div>
          </div>

          {sourceLang === 'mgr' && (
            <div className="space-y-1.5">
              <span className="block text-sm font-medium">Dialek Headword (opsional)</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {dialects.map((d) => {
                  const selected = rootDialectIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`group relative flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        selected
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selected}
                        onChange={() => {
                          setRootDialectIds((prev) =>
                            prev.includes(d.id) ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                          );
                        }}
                      />
                      {selected && <Check size={12} className="text-primary-600 dark:text-primary-400 shrink-0" />}
                      {d.name}
                      {d.description && (
                        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 scale-95 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[10px] font-normal leading-normal text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none dark:bg-slate-700 shadow-lg">
                          {d.description}
                          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {rootDialectIds.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Kosongkan jika universal/berlaku umum.
                </p>
              )}
            </div>
          )}
        </div>


        {/* Translations */}
        <div className="space-y-4 rounded-xl border-0 sm:border border-slate-200 p-0 sm:p-5 dark:border-slate-700 bg-transparent shadow-none sm:shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-3">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold">
                <FileText size={16} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span>Langkah 2: Terjemahan</span>
                  <span className="badge badge-primary text-[10px] py-0 px-1.5 font-semibold">Wajib</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tambahkan satu atau lebih padanan kata dalam Bahasa {LANG_LABEL[targetLang]}.
                </p>
              </div>
            </div>
            <button type="button" onClick={addTranslation} className="btn-outline text-xs py-1.5 px-3">
              <Plus size={14} className="mr-1" /> Tambah
            </button>
          </div>

          <div className="space-y-4 mt-3">
            {translations.map((t, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/20 p-3 sm:p-4 dark:border-slate-700/70 dark:bg-slate-800/10"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/30 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pilihan Terjemahan #{idx + 1}
                  </span>
                  {translations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTranslation(idx)}
                      className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Kata Bahasa {LANG_LABEL[targetLang]} *</label>
                    <input
                      value={t.lemma}
                      onChange={(e) => updateTranslation(idx, { lemma: e.target.value })}
                      className="input text-sm"
                      aria-label={`Terjemahan ${idx + 1}: kata Bahasa ${LANG_LABEL[targetLang]}`}
                      placeholder={`Kata Bahasa ${LANG_LABEL[targetLang]} *`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Kelas Kata (opsional)</label>
                    <select
                      value={t.part_of_speech}
                      onChange={(e) => updateTranslation(idx, { part_of_speech: e.target.value })}
                      className="input text-sm"
                      aria-label={`Terjemahan ${idx + 1}: kelas kata`}
                    >
                      <option value="">— kelas kata —</option>
                      {PARTS_OF_SPEECH.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {sourceLang === 'id' && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Dialek Terjemahan (opsional)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {dialects.map((d) => {
                        const selected = t.dialect_ids.includes(d.id);
                        return (
                          <label
                            key={d.id}
                            className={`group relative flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${selected
                                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/50'
                              }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={selected}
                              onChange={() => toggleDialect(idx, d.id)}
                            />
                            {selected && <Check size={12} className="text-primary-600 dark:text-primary-400 shrink-0" />}
                            {d.name}
                            {d.description && (
                              <span className="absolute bottom-full left-1/2 z-20 mb-2 w-48 -translate-x-1/2 scale-95 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[10px] font-normal leading-normal text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none dark:bg-slate-700 shadow-lg">
                                {d.description}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {t.dialect_ids.length === 0 && (
                      <p className="text-[10px] text-slate-400">
                        Kosongkan jika universal/berlaku umum.
                      </p>
                    )}
                  </div>
                )}

                {/* Example sentences for this translation */}
                <div className="rounded-xl bg-slate-100/60 p-2.5 sm:p-3.5 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-750">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Contoh Kalimat (opsional)
                    </span>
                    <button
                      type="button"
                      onClick={() => addExample(idx)}
                      className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold"
                    >
                      <Plus size={13} /> Tambah Contoh Kalimat
                    </button>
                  </div>
                  {t.examples.length > 0 && (
                    <div className="mt-2.5 space-y-4 sm:space-y-2">
                      {t.examples.map((ex, exIdx) => (
                        <div key={exIdx} className="grid gap-2 sm:grid-cols-[1fr_1fr_130px_auto] items-center border-b border-slate-200/50 dark:border-slate-700/50 pb-4 last:border-0 last:pb-0 sm:border-0 sm:pb-0">
                          <input
                            value={ex.manggarai}
                            onChange={(e) =>
                              updateExample(idx, exIdx, { manggarai: e.target.value })
                            }
                            className="input text-sm py-1.5"
                            aria-label={`Contoh ${exIdx + 1}: kalimat ${LANG_LABEL.mgr}`}
                            placeholder={`Kalimat ${LANG_LABEL.mgr}`}
                          />
                          <input
                            value={ex.indonesian}
                            onChange={(e) =>
                              updateExample(idx, exIdx, { indonesian: e.target.value })
                            }
                            className="input text-sm py-1.5"
                            aria-label={`Contoh ${exIdx + 1}: arti ${LANG_LABEL.id}`}
                            placeholder={`Arti ${LANG_LABEL.id}`}
                          />
                          <select
                            value={ex.dialect_id ?? ''}
                            onChange={(e) =>
                              updateExample(idx, exIdx, { dialect_id: e.target.value || undefined })
                            }
                            className="input text-xs py-1.5"
                            aria-label={`Contoh ${exIdx + 1}: dialek`}
                          >
                            <option value="">— Dialek Umum —</option>
                            {dialects.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeExample(idx, exIdx)}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 font-semibold"
                            aria-label={`Hapus contoh ${exIdx + 1}`}
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Usage note: collapsed to a button until the user opts in. */}
                <div className="pt-1">
                  {t.showNotes || t.notes.trim() ? (
                    <textarea
                      value={t.notes}
                      onChange={(e) => updateTranslation(idx, { notes: e.target.value })}
                      rows={2}
                      autoFocus={t.showNotes && !t.notes}
                      className="input text-sm"
                      placeholder="Catatan penggunaan untuk terjemahan ini (opsional)…"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateTranslation(idx, { showNotes: true })}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      <Plus size={13} /> Tambah catatan penggunaan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derived words */}
        <div className="space-y-4 rounded-xl border-0 sm:border border-slate-200 p-0 sm:p-5 dark:border-slate-700 shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-3">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                <Layers size={16} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span>Langkah 3: Kata Turunan</span>
                  <span className="badge text-[10px] py-0 px-1.5 font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Opsional</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tambahkan kata yang diturunkan dari kata utama beserta artinya.
                </p>
              </div>
            </div>
            <button type="button" onClick={addDerived} className="btn-outline text-xs py-1.5 px-3">
              <Plus size={14} className="mr-1" /> Tambah
            </button>
          </div>

          <div className="mt-3">
            {derived.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">Belum ada kata turunan yang ditambahkan.</p>
            ) : (
              <div className="space-y-3">
                {derived.map((d, idx) => (
                  <div key={idx} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-center bg-slate-50/50 dark:bg-slate-850 p-2 sm:p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-750">
                    <div className="w-full">
                      <input
                        value={d.word}
                        onChange={(e) => updateDerived(idx, { word: e.target.value })}
                        className="input text-sm py-1.5"
                        aria-label={`Kata turunan ${idx + 1} (${LANG_LABEL[sourceLang]})`}
                        placeholder={`Kata turunan (${LANG_LABEL[sourceLang]})`}
                      />
                    </div>
                    <div className="w-full">
                      <input
                        value={d.translation}
                        onChange={(e) => updateDerived(idx, { translation: e.target.value })}
                        className="input text-sm py-1.5"
                        aria-label={`Kata turunan ${idx + 1}: arti (${LANG_LABEL[targetLang]})`}
                        placeholder={`Arti (${LANG_LABEL[targetLang]})`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDerived(idx)}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold px-2 py-1"
                      aria-label={`Hapus kata turunan ${idx + 1}`}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={close} disabled={updateMutation.isPending} className="btn-outline">
            Batal
          </button>
          <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
            {updateMutation.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
