import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  contributionApi,
  type SubmissionPayload,
  type SubmissionDerivedInput,
} from '../api/contributionApi';
import { extractError } from '@/lib/axios';

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

export function SubmitPage() {
  const navigate = useNavigate();

  const [indonesian, setIndonesian] = useState('');
  const [manggarai, setManggarai] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('');
  const [derived, setDerived] = useState<SubmissionDerivedInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: (payload: SubmissionPayload) => contributionApi.submit(payload),
    onSuccess: (sub) => {
      const msg =
        sub.status === 'approved'
          ? 'Kata berhasil dipublikasikan.'
          : 'Submission masuk antrian review. Anda akan diberi notifikasi setelah diproses.';
      alert(msg);
      navigate('/dashboard/submissions');
    },
    onError: (err) => setError(extractError(err)),
  });

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
    if (!indonesian.trim()) {
      setError('Kata Bahasa Indonesia wajib diisi');
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
      indonesian: indonesian.trim(),
      manggarai: manggarai.trim(),
      part_of_speech: partOfSpeech || undefined,
      notes: notes || undefined,
      source: source || undefined,
      derived: cleanedDerived.length > 0 ? cleanedDerived : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Submit Kosakata Baru</h1>
      <p className="mb-6 text-sm text-slate-500">
        Tambahkan padanan kata Bahasa Manggarai dan Bahasa Indonesia. Kata turunan bersifat opsional.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-3">
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
              <label className="mb-1 block text-sm font-medium">Kata Bahasa Indonesia *</label>
              <input
                value={indonesian}
                onChange={(e) => setIndonesian(e.target.value)}
                className="input"
                required
                placeholder="Contoh: makan"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Kelas kata</label>
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

          <div>
            <label className="mb-1 block text-sm font-medium">Catatan penggunaan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input"
              placeholder="Konteks atau catatan penggunaan…"
            />
          </div>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Kata Turunan</h2>
              <p className="text-xs text-slate-500">
                Kata yang diturunkan dari kata utama beserta artinya (opsional).
              </p>
            </div>
            <button type="button" onClick={addDerived} className="btn-outline text-xs">
              + Tambah
            </button>
          </div>

          {derived.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada kata turunan.</p>
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
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">
            Batal
          </button>
          <button type="submit" disabled={submitMutation.isPending} className="btn-primary">
            {submitMutation.isPending ? 'Mengirim…' : 'Kirim Submission'}
          </button>
        </div>
      </form>
    </div>
  );
}
