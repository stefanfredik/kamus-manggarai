import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEntryDetail } from '../hooks/useEntryDetail';
import { EntryDetailView } from '../components/EntryDetailView';
import type { EntryDetail } from '../types/dictionary.types';
import { extractError } from '@/lib/axios';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { adminApi } from '@/features/admin/api/adminApi';
import { WordEditModal } from '@/features/admin/components/WordEditModal';
import { Modal } from '@/shared/components/Modal';
import { useToast } from '@/shared/components/Toast';

export function EntryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const query = useEntryDetail(slug);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  function goBack() {
    // Prefer going back to wherever the user came from (search or browse);
    // fall back to the home page if there's no history to return to.
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 text-sm">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-primary-600"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
      </nav>

      {query.isLoading ? (
        <div className="space-y-4">
          <div className="card animate-pulse">
            <div className="h-8 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="card animate-pulse">
            <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ) : query.error ? (
        <div className="card text-center">
          <p className="text-slate-700 dark:text-slate-200">{extractError(query.error)}</p>
          <Link to="/" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
            Kembali ke beranda
          </Link>
        </div>
      ) : query.data ? (
        isAdmin ? (
          <AdminEntryDetail entry={query.data} />
        ) : (
          <EntryDetailView entry={query.data} />
        )
      ) : null}
    </div>
  );
}

// AdminEntryDetail wraps the read-only view with edit/delete controls. It takes a
// non-null entry so the mutation callbacks below keep a stable, typed reference.
function AdminEntryDetail({ entry }: { entry: EntryDetail }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteWord(entry.id),
    onSuccess: () => {
      toast.success('Kosakata dihapus.');
      qc.invalidateQueries({ queryKey: ['entries'] });
      setShowDelete(false);
      navigate('/');
    },
    onError: (err) => toast.error(extractError(err)),
  });

  return (
    <>
      <EntryDetailView
        entry={entry}
        onEdit={() => setShowEdit(true)}
        onDelete={() => setShowDelete(true)}
      />
      <WordEditModal open={showEdit} onClose={() => setShowEdit(false)} entry={entry} />
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        dismissible={!deleteMutation.isPending}
        labelledBy="delete-entry-title"
      >
        <h2 id="delete-entry-title" className="text-lg font-semibold">
          Hapus kosakata
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Yakin ingin menghapus <span className="font-semibold">{entry.lemma}</span>? Tautan
          terjemahan dan kata turunannya akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setShowDelete(false)}
            disabled={deleteMutation.isPending}
            className="btn-outline"
          >
            Batal
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="btn-danger"
          >
            {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      </Modal>
    </>
  );
}
