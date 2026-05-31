import { useState } from 'react';
import { Flag } from 'lucide-react';
import { dictionaryApi } from '../api/dictionaryApi';
import type { ReportPayload } from '../types/dictionary.types';
import { extractError } from '@/lib/axios';

const REASONS: Array<{ value: ReportPayload['reason']; label: string }> = [
  { value: 'ejaan_salah', label: 'Ejaan salah' },
  { value: 'arti_tidak_tepat', label: 'Arti tidak tepat' },
  { value: 'contoh_salah', label: 'Contoh kalimat salah' },
  { value: 'konten_tidak_pantas', label: 'Konten tidak pantas' },
  { value: 'lainnya', label: 'Lainnya' },
];

export function ReportButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportPayload['reason']>('arti_tidak_tepat');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await dictionaryApi.reportEntry(slug, { reason, description: description || undefined });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setDescription('');
        setReason('arti_tidak_tepat');
      }, 1500);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-outline btn-sm">
        <Flag size={14} /> Laporkan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  ✓
                </div>
                <p className="font-medium">Laporan terkirim</p>
                <p className="mt-1 text-sm text-slate-500">Terima kasih atas masukannya.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Laporkan kosakata</h2>
                <p className="mt-1 text-sm text-slate-500">Bantu kami menjaga kualitas kamus.</p>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium">Alasan</label>
                  <div className="space-y-1.5">
                    {REASONS.map((r) => (
                      <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={reason === r.value}
                          onChange={() => setReason(r.value)}
                          name="report-reason"
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>

                  <label className="block text-sm font-medium">Deskripsi (opsional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="input"
                    placeholder="Ceritakan detail masalahnya…"
                  />

                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => setOpen(false)} disabled={submitting} className="btn-outline">
                    Batal
                  </button>
                  <button onClick={submit} disabled={submitting} className="btn-primary">
                    {submitting ? 'Mengirim…' : 'Kirim laporan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
