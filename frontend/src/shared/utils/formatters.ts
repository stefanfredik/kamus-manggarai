export function formatDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelative(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '-';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} hari lalu`;
  return formatDate(date);
}

/** Join a submission payload's translations into a readable string. */
export function formatTranslations(
  translations: Array<{ lemma: string }> | undefined,
): string {
  if (!translations || translations.length === 0) return '';
  return translations.map((t) => t.lemma).filter(Boolean).join('; ');
}
