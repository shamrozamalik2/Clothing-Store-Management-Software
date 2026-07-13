import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { cn } from '@utils/cn';

export default function Pagination({ pagination, onPageChange, className }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <p className="text-xs text-surface-500">
        Showing <span className="text-surface-300 font-medium">{from}–{to}</span> of{' '}
        <span className="text-surface-300 font-medium">{total}</span> results
      </p>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!pagination.hasPrev}
          className={cn(
            'h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-colors',
            pagination.hasPrev
              ? 'text-surface-300 hover:bg-surface-700 hover:text-surface-100'
              : 'text-surface-600 cursor-not-allowed'
          )}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`dots-${i}`} className="h-8 w-8 flex items-center justify-center text-surface-600 text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-colors',
                p === page
                  ? 'bg-primary-600 text-white font-medium'
                  : 'text-surface-300 hover:bg-surface-700 hover:text-surface-100'
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!pagination.hasNext}
          className={cn(
            'h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-colors',
            pagination.hasNext
              ? 'text-surface-300 hover:bg-surface-700 hover:text-surface-100'
              : 'text-surface-600 cursor-not-allowed'
          )}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
  return [1, '…', current-1, current, current+1, '…', total];
}
