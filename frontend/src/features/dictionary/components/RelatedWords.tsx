import { Link } from 'react-router-dom';
import type { RelatedEntry } from '../types/dictionary.types';

const RELATION_LABELS: Record<RelatedEntry['relation_type'], string> = {
  sinonim: 'Sinonim',
  antonim: 'Antonim',
  turunan: 'Turunan',
  berkaitan: 'Berkaitan',
};

const RELATION_COLORS: Record<RelatedEntry['relation_type'], string> = {
  sinonim: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  antonim: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  turunan: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
  berkaitan: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
};

export function RelatedWords({ entries }: { entries: RelatedEntry[] }) {
  if (!entries || entries.length === 0) return null;

  const grouped = entries.reduce<Record<string, RelatedEntry[]>>((acc, e) => {
    (acc[e.relation_type] ??= []).push(e);
    return acc;
  }, {});

  return (
    <section className="card">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Kata Terkait
      </h2>
      <div className="space-y-3">
        {(Object.keys(grouped) as Array<RelatedEntry['relation_type']>).map((type) => (
          <div key={type}>
            <div className="mb-1.5 text-xs font-medium text-slate-500">
              {RELATION_LABELS[type]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {grouped[type].map((rel) => (
                <Link
                  key={rel.id}
                  to={`/kata/${rel.slug}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${RELATION_COLORS[type]}`}
                >
                  {rel.base_form}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
