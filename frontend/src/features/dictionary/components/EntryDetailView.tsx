import type { EntryDetail } from '../types/dictionary.types';
import { ReportButton } from './ReportButton';

export function EntryDetailView({ entry }: { entry: EntryDetail }) {
  const primary = entry.senses[0];

  return (
    <div className="space-y-6">
      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-300">
              {entry.manggarai}
            </h1>
            {primary && (
              <p className="mt-1 text-lg text-slate-800 dark:text-slate-100">{primary.indonesian}</p>
            )}
          </div>
          <ReportButton slug={entry.slug} />
        </div>

        {entry.source && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sumber: {entry.source}</p>
        )}
      </header>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">
          {entry.senses.length > 1 ? 'Arti & Terjemahan' : 'Terjemahan'}
        </h2>
        <ol className="space-y-3">
          {entry.senses.map((sense, idx) => (
            <li
              key={sense.id}
              className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40"
            >
              <div className="flex items-baseline gap-2">
                {entry.senses.length > 1 && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                    {idx + 1}
                  </span>
                )}
                <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {sense.indonesian}
                </span>
                {sense.part_of_speech && (
                  <span className="text-xs italic text-slate-500 dark:text-slate-400">
                    {sense.part_of_speech}
                  </span>
                )}
              </div>
              {sense.notes && (
                <p className="mt-1.5 border-l-2 border-primary-200 pl-3 text-sm text-slate-600 dark:border-primary-700 dark:text-slate-300">
                  {sense.notes}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {entry.derived_words && entry.derived_words.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Kata Turunan</h2>
          <ul className="space-y-2">
            {entry.derived_words.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-baseline gap-2 border-l-2 border-primary-200 pl-3 dark:border-primary-700"
              >
                <span className="font-medium text-primary-700 dark:text-primary-300">{d.word}</span>
                <span className="text-slate-400">—</span>
                <span className="text-sm text-slate-700 dark:text-slate-200">{d.translation}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {entry.created_by_name && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Kontributor: {entry.created_by_name}</p>
      )}
    </div>
  );
}
