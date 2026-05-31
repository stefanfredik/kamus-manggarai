import { useState } from 'react';
import { Flag } from 'lucide-react';
import { dictionaryApi } from '../api/dictionaryApi';
import type { ReportPayload } from '../types/dictionary.types';
import { extractError } from '@/lib/axios';
import { Modal } from '@/shared/components/Modal';

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

  function close() {
    setOpen(false);
    setDone(false);
    setDescription('');
    setReason('arti_tidak_tepat');
    setError(null);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await dictionaryApi.reportEntry(slug, { reason, description: description || undefined });
      setDone(true);
      setTimeout(close, 1500);
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

      <Modal
        open={open}
        onClose={close}
        dismissible={!submitting}
        labelledBy="report-modal-title"
      >
        {done ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              ✓
            </div>
            <p className="font-medium">Laporan terkirim</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Terima kasih atas masukannya.
            </p>
          </div>
        ) : (
          <>
            <h2 id="report-modal-title" className="text-lg font-semibold">
              Laporkan kosakata
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Bantu kami menjaga kualitas kamus.
            </p>

            <div className="mt-4 space-y-3">
              <span className="block text-sm font-medium">Alasan</span>
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

              <label htmlFor="report-description" className="block text-sm font-medium">
                Deskripsi (opsional)
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="input"
                placeholder="Ceritakan detail masalahnya…"
              />

              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={close} disabled={submitting} className="btn-outline">
                Batal
              </button>
              <button onClick={submit} disabled={submitting} className="btn-primary">
                {submitting ? 'Mengirim…' : 'Kirim laporan'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
