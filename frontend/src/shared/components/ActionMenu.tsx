import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  // 'danger' renders the item in red for destructive actions.
  variant?: 'default' | 'danger';
  icon?: ReactNode;
}

/**
 * ActionMenu is a hamburger/kebab dropdown of row actions. It closes on outside
 * click, Escape, or after an item is chosen. Items are passed as data so callers
 * stay declarative.
 */
export function ActionMenu({ items, label = 'Aksi' }: { items: ActionMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
      >
        <Menu size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop dark:border-slate-700 dark:bg-slate-800"
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                item.variant === 'danger'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
