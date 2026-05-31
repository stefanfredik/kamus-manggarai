import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/reviewApi';
import { extractError } from '@/lib/axios';
import { formatRelative } from '@/shared/utils/formatters';

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ['review', id],
    queryFn: () => reviewApi.getDetail(id!),
    enabled: Boolean(id),
  });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: () => reviewApi.approve(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review', 'queue'] });
      alert('Submission disetujui dan dipublikasikan.');
      navigate('/validator');
    },
    onError: (err) => setError(extractError(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => reviewApi.reject(id!, rejectNotes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review', 'queue'] });
      alert('Submission ditolak.');
      navigate('/validator');
    },
    onError: (err) => setError(extractError(err)),
  });

  if (detail.isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-slate-500">Memuat…</div>;
  }
  if (!detail.data) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-slate-500">Submission tidak ditemukan.</div>;
  }

  const sub = detail.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/validator" className="mb-4 inline-block text-sm text-slate-500 hover:text-primary-600">
        ← Antrian review
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold text-primary-700 dark:text-primary-300">
          {sub.payload.manggarai}
        </h1>
        <p className="mt-1 text-lg text-slate-800 dark:text-slate-100">{sub.payload.indonesian}</p>
        {sub.payload.part_of_speech && (
          <p className="text-sm italic text-slate-500">{sub.payload.part_of_speech}</p>
        )}
        <p className="mt-2 text-sm text-slate-500">
          Diajukan oleh <span className="font-medium">{sub.submitter_name}</span> • {formatRelative(sub.created_at)}
        </p>
        {sub.payload.notes && (
          <p className="mt-3 rounded bg-slate-50 p-3 text-sm dark:bg-slate-700/40">{sub.payload.notes}</p>
        )}
        {sub.payload.source && (
          <p className="mt-2 text-xs text-slate-400">Sumber: {sub.payload.source}</p>
        )}
      </div>

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

      {error && (
        <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={approveMutation.isPending || rejectMutation.isPending}
          className="btn-outline border-rose-300 text-rose-600 hover:bg-rose-50"
        >
          Tolak
        </button>
        <button
          onClick={() => {
            if (confirm('Setujui dan publikasikan submission ini?')) approveMutation.mutate();
          }}
          disabled={approveMutation.isPending || rejectMutation.isPending}
          className="btn-primary"
        >
          {approveMutation.isPending ? 'Memproses…' : 'Approve & Publish'}
        </button>
      </div>

      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !rejectMutation.isPending && setShowRejectModal(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Tolak submission</h2>
            <p className="mt-1 text-sm text-slate-500">Berikan alasan penolakan agar kontributor dapat memperbaiki.</p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              className="input mt-3"
              placeholder="Catatan penolakan (wajib)…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowRejectModal(false)} className="btn-outline">Batal</button>
              <button
                onClick={() => rejectMutation.mutate()}
                disabled={!rejectNotes.trim() || rejectMutation.isPending}
                className="btn-primary bg-rose-600 hover:bg-rose-700"
              >
                {rejectMutation.isPending ? 'Mengirim…' : 'Kirim Penolakan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
