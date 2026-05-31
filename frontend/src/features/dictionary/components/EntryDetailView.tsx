import type { EntryDetail } from '../types/dictionary.types';
import { DialectBadge } from './DialectBadge';
import { RelatedWords } from './RelatedWords';
import { ReportButton } from './ReportButton';

export function EntryDetailView({ entry }: { entry: EntryDetail }) {
  const availableDialects = entry.dialects.filter((d) => d.is_available);
  const unavailableDialects = entry.dialects.filter((d) => !d.is_available);

  return (
    <div className="space-y-6">
      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {entry.base_form}
            </h1>
            {entry.part_of_speech && (
              <span className="mt-1 inline-block text-sm italic text-slate-500">
                {entry.part_of_speech}
              </span>
            )}
            {entry.notes && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.notes}</p>
            )}
          </div>
          <ReportButton slug={entry.slug} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {availableDialects.map((d) => (
            <DialectBadge key={d.id} name={d.dialect_name ?? '—'} />
          ))}
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Arti per Dialek</h2>
        {availableDialects.length === 0 ? (
          <div className="card text-sm text-slate-500">
            Belum ada arti yang tersedia untuk kata ini.
          </div>
        ) : (
          availableDialects.map((dl) => (
            <article key={dl.id} className="card">
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <DialectBadge name={dl.dialect_name ?? '—'} />
                {dl.local_spelling && dl.local_spelling !== entry.base_form && (
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Ejaan lokal: <em>{dl.local_spelling}</em>
                  </span>
                )}
              </div>

              {dl.definitions && dl.definitions.length > 0 ? (
                <ol className="space-y-3">
                  {dl.definitions.map((def, idx) => (
                    <li key={def.id} className="border-l-2 border-primary-200 pl-4 dark:border-primary-700">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-slate-400">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="text-base text-slate-900 dark:text-slate-100">{def.meaning}</p>
                          {def.context_notes && (
                            <p className="mt-1 text-xs italic text-slate-500">{def.context_notes}</p>
                          )}
                          {def.sentences && def.sentences.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {def.sentences.map((s) => (
                                <div key={s.id} className="rounded bg-slate-50 p-2 text-sm dark:bg-slate-700/40">
                                  <div className="text-slate-800 dark:text-slate-100">"{s.sentence_source}"</div>
                                  <div className="mt-0.5 text-slate-500">→ {s.sentence_translation}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-500">Belum ada definisi untuk dialek ini.</p>
              )}
            </article>
          ))
        )}
      </section>

      {unavailableDialects.length > 0 && (
        <section className="card border-dashed bg-slate-50/60 dark:bg-slate-800/40">
          <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Tidak tersedia di dialek berikut
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {unavailableDialects.map((d) => (
              <span
                key={d.id}
                className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs text-slate-600 line-through dark:bg-slate-700 dark:text-slate-400"
              >
                {d.dialect_name ?? '—'}
              </span>
            ))}
          </div>
        </section>
      )}

      <RelatedWords entries={entry.related_entries} />
    </div>
  );
}
