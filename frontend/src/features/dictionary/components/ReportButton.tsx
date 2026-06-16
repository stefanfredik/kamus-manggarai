import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flag, Info, Send } from 'lucide-react';
import { dictionaryApi } from '../api/dictionaryApi';
import type { ReportPayload } from '../types/dictionary.types';
import { extractError } from '@/lib/axios';
import { Modal } from '@/shared/components/Modal';

const REASONS: Array<{ value: ReportPayload['reason']; label: string; hint: string }> = [
  { value: 'arti_tidak_tepat', label: 'Arti tidak tepat', hint: 'Terjemahan kurang pas, ambigu, atau perlu konteks.' },
  { value: 'ejaan_salah', label: 'Ejaan salah', hint: 'Ada typo, tanda baca, atau penulisan aksen yang keliru.' },
  { value: 'contoh_salah', label: 'Contoh kalimat salah', hint: 'Contoh tidak sesuai arti atau bahasanya bermasalah.' },
  { value: 'konten_tidak_pantas', label: 'Konten tidak pantas', hint: 'Ada konten sensitif, kasar, atau tidak layak tampil.' },
  { value: 'lainnya', label: 'Lainnya', hint: 'Masalah lain yang perlu dicek admin.' },
];

const MIN_DESCRIPTION = 8;

export function ReportButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportPayload['reason']>('arti_tidak_tepat');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedReason = useMemo(() => REASONS.find((r) => r.value === reason), [reason]);
  const descriptionLength = description.trim().length;
  const descriptionRequired = reason === 'lainnya' || reason === 'konten_tidak_pantas';
  const canSubmit = !submitting && (!descriptionRequired || descriptionLength >= MIN_DESCRIPTION);

  function close() {
    if (submitting) return;
    setOpen(false);
    setDone(false);
    setDescription('');
    setReason('arti_tidak_tepat');
    setError(null);
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await dictionaryApi.reportEntry(slug, { reason, description: description.trim() || undefined });
      setDone(true);
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
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckCircle2 size={26} />
            </div>
            <h2 id="report-modal-title" className="text-lg font-semibold">
              Laporan terkirim
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Admin akan meninjau laporan ini. Jika laporan valid, data kosakata akan diperbaiki.
            </p>
            <button onClick={close} className="btn-primary mt-5">
              Selesai
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 id="report-modal-title" className="text-lg font-semibold">
                  Laporkan kosakata
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Pilih masalah paling tepat supaya admin bisa memproses laporan lebih cepat.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <span className="block text-sm font-medium">Jenis masalah</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                        reason === r.value
                          ? 'border-primary-300 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-100'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        name="report-reason"
                        className="sr-only"
                      />
                      <span className="block font-medium">{r.label}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{r.hint}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="report-description" className="block text-sm font-medium">
                    Detail laporan {descriptionRequired ? '(wajib)' : '(opsional)'}
                  </label>
                  <span className="text-xs text-slate-400">{descriptionLength} karakter</span>
                </div>
                <textarea
                  id="report-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="input mt-2"
                  placeholder="Contoh: terjemahan ini seharusnya ... karena ..."
                />
                <p className="mt-2 flex gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  {selectedReason?.hint} Sertakan koreksi jika kamu mengetahuinya.
                </p>
                {descriptionRequired && descriptionLength > 0 && descriptionLength < MIN_DESCRIPTION && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    Detail minimal {MIN_DESCRIPTION} karakter untuk jenis laporan ini.
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={close} disabled={submitting} className="btn-outline">
                Batal
              </button>
              <button onClick={submit} disabled={!canSubmit} className="btn-primary">
                {submitting ? 'Mengirim...' : <><Send size={16} /> Kirim laporan</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
