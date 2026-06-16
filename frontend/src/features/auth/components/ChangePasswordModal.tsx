import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/authApi';
import { extractError } from '@/lib/axios';
import { Modal } from '@/shared/components/Modal';
import { useToast } from '@/shared/components/Toast';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword({ 
      current_password: currentPassword, 
      new_password: newPassword 
    }),
    onSuccess: () => {
      toast.success('Password berhasil diubah.');
      resetForm();
      onClose();
    },
    onError: (err) => {
      setError(extractError(err));
    },
  });

  function resetForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Password saat ini wajib diisi');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok');
      return;
    }

    mutation.mutate();
  }

  function handleClose() {
    if (mutation.isPending) return;
    resetForm();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      dismissible={!mutation.isPending}
      closeOnOverlayClick={false}
      labelledBy="change-password-modal-title"
      className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
          <KeyRound size={18} />
        </span>
        <div>
          <h2 id="change-password-modal-title" className="text-lg font-bold">
            Ganti Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Perbarui password akun Anda secara aman.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Old Password */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-350">
            Password Saat Ini
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input pr-10 text-sm"
              required
              placeholder="Masukkan password saat ini"
              disabled={mutation.isPending}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showCurrent ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-350">
            Password Baru
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input pr-10 text-sm"
              required
              placeholder="Minimal 8 karakter"
              disabled={mutation.isPending}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showNew ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-350">
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input pr-10 text-sm"
              required
              placeholder="Ulangi password baru"
              disabled={mutation.isPending}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700/50 pt-3.5 mt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="btn-outline text-sm py-2 px-4"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary text-sm py-2 px-4"
          >
            {mutation.isPending ? 'Menyimpan…' : 'Simpan Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
