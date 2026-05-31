import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { SearchDirection } from '../types/dictionary.types';

interface HeroSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  direction: SearchDirection;
  onDirectionChange?: (d: SearchDirection) => void;
  isLoading?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** Show the MGR↔ID direction toggle. Defaults to true. */
  showDirectionToggle?: boolean;
}

export function HeroSearch({
  query,
  onQueryChange,
  direction,
  onDirectionChange,
  isLoading,
  autoFocus = true,
  placeholder,
  showDirectionToggle = true,
}: HeroSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus only on devices with a fine pointer (mouse) to avoid popping up
  // the on-screen keyboard on touch devices.
  useEffect(() => {
    if (!autoFocus) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: fine)').matches) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div className="w-full">
      <div className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-soft transition-shadow focus-within:border-primary-300 focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-primary-900/40">
        <Search className="ml-1 shrink-0 text-slate-400" size={20} />

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          type="search"
          enterKeyHint="search"
          placeholder={
            placeholder ??
            (direction === 'manggarai_to_indonesia'
              ? 'Cari kata Manggarai…'
              : 'Cari kata Indonesia…')
          }
          className="flex-1 bg-transparent py-2 text-base outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
        />

        {isLoading && (
          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        )}
        {query && !isLoading && (
          <button
            onClick={() => onQueryChange('')}
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Hapus pencarian"
          >
            <X size={16} />
          </button>
        )}

        {showDirectionToggle && onDirectionChange && (
          <div className="shrink-0 border-l border-slate-200 pl-2 dark:border-slate-700">
            <DirectionToggle value={direction} onChange={onDirectionChange} />
          </div>
        )}
      </div>
    </div>
  );
}

function DirectionToggle({
  value,
  onChange,
}: {
  value: SearchDirection;
  onChange: (d: SearchDirection) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
      <button
        onClick={() => onChange('manggarai_to_indonesia')}
        className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
          value === 'manggarai_to_indonesia'
            ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-200'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
        }`}
        title="Manggarai ke Indonesia"
      >
        MGR→ID
      </button>
      <button
        onClick={() => onChange('indonesia_to_manggarai')}
        className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
          value === 'indonesia_to_manggarai'
            ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-200'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
        }`}
        title="Indonesia ke Manggarai"
      >
        ID→MGR
      </button>
    </div>
  );
}
