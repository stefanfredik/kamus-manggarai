import { Link } from 'react-router-dom';
import type { SearchHit, EntrySummary } from '../types/dictionary.types';
import { DialectBadge } from './DialectBadge';

type CardItem = SearchHit | EntrySummary;

function isHit(item: CardItem): item is SearchHit {
  return 'meanings' in item;
}

export function EntryCard({ item }: { item: CardItem }) {
  const meanings = isHit(item) ? item.meanings : [item.brief_meaning].filter(Boolean);
  return (
    <Link
      to={`/kata/${item.slug}`}
      className="card block transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
            {item.base_form}
          </h3>
          {item.part_of_speech && (
            <span className="mt-0.5 inline-block text-xs italic text-slate-500">
              {item.part_of_speech}
            </span>
          )}
          {meanings.length > 0 && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
              {meanings.slice(0, 2).join(' • ')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.dialects.slice(0, 4).map((d) => (
          <DialectBadge key={d} name={d} />
        ))}
        {item.dialects.length > 4 && (
          <span className="text-xs text-slate-500">+{item.dialects.length - 4}</span>
        )}
      </div>
    </Link>
  );
}
