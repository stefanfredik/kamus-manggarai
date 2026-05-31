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
        <h1 className="text-2xl font-bold">{sub.payload.base_form}</h1>
        {sub.payload.part_of_speech && (
          <p className="text-sm italic text-slate-500">{sub.payload.part_of_speech}</p>
        )}
        <p className="mt-2 text-sm text-slate-500">
          Diajukan oleh <span className="font-medium">{sub.submitter_name}</span> • {formatRelative(sub.created_at)}
        </p>
        {sub.payload.notes && (
          <p className="mt-3 rounded bg-slate-50 p-3 text-sm dark:bg-slate-700/40">{sub.payload.notes}</p>
        )}
      </div>

      <section className="mt-4 space-y-3">
        <h2 className="text-lg font-semibold">Konten Submission</h2>
        {sub.payload.dialects.map((dl, idx) => (
          <div key={idx} className="card">
            <div className="mb-2 flex items-center justify-between">
              <span className="badge">Dialek #{idx + 1}</span>
              <span className="text-xs text-slate-500">
                {dl.is_available ? 'Tersedia' : 'Tidak tersedia'}
              </span>
            </div>
            {dl.local_spelling && (
              <p className="text-sm">Ejaan lokal: <em>{dl.local_spelling}</em></p>
            )}
            <ol className="mt-2 space-y-2">
              {dl.definitions.map((def, defIdx) => (
                <li key={defIdx} className="border-l-2 border-primary-200 pl-3 text-sm">
                  <strong>{defIdx + 1}.</strong> {def.meaning}
                  {def.context_notes && <div className="text-xs italic text-slate-500">{def.context_notes}</div>}
                  {def.sentences?.map((s, sIdx) => (
                    <div key={sIdx} className="mt-1 rounded bg-slate-50 p-2 text-xs dark:bg-slate-700/40">
                      "{s.sentence_source}" → {s.sentence_translation}
                    </div>
                  ))}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

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
