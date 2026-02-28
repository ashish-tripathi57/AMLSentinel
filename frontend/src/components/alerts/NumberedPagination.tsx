import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NumberedPaginationProps {
  offset: number;
  limit: number;
  total: number;
  onPageChange: (newOffset: number) => void;
  onLimitChange: (newLimit: number) => void;
}

const LIMIT_OPTIONS = [10, 15, 20, 50];

/**
 * Builds a list of page numbers to display, inserting ellipsis markers for large ranges.
 * Always shows the first page, last page, and a window around the current page.
 */
function buildPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

  /* Always include page 1 */
  pages.push(1);

  /* Left ellipsis if current page is far from start */
  if (currentPage > 3) {
    pages.push('ellipsis-start');
  }

  /* Window around current page */
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(totalPages - 1, currentPage + 1);
  for (let i = windowStart; i <= windowEnd; i++) {
    pages.push(i);
  }

  /* Right ellipsis if current page is far from end */
  if (currentPage < totalPages - 2) {
    pages.push('ellipsis-end');
  }

  /* Always include last page */
  pages.push(totalPages);

  return pages;
}

/**
 * Verilix-style pagination: "Items per page" dropdown on LEFT,
 * numbered page buttons with Previous/Next on RIGHT.
 */
export function NumberedPagination({
  offset,
  limit,
  total,
  onPageChange,
  onLimitChange,
}: NumberedPaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const showStart = offset + 1;
  const showEnd = Math.min(offset + limit, total);

  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  function handleLimitChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onLimitChange(Number(e.target.value));
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-card-border text-xs text-text-secondary">
      {/* LEFT: Items per page + summary */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span>Items per page</span>
          <select
            value={limit}
            onChange={handleLimitChange}
            aria-label="Items per page"
            className="h-7 px-2 text-xs border border-card-border rounded bg-card-bg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <span className="text-text-muted">
          <span className="font-mono font-medium text-text-primary">{showStart}</span>
          {'\u2013'}
          <span className="font-mono font-medium text-text-primary">{showEnd}</span>
          {' '}of{' '}
          <span className="font-mono font-medium text-text-primary">{total}</span>
        </span>
      </div>

      {/* RIGHT: Page buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(offset - limit)}
          disabled={!canPrev}
          aria-label="Previous page"
          className="h-7 px-2 text-xs rounded border border-card-border hover:bg-card-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>

        {pageNumbers.map((page) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <span key={page} className="px-1.5 py-1 text-text-muted select-none">
                {'\u2026'}
              </span>
            );
          }

          const isCurrentPage = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange((page - 1) * limit)}
              aria-label={`Page ${page}`}
              aria-current={isCurrentPage ? 'page' : undefined}
              className={`
                min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-colors
                ${isCurrentPage
                  ? 'bg-primary text-white'
                  : 'hover:bg-card-border text-text-secondary border border-card-border'
                }
              `}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(offset + limit)}
          disabled={!canNext}
          aria-label="Next page"
          className="h-7 px-2 text-xs rounded border border-card-border hover:bg-card-border disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
