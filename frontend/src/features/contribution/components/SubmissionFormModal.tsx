import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contributionApi,
  type Language,
  type SubmissionPayload,
  type SubmissionDerivedInput,
  type SubmissionTranslationInput,
} from '../api/contributionApi';
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

type TranslationDraft = { lemma: string; part_of_speech: string; notes: string };

const emptyTranslation = (): TranslationDraft => ({ lemma: '', part_of_speech: '', notes: '' });

interface SubmissionFormModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubmissionFormModal({ open, onClose }: SubmissionFormModalProps) {
  const toast = useToast();
  const qc = useQueryClient();

  const [sourceLang, setSourceLang] = useState<Language>('mgr');
  const [headword, setHeadword] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [source, setSource] = useState('');
  const [translations, setTranslations] = useState<TranslationDraft[]>([emptyTranslation()]);
  const [derived, setDerived] = useState<SubmissionDerivedInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  const targetLang: Language = sourceLang === 'mgr' ? 'id' : 'mgr';

  function reset() {
    setSourceLang('mgr');
    setHeadword('');
    setPartOfSpeech('');
    setSource('');
    setTranslations([emptyTranslation()]);
    setDerived([]);
    setError(null);
  }

  const submitMutation = useMutation({
    mutationFn: (payload: SubmissionPayload) => contributionApi.submit(payload),
    onSuccess: (sub) => {
      const msg =
        sub.status === 'approved'
          ? 'Kata berhasil dipublikasikan.'
          : 'Submission masuk antrian review. Anda akan diberi notifikasi setelah diproses.';
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['submissions', 'mine'] });
      reset();
      onClose();
    },
    onError: (err) => setError(extractError(err)),
  });

  function close() {
    if (submitMutation.isPending) return;
    reset();
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

    submitMutation.mutate({
      source_lang: sourceLang,
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
      dismissible={!submitMutation.isPending}
      labelledBy="submit-modal-title"
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-pop dark:bg-slate-800"
    >
      <h2 id="submit-modal-title" className="text-xl font-bold">
        Submit Kosakata Baru
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pilih arah, isi kata utama, lalu tambahkan satu atau lebih terjemahan. Kata turunan
        bersifat opsional.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Direction selector */}
        <div>
          <span className="mb-1 block text-sm font-medium">Arah</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-sm dark:bg-slate-700/40">
            <button
              type="button"
              onClick={() => setSourceLang('mgr')}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                sourceLang === 'mgr'
                  ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-200'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Manggarai → Indonesia
            </button>
            <button
              type="button"
              onClick={() => setSourceLang('id')}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                sourceLang === 'id'
                  ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-200'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Indonesia → Manggarai
            </button>
          </div>
        </div>

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
              placeholder={sourceLang === 'mgr' ? 'Contoh: hang' : 'Contoh: makan'}
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
          <button type="button" onClick={close} disabled={submitMutation.isPending} className="btn-outline">
            Batal
          </button>
          <button type="submit" disabled={submitMutation.isPending} className="btn-primary">
            {submitMutation.isPending ? 'Mengirim…' : 'Kirim Submission'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
