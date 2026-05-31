import { ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Prevent closing via overlay click / Escape (e.g. while submitting). */
  dismissible?: boolean;
  labelledBy?: string;
  className?: string;
}

/**
 * Accessible modal dialog: closes on Escape and overlay click, locks body
 * scroll while open, and moves focus into the dialog.
 */
export function Modal({
  open,
  onClose,
  children,
  dismissible = true,
  labelledBy,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus into the dialog and lock body scroll only when the open state
  // changes — not on every render — so typing doesn't keep stealing focus.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const toFocus = dialogRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    toFocus?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Escape-to-close handler is kept separate so it can track the latest
  // onClose/dismissible without re-running the focus effect above.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissible) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => dismissible && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={
          className ??
          'w-full max-w-md rounded-2xl bg-white p-6 shadow-pop dark:bg-slate-800'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
