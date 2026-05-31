import type { SearchDirection } from '../types/dictionary.types';
import type { Dialect } from '../types/dictionary.types';
import { useState } from 'react';

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  direction: SearchDirection;
  onDirectionChange: (d: SearchDirection) => void;
  dialects: Dialect[];
  selectedDialectIds: string[];
  onSelectedDialectsChange: (ids: string[]) => void;
  isLoading?: boolean;
}

export function SearchBar({
  query,
  onQueryChange,
  direction,
  onDirectionChange,
  dialects,
  selectedDialectIds,
  onSelectedDialectsChange,
  isLoading,
}: SearchBarProps) {
  const [showFilter, setShowFilter] = useState(false);

  function toggleDialect(id: string) {
    if (selectedDialectIds.includes(id)) {
      onSelectedDialectsChange(selectedDialectIds.filter((x) => x !== id));
    } else {
      onSelectedDialectsChange([...selectedDialectIds, id]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-1 items-center gap-2 px-2">
          <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            type="search"
            autoFocus
            placeholder={
              direction === 'manggarai_to_indonesia'
                ? 'Cari kata Manggarai…'
                : 'Cari kata Indonesia…'
            }
            className="w-full bg-transparent py-2 text-base outline-none placeholder:text-slate-400"
          />
          {isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          )}
          {query && !isLoading && (
            <button
              onClick={() => onQueryChange('')}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Hapus"
            >
              ✕
            </button>
          )}
        </div>

        <div className="hidden items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-700 sm:flex">
          <DirectionToggle value={direction} onChange={onDirectionChange} />
        </div>

        <button
          className="btn-ghost relative"
          onClick={() => setShowFilter((v) => !v)}
          aria-label="Filter dialek"
        >
          ⚙️
          {selectedDialectIds.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-medium text-white">
              {selectedDialectIds.length}
            </span>
          )}
        </button>
      </div>

      <div className="sm:hidden">
        <DirectionToggle value={direction} onChange={onDirectionChange} />
      </div>

      {showFilter && (
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Filter dialek</h3>
            {selectedDialectIds.length > 0 && (
              <button
                className="text-xs text-primary-600 hover:underline"
                onClick={() => onSelectedDialectsChange([])}
              >
                Reset filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {dialects.map((d) => {
              const active = selectedDialectIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDialect(d.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
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
    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-slate-700">
      <button
        onClick={() => onChange('manggarai_to_indonesia')}
        className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
          value === 'manggarai_to_indonesia'
            ? 'bg-primary-600 text-white'
            : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        MGR → ID
      </button>
      <button
        onClick={() => onChange('indonesia_to_manggarai')}
        className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
          value === 'indonesia_to_manggarai'
            ? 'bg-primary-600 text-white'
            : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        ID → MGR
      </button>
    </div>
  );
}
