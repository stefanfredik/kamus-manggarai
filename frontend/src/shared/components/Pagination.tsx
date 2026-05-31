import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Halaman <span className="font-medium text-slate-600 dark:text-slate-300">{page}</span> dari{' '}
        {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          className="btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={15} /> Sebelumnya
        </button>
        <button
          className="btn-outline btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Selanjutnya <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
