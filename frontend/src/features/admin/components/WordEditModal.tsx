import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type WordUpdatePayload } from '../api/adminApi';
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
  examples: SubmissionExampleInput[];
};

const emptyTranslation = (): TranslationDraft => ({
  lemma: '',
  part_of_speech: '',
  notes: '',
  examples: [],
});

// cleanExamples trims each pair and drops any where both sides are blank,
// returning undefined when nothing remains so the field is omitted from JSON.
function cleanExamples(
  examples: SubmissionExampleInput[],
): SubmissionExampleInput[] | undefined {
  const cleaned = examples
    .map((ex) => ({ manggarai: ex.manggarai.trim(), indonesian: ex.indonesian.trim() }))
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
  const [translations, setTranslations] = useState<TranslationDraft[]>([emptyTranslation()]);
  const [derived, setDerived] = useState<SubmissionDerivedInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever a different entry is opened.
  useEffect(() => {
    if (!open) return;
    setHeadword(entry.lemma);
    setPartOfSpeech(entry.part_of_speech ?? '');
    setSource(entry.translations.find((t) => t.source)?.source ?? '');
    setTranslations(
      entry.translations.length > 0
        ? entry.translations.map((t) => ({
            lemma: t.lemma,
            part_of_speech: t.part_of_speech ?? '',
            notes: t.notes ?? '',
            examples: (t.examples ?? []).map((ex) => ({
              manggarai: ex.manggarai,
              indonesian: ex.indonesian,
            })),
          }))
        : [emptyTranslation()],
    );
    setDerived(
      entry.derived_words.map((d) => ({ word: d.word, translation: d.translation })),
    );
    setError(null);
  }, [open, entry]);

  const updateMutation = useMutation({
    mutationFn: (payload: WordUpdatePayload) => adminApi.updateWord(entry.id, payload),
    onSuccess: () => {
      toast.success('Kosakata berhasil diperbarui.');
      qc.invalidateQueries({ queryKey: ['entry', entry.slug] });
      qc.invalidateQueries({ queryKey: ['admin', 'words'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
      onClose();
    },
    onError: (err) => setError(extractError(err)),
  });

  function close() {
    if (updateMutation.isPending) return;
    onClose();
  }

  // ---- translations ----
  function addTranslation() {
    setTranslations((prev) => [...prev, emptyTranslation()]);
  }
  function updateTranslation(idx: number, patch: Partial<TranslationDraft>) {
    setTranslations((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }
  function removeTranslation(idx: number) {
    setTranslations((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  // ---- examples (nested under a translation) ----
  function addExample(tIdx: number) {
    setTranslations((prev) =>
      prev.map((t, i) =>
        i === tIdx ? { ...t, examples: [...t.examples, { manggarai: '', indonesian: '' }] } : t,
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

    if (!headword.trim()) {
      setError(`Kata Bahasa ${LANG_LABEL[sourceLang]} wajib diisi`);
      return;
    }

    const cleanedTranslations: SubmissionTranslationInput[] = translations
      .map((t) => ({
        lemma: t.lemma.trim(),
        part_of_speech: t.part_of_speech || undefined,
        notes: t.notes.trim() || undefined,
        examples: cleanExamples(t.examples),
      }))
      .filter((t) => t.lemma !== '');

    if (cleanedTranslations.length === 0) {
      setError(`Minimal satu terjemahan Bahasa ${LANG_LABEL[targetLang]} wajib diisi`);
      return;
    }

    const cleanedDerived = derived
      .map((d) => ({ word: d.word.trim(), translation: d.translation.trim() }))
      .filter((d) => d.word !== '');
    if (cleanedDerived.some((d) => d.translation === '')) {
      setError('Setiap kata turunan harus memiliki terjemahan');
      return;
    }

    updateMutation.mutate({
      headword: headword.trim(),
      part_of_speech: partOfSpeech || undefined,
      source: source || undefined,
      translations: cleanedTranslations,
      derived: cleanedDerived.length > 0 ? cleanedDerived : undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!updateMutation.isPending}
      labelledBy="edit-word-title"
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-pop dark:bg-slate-800"
    >
      <h2 id="edit-word-title" className="text-xl font-bold">
        Edit Kosakata
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Mengubah kata utama Bahasa {LANG_LABEL[sourceLang]} beserta terjemahan dan kata turunannya.
        Arah bahasa tidak dapat diubah.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Kata Bahasa {LANG_LABEL[sourceLang]} *
            </label>
            <input
              value={headword}
              onChange={(e) => setHeadword(e.target.value)}
              className="input"
              required
            />
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

        <div>
          <label className="mb-1 block text-sm font-medium">Kelas kata kata utama (opsional)</label>
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

        {/* Translations */}
        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Terjemahan (Bahasa {LANG_LABEL[targetLang]}) *</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tambahkan satu atau lebih padanan Bahasa {LANG_LABEL[targetLang]}.
              </p>
            </div>
            <button type="button" onClick={addTranslation} className="btn-outline text-xs">
              <Plus size={14} /> Tambah
            </button>
          </div>

          <div className="space-y-3">
            {translations.map((t, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Terjemahan {idx + 1}
                  </span>
                  {translations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTranslation(idx)}
                      className="flex items-center gap-1 text-xs text-rose-600 hover:underline"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={t.lemma}
                    onChange={(e) => updateTranslation(idx, { lemma: e.target.value })}
                    className="input text-sm"
                    placeholder={`Kata Bahasa ${LANG_LABEL[targetLang]} *`}
                  />
                  <select
                    value={t.part_of_speech}
                    onChange={(e) => updateTranslation(idx, { part_of_speech: e.target.value })}
                    className="input text-sm"
                  >
                    <option value="">— kelas kata —</option>
                    {PARTS_OF_SPEECH.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={t.notes}
                  onChange={(e) => updateTranslation(idx, { notes: e.target.value })}
                  rows={2}
                  className="input text-sm"
                  placeholder="Catatan penggunaan untuk terjemahan ini (opsional)…"
                />

                {/* Example sentences for this translation */}
                <div className="rounded-md bg-slate-50 p-2.5 dark:bg-slate-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Contoh kalimat (opsional)
                    </span>
                    <button
                      type="button"
                      onClick={() => addExample(idx)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <Plus size={13} /> Tambah contoh
                    </button>
                  </div>
                  {t.examples.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {t.examples.map((ex, exIdx) => (
                        <div key={exIdx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <input
                            value={ex.manggarai}
                            onChange={(e) =>
                              updateExample(idx, exIdx, { manggarai: e.target.value })
                            }
                            className="input text-sm"
                            placeholder={`Kalimat ${LANG_LABEL.mgr}`}
                          />
                          <input
                            value={ex.indonesian}
                            onChange={(e) =>
                              updateExample(idx, exIdx, { indonesian: e.target.value })
                            }
                            className="input text-sm"
                            placeholder={`Arti ${LANG_LABEL.id}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeExample(idx, exIdx)}
                            className="text-sm text-rose-600 hover:underline"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Derived words */}
        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Kata Turunan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kata yang diturunkan dari kata utama beserta artinya (opsional).
              </p>
            </div>
            <button type="button" onClick={addDerived} className="btn-outline text-xs">
              <Plus size={14} /> Tambah
            </button>
          </div>

          {derived.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada kata turunan.</p>
          ) : (
            <div className="space-y-2">
              {derived.map((d, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={d.word}
                    onChange={(e) => updateDerived(idx, { word: e.target.value })}
                    className="input text-sm"
                    placeholder={`Kata turunan (${LANG_LABEL[sourceLang]})`}
                  />
                  <input
                    value={d.translation}
                    onChange={(e) => updateDerived(idx, { translation: e.target.value })}
                    className="input text-sm"
                    placeholder={`Arti (${LANG_LABEL[targetLang]})`}
                  />
                  <button
                    type="button"
                    onClick={() => removeDerived(idx)}
                    className="text-sm text-rose-600 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
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
