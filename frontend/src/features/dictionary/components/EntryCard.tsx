import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { EntrySummary } from '../types/dictionary.types';

const LANG_LABEL: Record<string, string> = {
  id: 'Indonesia',
  mgr: 'Manggarai',
};

export function EntryCard({ item }: { item: EntrySummary }) {
  const translations =
    item.translations && item.translations.length > 0 ? item.translations.join('; ') : '';

  return (
    <Link
      to={`/kata/${item.slug}`}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-800"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
            {item.lemma}
          </h3>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {LANG_LABEL[item.language] ?? item.language}
          </span>
          {item.part_of_speech && (
            <span className="shrink-0 text-xs italic text-slate-500 dark:text-slate-400">
              {item.part_of_speech}
            </span>
          )}
        </div>
        {translations && (
          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{translations}</p>
        )}
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-500 dark:text-slate-600"
      />
    </Link>
  );
}
