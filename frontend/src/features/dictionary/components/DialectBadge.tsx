interface DialectBadgeProps {
  name: string;
  className?: string;
}

export function DialectBadge({ name, className = '' }: DialectBadgeProps) {
  const color = colorForDialect(name);
  return <span className={`badge ${color} ${className}`}>{name}</span>;
}

function colorForDialect(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const palette = [
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
    'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
    'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  ];
  return palette[hash % palette.length];
}
