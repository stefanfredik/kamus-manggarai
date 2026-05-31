import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/reviewApi';
import { extractError } from '@/lib/axios';
import { formatRelative } from '@/shared/utils/formatters';
import { Modal } from '@/shared/components/Modal';
import { useToast } from '@/shared/components/Toast';

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const detail = useQuery({
    queryKey: ['review', id],
    queryFn: () => reviewApi.getDetail(id!),
    enabled: Boolean(id),
  });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const approveMutation = useMutation({
    mutationFn: () => reviewApi.approve(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review', 'queue'] });
      toast.success('Submission disetujui dan dipublikasikan.');
      navigate('/validator');
    },
    onError: (err) => toast.error(extractError(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => reviewApi.reject(id!, rejectNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review', 'queue'] });
      toast.success('Submission ditolak.');
      navigate('/validator');
    },
    onError: (err) => toast.error(extractError(err)),
  });

  if (detail.isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-slate-500">Memuat…</div>;
  }
  if (!detail.data) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-slate-500">Submission tidak ditemukan.</div>;
  }

  const sub = detail.data;
  const busy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/validator" className="mb-4 inline-block text-sm text-slate-500 hover:text-primary-600">
        ← Antrian review
      </Link>

      <div className="card">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-primary-700 dark:text-primary-300">
            {sub.payload.headword}
          </h1>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {sub.payload.source_lang === 'id' ? 'Indonesia' : 'Manggarai'}
          </span>
          {sub.payload.part_of_speech && (
            <span className="text-sm italic text-slate-500 dark:text-slate-400">
              {sub.payload.part_of_speech}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Diajukan oleh <span className="font-medium">{sub.submitter_name}</span> • {formatRelative(sub.created_at)}
        </p>
        {sub.payload.source && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sumber: {sub.payload.source}</p>
        )}
      </div>

      <section className="mt-4">
        <h2 className="mb-2 text-lg font-semibold">
          Terjemahan ({sub.payload.source_lang === 'id' ? 'Manggarai' : 'Indonesia'})
        </h2>
        <div className="card">
          <ol className="space-y-3">
            {sub.payload.translations?.map((t, idx) => (
              <li key={idx} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
                <div className="flex items-baseline gap-2">
                  {sub.payload.translations.length > 1 && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                      {idx + 1}
                    </span>
                  )}
                  <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {t.lemma}
                  </span>
                  {t.part_of_speech && (
                    <span className="text-xs italic text-slate-500 dark:text-slate-400">
                      {t.part_of_speech}
                    </span>
                  )}
                </div>
                {t.notes && (
                  <p className="mt-1.5 border-l-2 border-primary-200 pl-3 text-sm text-slate-600 dark:border-primary-700 dark:text-slate-300">
                    {t.notes}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {sub.payload.derived && sub.payload.derived.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-lg font-semibold">Kata Turunan</h2>
          <div className="card">
            <ul className="space-y-2">
              {sub.payload.derived.map((d, idx) => (
                <li key={idx} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="font-medium text-primary-700 dark:text-primary-300">{d.word}</span>
                  <span className="text-slate-400">—</span>
                  <span className="text-slate-700 dark:text-slate-200">{d.translation}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={busy}
          className="btn-outline border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
        >
          Tolak
        </button>
        <button
          onClick={() => setShowApproveModal(true)}
          disabled={busy}
          className="btn-primary"
        >
          {approveMutation.isPending ? 'Memproses…' : 'Approve & Publish'}
        </button>
      </div>

      <Modal
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        dismissible={!approveMutation.isPending}
        labelledBy="approve-modal-title"
      >
        <h2 id="approve-modal-title" className="text-lg font-semibold">
          Setujui submission
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Submission ini akan disetujui dan langsung dipublikasikan ke kamus.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setShowApproveModal(false)}
            disabled={approveMutation.isPending}
            className="btn-outline"
          >
            Batal
          </button>
          <button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="btn-primary"
          >
            {approveMutation.isPending ? 'Memproses…' : 'Approve & Publish'}
          </button>
        </div>
      </Modal>

      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        dismissible={!rejectMutation.isPending}
        labelledBy="reject-modal-title"
      >
        <h2 id="reject-modal-title" className="text-lg font-semibold">
          Tolak submission
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Berikan alasan penolakan agar kontributor dapat memperbaiki.
        </p>
        <textarea
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
          rows={3}
          className="input mt-3"
          placeholder="Catatan penolakan (wajib)…"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setShowRejectModal(false)}
            disabled={rejectMutation.isPending}
            className="btn-outline"
          >
            Batal
          </button>
          <button
            onClick={() => rejectMutation.mutate()}
            disabled={!rejectNotes.trim() || rejectMutation.isPending}
            className="btn-danger"
          >
            {rejectMutation.isPending ? 'Mengirim…' : 'Kirim Penolakan'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
