import { Search, X } from 'lucide-react';
import type { SearchDirection } from '../types/dictionary.types';

interface HeroSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  direction: SearchDirection;
  onDirectionChange: (d: SearchDirection) => void;
  isLoading?: boolean;
  centered?: boolean;
}

const SUGGESTIONS = ['hang', 'wae', 'mbaru', 'tabe', 'ngo'];

export function HeroSearch({
  query,
  onQueryChange,
  direction,
  onDirectionChange,
  isLoading,
  centered,
}: HeroSearchProps) {
  return (
    <div className="w-full">
      <div className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-soft transition-shadow focus-within:border-primary-300 focus-within:shadow-md focus-within:ring-4 focus-within:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-primary-900/40">
        <Search className="ml-1 shrink-0 text-slate-400" size={20} />

        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          type="search"
          autoFocus
          enterKeyHint="search"
          placeholder={
            direction === 'manggarai_to_indonesia'
              ? 'Cari kata Manggarai…'
              : 'Cari kata Indonesia…'
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

        <div className="shrink-0 border-l border-slate-200 pl-2 dark:border-slate-700">
          <DirectionToggle value={direction} onChange={onDirectionChange} />
        </div>
      </div>

      {centered && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-400">Coba:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onQueryChange(s)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-primary-900/20"
            >
              {s}
            </button>
          ))}
        </div>
      )}
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
