import { PAGE_SIZE_OPTIONS } from '../../lib/pagination';

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
  loading?: boolean;
  label?: string;
};

const btnClass =
  'h-10 rounded-[8px] border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  loading = false,
  label = 'records',
}: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  function summary() {
    if (total === 0) return `No ${label} found`;
    if (start === end) return `Showing ${start} of ${total} ${label}`;
    return `Showing ${start} to ${end} of ${total} ${label}`;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 pb-4 mt-4">
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{summary()}</p>

      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        {onLimitChange && (
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Page size
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={loading}
              className="h-10 rounded-[8px] border px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: 'var(--color-border-default)',
                background: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className={btnClass}
          style={{
            borderColor: 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Previous
        </button>

        <span
          className="min-w-[100px] text-center text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Page {page} of {Math.max(totalPages, 1)}
        </span>

        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className={btnClass}
          style={{
            borderColor: 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
