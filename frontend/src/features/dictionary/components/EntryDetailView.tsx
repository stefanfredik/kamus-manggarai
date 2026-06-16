import { Link } from 'react-router-dom';
import { PenLine, Trash2, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dialectApi } from '@/features/admin/api/dialectApi';
import type { EntryDetail } from '../types/dictionary.types';
import { ReportButton } from './ReportButton';

const LANG_LABEL: Record<string, string> = {
  id: 'Bahasa Indonesia',
  mgr: 'Bahasa Manggarai',
};

interface EntryDetailViewProps {
  entry: EntryDetail;
  // When provided (admin only), render inline edit/delete controls in the header.
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EntryDetailView({ entry, onEdit, onDelete }: EntryDetailViewProps) {
  const counterpartLang = entry.language === 'id' ? 'mgr' : 'id';

  const { data: dialects = [] } = useQuery({
    queryKey: ['dialects'],
    queryFn: dialectApi.list,
  });

  return (
    <div className="space-y-6">
      <header className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-300">
              {entry.lemma}
              {entry.homonym_number != null && (
                <sup className="ml-1 text-base font-semibold text-slate-400 dark:text-slate-500">
                  {entry.homonym_number}
                </sup>
              )}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {LANG_LABEL[entry.language] ?? entry.language}
              </span>
              {entry.part_of_speech && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium italic text-slate-500 dark:bg-slate-850 dark:text-slate-400">
                  Kelas Kata: {entry.part_of_speech}
                </span>
              )}
              {entry.dialects && entry.dialects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.dialects.map((d) => (
                    <span
                      key={d.id}
                      className="group relative cursor-help inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/30 shadow-sm"
                    >
                      <MapPin size={12} className="shrink-0" />
                      Dialek: {d.name}
                      {d.description && (
                        <span className="absolute bottom-full left-1/2 z-20 mb-1.5 w-48 -translate-x-1/2 scale-95 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[10px] font-normal leading-normal text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none dark:bg-slate-800 shadow-lg">
                          {d.description}
                          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg"
              >
                <PenLine size={13} />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg dark:border-rose-900/30 dark:text-rose-400 dark:bg-rose-950/20 dark:hover:bg-rose-950/40"
              >
                <Trash2 size={13} />
                Hapus
              </button>
            )}
            <ReportButton slug={entry.slug} />
          </div>
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
                <div className="flex flex-wrap items-baseline gap-2">
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
                  {t.dialects && t.dialects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {t.dialects.map((d) => (
                        <span
                          key={d.id}
                          className="group relative cursor-help rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-200"
                        >
                          {d.name}
                          {d.description && (
                            <span className="absolute bottom-full left-1/2 z-20 mb-1.5 w-48 -translate-x-1/2 scale-95 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[10px] font-normal leading-normal text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none dark:bg-slate-800 shadow-lg">
                              {d.description}
                              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {t.notes && (
                  <p className="mt-1.5 border-l-2 border-primary-200 pl-3 text-sm text-slate-600 dark:border-primary-700 dark:text-slate-300">
                    {t.notes}
                  </p>
                )}
                 {t.examples && t.examples.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {t.examples.map((ex) => (
                      <li
                        key={ex.id}
                        className="rounded-md bg-white/60 px-3 py-1.5 text-sm dark:bg-slate-800/40"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const exampleDialect = dialects.find((d) => d.id === ex.dialect_id);
                            if (!exampleDialect) return null;
                            return (
                              <span className="group relative cursor-help inline-flex items-center gap-0.5 rounded bg-primary-50 px-1.5 py-0.5 text-[9px] font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                <MapPin size={10} className="shrink-0" />
                                {exampleDialect.name}
                                {exampleDialect.description && (
                                  <span className="absolute bottom-full left-1/2 z-20 mb-1.5 w-48 -translate-x-1/2 scale-95 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[10px] font-normal leading-normal text-white opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100 pointer-events-none dark:bg-slate-800 shadow-lg">
                                    {exampleDialect.description}
                                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                          <span className="italic text-slate-700 dark:text-slate-200">
                            {ex.manggarai}
                          </span>
                          <span className="text-slate-400">—</span>
                          <span className="text-slate-600 dark:text-slate-300">{ex.indonesian}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
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
