import type { BoardRequest, BoardSummary } from '../api/transportation.api';

export const ACTIVE_BUCKETS = ['EN_ROUTE', 'ON_TRIP', 'RETURNING'];

export const FILTER_TABS = [
  { key: 'ALL', label: 'All', color: 'var(--color-text-secondary)' },
  { key: 'UNASSIGNED', label: 'Needs Assignment', color: 'var(--color-danger)' },
  { key: 'ASSIGNED', label: 'Assigned', color: 'var(--color-brand)' },
  { key: 'ACTIVE', label: 'Active', color: 'var(--color-info)' },
  { key: 'ISSUES', label: 'Issues', color: 'var(--color-warning)' },
  { key: 'COMPLETED', label: 'Completed', color: 'var(--color-success)' },
] as const;

export type FilterTabKey = (typeof FILTER_TABS)[number]['key'];

/** Server summary → pill count. Authoritative counts must come from backend. */
export function getSummaryCount(
  summary: BoardSummary | undefined,
  tab: FilterTabKey,
): number | undefined {
  if (!summary) return undefined;
  switch (tab) {
    case 'ALL': return summary.total;
    case 'UNASSIGNED': return summary.unassigned;
    case 'ASSIGNED': return summary.assigned;
    case 'ACTIVE': return summary.active;
    case 'ISSUES': return summary.issues;
    case 'COMPLETED': return summary.completed;
  }
}

const BUCKET_PRIORITY: Record<string, number> = {
  ISSUES: 0,
  UNASSIGNED: 1,
  EN_ROUTE: 2,
  ON_TRIP: 3,
  RETURNING: 4,
  ASSIGNED: 5,
  COMPLETED: 6,
};

function matchesSearch(r: BoardRequest, searchLower: string): boolean {
  if (!searchLower) return true;
  return (
    r.requestNumber.toLowerCase().includes(searchLower) ||
    (r.purpose ?? '').toLowerCase().includes(searchLower) ||
    r.title.toLowerCase().includes(searchLower) ||
    r.pickup.address.toLowerCase().includes(searchLower) ||
    r.destination.address.toLowerCase().includes(searchLower) ||
    (r.assignment?.driver?.name ?? '').toLowerCase().includes(searchLower) ||
    (r.assignment?.vehicle?.plateNumber ?? '').toLowerCase().includes(searchLower)
  );
}

function matchesTab(r: BoardRequest, tab: FilterTabKey): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'ACTIVE') return ACTIVE_BUCKETS.includes(r.operationalBucket);
  return r.operationalBucket === tab;
}

/** Filter + sort the board queue. Pure and testable. */
export function filterBoardRequests(
  requests: BoardRequest[],
  tab: FilterTabKey,
  search: string,
): BoardRequest[] {
  const searchLower = search.trim().toLowerCase();
  const filtered = requests.filter((r) => matchesSearch(r, searchLower) && matchesTab(r, tab));

  filtered.sort((a, b) => {
    const pa = BUCKET_PRIORITY[a.operationalBucket] ?? 9;
    const pb = BUCKET_PRIORITY[b.operationalBucket] ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(a.scheduledPickupAt).getTime() - new Date(b.scheduledPickupAt).getTime();
  });

  return filtered;
}
