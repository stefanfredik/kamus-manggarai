import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { contributionApi, type SubmissionPayload, type SubmissionDialectInput } from '../api/contributionApi';
import { useDialects } from '@/features/dictionary/hooks/useSearch';
import { extractError } from '@/lib/axios';

const PARTS_OF_SPEECH = ['nomina', 'verba', 'adjektiva', 'adverbia', 'pronomina', 'numeralia', 'partikel', 'interjeksi'];

function blankDialect(dialectId: string): SubmissionDialectInput {
  return {
    dialect_id: dialectId,
    is_available: true,
    definitions: [{ meaning: '' }],
  };
}

export function SubmitPage() {
  const navigate = useNavigate();
  const dialectsQuery = useDialects();

  const [baseForm, setBaseForm] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [defaultMeaning, setDefaultMeaning] = useState('');
  const [dialects, setDialects] = useState<SubmissionDialectInput[]>([]);
  const [overriddenDialects, setOverriddenDialects] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Pre-select semua dialek aktif setelah dialek dimuat
  useEffect(() => {
    if (!initialized && dialectsQuery.data && dialectsQuery.data.length > 0) {
      setDialects(dialectsQuery.data.map((d) => blankDialect(d.id)));
      setInitialized(true);
    }
  }, [dialectsQuery.data, initialized]);

  // Sync default meaning ke setiap dialek yang belum di-override
  useEffect(() => {
    setDialects((prev) =>
      prev.map((dl) => {
        if (overriddenDialects.has(dl.dialect_id)) return dl;
        const newDefs = [...dl.definitions];
        if (newDefs.length === 0) {
          newDefs.push({ meaning: defaultMeaning });
        } else {
          newDefs[0] = { ...newDefs[0], meaning: defaultMeaning };
        }
        return { ...dl, definitions: newDefs };
      }),
    );
  }, [defaultMeaning, overriddenDialects]);

  const submitMutation = useMutation({
    mutationFn: (payload: SubmissionPayload) => contributionApi.submit(payload),
    onSuccess: (sub) => {
      const msg = sub.status === 'approved'
        ? 'Kata berhasil dipublikasikan.'
        : 'Submission masuk antrian review. Anda akan diberi notifikasi setelah diproses.';
      alert(msg);
      navigate('/dashboard/submissions');
    },
    onError: (err) => setError(extractError(err)),
  });

  function toggleDialectAvailable(dialectId: string) {
    setDialects((prev) =>
      prev.map((d) =>
        d.dialect_id === dialectId ? { ...d, is_available: !d.is_available } : d,
      ),
    );
  }

  function updateDialect(idx: number, patch: Partial<SubmissionDialectInput>) {
    setDialects((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function updateDefinition(
    dialectIdx: number,
    defIdx: number,
    patch: Partial<SubmissionDialectInput['definitions'][number]>,
    markOverride = true,
  ) {
    setDialects((prev) =>
      prev.map((d, i) => {
        if (i !== dialectIdx) return d;
        const newDefs = d.definitions.map((def, j) => (j === defIdx ? { ...def, ...patch } : def));
        return { ...d, definitions: newDefs };
      }),
    );
    if (markOverride && defIdx === 0 && 'meaning' in patch) {
      setOverriddenDialects((prev) => {
        const next = new Set(prev);
        next.add(dialects[dialectIdx].dialect_id);
        return next;
      });
    }
  }

  function resetDialectToDefault(dialectId: string) {
    setOverriddenDialects((prev) => {
      const next = new Set(prev);
      next.delete(dialectId);
      return next;
    });
    setDialects((prev) =>
      prev.map((d) => {
        if (d.dialect_id !== dialectId) return d;
        const newDefs = [...d.definitions];
        if (newDefs.length === 0) newDefs.push({ meaning: defaultMeaning });
        else newDefs[0] = { ...newDefs[0], meaning: defaultMeaning };
        return { ...d, definitions: newDefs };
      }),
    );
  }

  function addDefinition(dialectIdx: number) {
    const dl = dialects[dialectIdx];
    updateDialect(dialectIdx, {
      definitions: [...dl.definitions, { meaning: '' }],
    });
    setOverriddenDialects((prev) => new Set(prev).add(dl.dialect_id));
  }

  function removeDefinition(dialectIdx: number, defIdx: number) {
    const dl = dialects[dialectIdx];
    if (dl.definitions.length <= 1) return;
    updateDialect(dialectIdx, {
      definitions: dl.definitions.filter((_, i) => i !== defIdx),
    });
  }

  function addSentence(dialectIdx: number, defIdx: number) {
    const def = dialects[dialectIdx].definitions[defIdx];
    const newSentences = [...(def.sentences ?? []), { sentence_source: '', sentence_translation: '' }];
    updateDefinition(dialectIdx, defIdx, { sentences: newSentences }, false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!baseForm.trim()) {
      setError('Kata wajib diisi');
      return;
    }
    const availableDialects = dialects.filter((d) => d.is_available);
    if (availableDialects.length === 0) {
      setError('Pilih minimal satu dialek dimana kata ini tersedia');
      return;
    }
    const missingMeaning = availableDialects.some((d) =>
      d.definitions.some((def) => !def.meaning.trim()),
    );
    if (missingMeaning) {
      setError('Setiap dialek yang tersedia harus memiliki arti');
      return;
    }

    submitMutation.mutate({
      base_form: baseForm.trim(),
      part_of_speech: partOfSpeech || undefined,
      notes: notes || undefined,
      dialects,
    });
  }

  const availableCount = dialects.filter((d) => d.is_available).length;
  const totalDialects = dialectsQuery.data?.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Submit Kosakata Baru</h1>
      <p className="mb-6 text-sm text-slate-500">
        Secara default kata akan didaftarkan di semua dialek dengan arti yang sama. Anda dapat
        menyesuaikan arti per dialek atau menandai dialek tertentu jika kata ini tidak digunakan di sana.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Kata Manggarai (ejaan utama) *</label>
            <input
              value={baseForm}
              onChange={(e) => setBaseForm(e.target.value)}
              className="input"
              required
              placeholder="Contoh: elong"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Arti dalam Bahasa Indonesia *</label>
            <input
              value={defaultMeaning}
              onChange={(e) => setDefaultMeaning(e.target.value)}
              className="input"
              placeholder='Contoh: "makan" atau "orang, manusia"'
            />
            <div className="mt-1 space-y-0.5 text-xs text-slate-500">
              <p>Arti ini akan otomatis terisi di semua dialek.</p>
              <p>
                <strong>Sinonim</strong> (mis. "orang, manusia") tulis di kolom yang sama, pisahkan
                dengan koma. Untuk <strong>makna yang berbeda</strong> (polysemy, mis. "weki" =
                badan / diri), gunakan tombol <em>"+ Tambah arti lain"</em> di kartu dialek.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Kelas kata</label>
              <select value={partOfSpeech} onChange={(e) => setPartOfSpeech(e.target.value)} className="input">
                <option value="">— pilih —</option>
                {PARTS_OF_SPEECH.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Catatan tambahan</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                placeholder="Opsional…"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="mb-3">
            <h2 className="font-semibold">Dialek</h2>
            <p className="text-xs text-slate-500">
              {availableCount} dari {totalDialects} dialek dipilih. Klik untuk menandai dialek yang
              tidak menggunakan kata ini.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dialects.map((dl) => {
              const info = dialectsQuery.data?.find((d) => d.id === dl.dialect_id);
              return (
                <button
                  type="button"
                  key={dl.dialect_id}
                  onClick={() => toggleDialectAvailable(dl.dialect_id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    dl.is_available
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                      : 'border-slate-300 text-slate-400 line-through hover:bg-slate-50 dark:border-slate-700'
                  }`}
                  title={dl.is_available ? 'Klik untuk tandai tidak tersedia' : 'Klik untuk tandai tersedia'}
                >
                  {info?.name ?? 'Dialek'}
                </button>
              );
            })}
          </div>
        </div>

        {dialects.map((dl, idx) => {
          const info = dialectsQuery.data?.find((d) => d.id === dl.dialect_id);
          const isOverridden = overriddenDialects.has(dl.dialect_id);
          if (!dl.is_available) return null;
          return (
            <div key={dl.dialect_id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{info?.name ?? 'Dialek'}</h3>
                  {isOverridden && (
                    <span className="badge bg-amber-100 text-amber-700">Disesuaikan</span>
                  )}
                </div>
                {isOverridden && (
                  <button
                    type="button"
                    onClick={() => resetDialectToDefault(dl.dialect_id)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Pakai arti default
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Ejaan lokal (jika berbeda)</label>
                <input
                  value={dl.local_spelling ?? ''}
                  onChange={(e) => updateDialect(idx, { local_spelling: e.target.value || undefined })}
                  className="input text-sm"
                  placeholder={`Kosongkan jika sama dengan "${baseForm || '...'}"`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Arti
                    {dl.definitions.length > 1 && (
                      <span className="ml-2 normal-case font-normal text-slate-400">
                        ({dl.definitions.length} makna terpisah)
                      </span>
                    )}
                  </div>
                </div>
                {dl.definitions.map((def, defIdx) => (
                  <div key={defIdx} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                        {defIdx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Arti ke-{defIdx + 1}
                      </span>
                      {dl.definitions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDefinition(idx, defIdx)}
                          className="ml-auto text-xs text-rose-600 hover:underline"
                          title="Hapus arti ini"
                        >
                          Hapus arti
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        value={def.meaning}
                        onChange={(e) => updateDefinition(idx, defIdx, { meaning: e.target.value })}
                        className="input"
                        placeholder='Contoh: "makan" atau "orang, manusia"'
                      />
                      <input
                        value={def.context_notes ?? ''}
                        onChange={(e) => updateDefinition(idx, defIdx, { context_notes: e.target.value || undefined }, false)}
                        className="input text-sm"
                        placeholder="Catatan konteks (opsional, mis. 'untuk benda mati')"
                      />
                      {def.sentences?.map((s, sIdx) => (
                        <div key={sIdx} className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={s.sentence_source}
                            onChange={(e) => {
                              const newSentences = (def.sentences ?? []).map((ss, i) =>
                                i === sIdx ? { ...ss, sentence_source: e.target.value } : ss,
                              );
                              updateDefinition(idx, defIdx, { sentences: newSentences }, false);
                            }}
                            className="input text-sm"
                            placeholder="Kalimat Manggarai"
                          />
                          <input
                            value={s.sentence_translation}
                            onChange={(e) => {
                              const newSentences = (def.sentences ?? []).map((ss, i) =>
                                i === sIdx ? { ...ss, sentence_translation: e.target.value } : ss,
                              );
                              updateDefinition(idx, defIdx, { sentences: newSentences }, false);
                            }}
                            className="input text-sm"
                            placeholder="Terjemahan Indonesia"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSentence(idx, defIdx)}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        + Tambah contoh kalimat
                      </button>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => addDefinition(idx)}
                    className="text-sm font-medium text-primary-600 hover:underline"
                  >
                    + Tambah arti lain di dialek ini
                  </button>
                  <p className="mt-1 text-xs text-slate-500">
                    Gunakan ini hanya jika kata punya <strong>makna berbeda</strong>, mis.{' '}
                    <em>"weki"</em>: 1. badan, 2. diri. Untuk sinonim cukup pisahkan dengan koma di
                    kolom arti di atas.
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="card bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <strong>Ringkasan:</strong> kata <em>"{baseForm || '...'}"</em> akan didaftarkan di{' '}
            <strong>{availableCount} dialek</strong>
            {availableCount !== totalDialects && totalDialects > 0 && ` (dari ${totalDialects} total)`}
            {overriddenDialects.size > 0 && `, dengan ${overriddenDialects.size} dialek yang artinya disesuaikan`}.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">
            Batal
          </button>
          <button type="submit" disabled={submitMutation.isPending} className="btn-primary">
            {submitMutation.isPending ? 'Mengirim…' : 'Kirim Submission'}
          </button>
        </div>
      </form>
    </div>
  );
}
