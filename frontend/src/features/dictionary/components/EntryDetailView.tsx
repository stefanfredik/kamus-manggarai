import type { EntryDetail } from '../types/dictionary.types';
import { ReportButton } from './ReportButton';

export function EntryDetailView({ entry }: { entry: EntryDetail }) {
  return (
    <div className="space-y-6">
      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-300">
              {entry.manggarai}
            </h1>
            <p className="mt-1 text-lg text-slate-800 dark:text-slate-100">{entry.indonesian}</p>
            {entry.part_of_speech && (
              <span className="mt-1 inline-block text-sm italic text-slate-500">
                {entry.part_of_speech}
              </span>
            )}
          </div>
          <ReportButton slug={entry.slug} />
        </div>

        {entry.notes && (
          <p className="mt-3 border-l-2 border-primary-200 pl-3 text-sm text-slate-600 dark:border-primary-700 dark:text-slate-300">
            {entry.notes}
          </p>
        )}
        {entry.source && (
          <p className="mt-2 text-xs text-slate-400">Sumber: {entry.source}</p>
        )}
      </header>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Terjemahan</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Bahasa Manggarai
            </dt>
            <dd className="mt-1 text-base font-semibold text-primary-700 dark:text-primary-300">
              {entry.manggarai}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Bahasa Indonesia
            </dt>
            <dd className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-100">
              {entry.indonesian}
            </dd>
          </div>
        </dl>
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
        <p className="text-xs text-slate-400">Kontributor: {entry.created_by_name}</p>
      )}
    </div>
  );
}
