import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contributionApi,
  type SubmissionPayload,
  type SubmissionDerivedInput,
  type SubmissionSenseInput,
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

type SenseDraft = { indonesian: string; part_of_speech: string; notes: string };

const emptySense = (): SenseDraft => ({ indonesian: '', part_of_speech: '', notes: '' });

interface SubmissionFormModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubmissionFormModal({ open, onClose }: SubmissionFormModalProps) {
  const toast = useToast();
  const qc = useQueryClient();

  const [manggarai, setManggarai] = useState('');
  const [source, setSource] = useState('');
  const [senses, setSenses] = useState<SenseDraft[]>([emptySense()]);
  const [derived, setDerived] = useState<SubmissionDerivedInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setManggarai('');
    setSource('');
    setSenses([emptySense()]);
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

  // ---- senses ----
  function addSense() {
    setSenses((prev) => [...prev, emptySense()]);
  }
  function updateSense(idx: number, patch: Partial<SenseDraft>) {
    setSenses((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function removeSense(idx: number) {
    setSenses((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
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

    if (!manggarai.trim()) {
      setError('Kata Bahasa Manggarai wajib diisi');
      return;
    }

    const cleanedSenses: SubmissionSenseInput[] = senses
      .map((s) => ({
        indonesian: s.indonesian.trim(),
        part_of_speech: s.part_of_speech || undefined,
        notes: s.notes.trim() || undefined,
      }))
      .filter((s) => s.indonesian !== '');

    if (cleanedSenses.length === 0) {
      setError('Minimal satu terjemahan Bahasa Indonesia wajib diisi');
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
      manggarai: manggarai.trim(),
      senses: cleanedSenses,
      source: source || undefined,
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
        Satu kata Manggarai bisa memiliki beberapa arti. Tambahkan terjemahan sebanyak yang
        diperlukan. Kata turunan bersifat opsional.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Kata Bahasa Manggarai *</label>
            <input
              value={manggarai}
              onChange={(e) => setManggarai(e.target.value)}
              className="input"
              required
              placeholder="Contoh: hang"
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

        {/* Senses (arti / terjemahan) */}
        <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Arti / Terjemahan *</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tambahkan satu atau lebih padanan Bahasa Indonesia.
              </p>
            </div>
            <button type="button" onClick={addSense} className="btn-outline text-xs">
              <Plus size={14} /> Tambah arti
            </button>
          </div>

          <div className="space-y-3">
            {senses.map((s, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Arti {idx + 1}
                  </span>
                  {senses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSense(idx)}
                      className="flex items-center gap-1 text-xs text-rose-600 hover:underline"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={s.indonesian}
                    onChange={(e) => updateSense(idx, { indonesian: e.target.value })}
                    className="input text-sm"
                    placeholder="Terjemahan Indonesia *"
                  />
                  <select
                    value={s.part_of_speech}
                    onChange={(e) => updateSense(idx, { part_of_speech: e.target.value })}
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
                  value={s.notes}
                  onChange={(e) => updateSense(idx, { notes: e.target.value })}
                  rows={2}
                  className="input text-sm"
                  placeholder="Catatan penggunaan untuk arti ini (opsional)…"
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
                    placeholder="Kata turunan (Manggarai)"
                  />
                  <input
                    value={d.translation}
                    onChange={(e) => updateDerived(idx, { translation: e.target.value })}
                    className="input text-sm"
                    placeholder="Arti (Indonesia)"
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
