import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { EntrySummary } from '../types/dictionary.types';

export function EntryCard({ item }: { item: EntrySummary }) {
  return (
    <Link
      to={`/kata/${item.slug}`}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-800"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
            {item.manggarai}
          </h3>
          {item.part_of_speech && (
            <span className="shrink-0 text-xs italic text-slate-400">{item.part_of_speech}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
          {item.indonesian}
        </p>
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500 dark:text-slate-600"
      />
    </Link>
  );
}
