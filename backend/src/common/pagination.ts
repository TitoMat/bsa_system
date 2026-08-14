export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MIN_LIMIT = 10;
export const MAX_LIMIT = 1000;

export function normalizePage(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PAGE;
  }

  return Math.max(DEFAULT_PAGE, Math.trunc(parsed));
}

export function normalizeLimit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  const integer = Math.trunc(parsed);

  if (integer < MIN_LIMIT) {
    return DEFAULT_LIMIT;
  }

  return Math.min(integer, MAX_LIMIT);
}

export function normalizePagination(query?: {
  page?: unknown;
  limit?: unknown;
}) {
  const page = normalizePage(query?.page);
  const limit = normalizeLimit(query?.limit);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}
