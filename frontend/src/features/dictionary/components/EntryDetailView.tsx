import { Link } from 'react-router-dom';
import type { EntryDetail } from '../types/dictionary.types';
import { ReportButton } from './ReportButton';

const LANG_LABEL: Record<string, string> = {
  id: 'Bahasa Indonesia',
  mgr: 'Bahasa Manggarai',
};

export function EntryDetailView({ entry }: { entry: EntryDetail }) {
  const counterpartLang = entry.language === 'id' ? 'mgr' : 'id';

  return (
    <div className="space-y-6">
      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                {entry.lemma}
              </h1>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {LANG_LABEL[entry.language] ?? entry.language}
              </span>
            </div>
            {entry.part_of_speech && (
              <span className="mt-1 inline-block text-sm italic text-slate-500 dark:text-slate-400">
                {entry.part_of_speech}
              </span>
            )}
          </div>
          <ReportButton slug={entry.slug} />
        </div>
      </header>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">
          Terjemahan ({LANG_LABEL[counterpartLang] ?? counterpartLang})
        </h2>
        {entry.translations.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada terjemahan.</p>
        ) : (
          <ol className="space-y-3">
            {entry.translations.map((t, idx) => (
              <li key={t.translation_id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
                <div className="flex items-baseline gap-2">
                  {entry.translations.length > 1 && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                      {idx + 1}
                    </span>
                  )}
                  <Link
                    to={`/kata/${t.slug}`}
                    className="text-base font-semibold text-primary-700 hover:underline dark:text-primary-300"
                  >
                    {t.lemma}
                  </Link>
                  {t.part_of_speech && (
                    <span className="text-xs italic text-slate-500 dark:text-slate-400">
                      {t.part_of_speech}
                    </span>
                  )}
                </div>
                {t.notes && (
                  <p className="mt-1.5 border-l-2 border-primary-200 pl-3 text-sm text-slate-600 dark:border-primary-700 dark:text-slate-300">
                    {t.notes}
                  </p>
                )}
                {t.source && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sumber: {t.source}</p>
                )}
              </li>
            ))}
          </ol>
        )}
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
