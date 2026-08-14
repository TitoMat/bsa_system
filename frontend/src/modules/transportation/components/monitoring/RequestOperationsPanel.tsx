import { useMemo, useState } from 'react';
import { LayoutGrid, Search, Table2, X } from 'lucide-react';
import type { BoardRequest, BoardSummary } from '../../api/transportation.api';
import {
  FILTER_TABS,
  filterBoardRequests,
  getSummaryCount,
  type FilterTabKey,
} from '../../utils/boardFilters';
import RequestCard from './RequestCard';
import RequestTable from './RequestTable';

export default function RequestOperationsPanel({
  requests,
  summary,
  isLoading,
  isError,
  selectedId,
  onSelect,
  onHover,
}: {
  requests: BoardRequest[];
  summary: BoardSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<FilterTabKey>('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const filtered = useMemo(
    () => filterBoardRequests(requests, activeTab, search),
    [requests, activeTab, search],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search + view toggle */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <div className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-surface-muted)' }}>
          <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests, driver, plate..."
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search"><X size={12} style={{ color: 'var(--color-text-muted)' }} /></button>
          )}
        </div>
        <div className="flex rounded-lg border" style={{ borderColor: 'var(--color-border-default)' }}>
          <button
            onClick={() => setViewMode('table')}
            className="flex items-center gap-1 rounded-l-lg px-2.5 py-1.5 text-xs font-medium"
            style={{ background: viewMode === 'table' ? 'var(--color-brand)' : 'var(--color-bg-surface)', color: viewMode === 'table' ? '#fff' : 'var(--color-text-secondary)' }}
            aria-label="Table view"
          >
            <Table2 size={13} /> Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className="flex items-center gap-1 rounded-r-lg px-2.5 py-1.5 text-xs font-medium"
            style={{ background: viewMode === 'cards' ? 'var(--color-brand)' : 'var(--color-bg-surface)', color: viewMode === 'cards' ? '#fff' : 'var(--color-text-secondary)' }}
            aria-label="Cards view"
          >
            <LayoutGrid size={13} /> Cards
          </button>
        </div>
      </div>

      {/* Status pills (counts from backend summary) */}
      <div className="flex gap-1 overflow-x-auto border-b px-3 py-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
        {FILTER_TABS.map((tab) => {
          const count = getSummaryCount(summary, tab.key);
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition"
              style={{
                background: active ? tab.color : 'transparent',
                color: active ? '#fff' : 'var(--color-text-muted)',
                opacity: count === undefined ? 0.5 : 1,
              }}
              aria-pressed={active}
            >
              {tab.label} {count !== undefined ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Request queue */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading requests...</div>
        ) : isError ? (
          <div className="p-4 text-xs" style={{ color: 'var(--color-danger)' }}>Failed to load board data</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {search ? 'No matching requests' : 'No requests found'}
          </div>
        ) : viewMode === 'table' ? (
          <RequestTable requests={filtered} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          filtered.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              selected={r.id === selectedId}
              hovered={false}
              onSelect={() => onSelect(r.id)}
              onHover={(h) => onHover(h ? r.id : null)}
            />
          ))
        )}
      </div>

      {/* Fleet summary strip */}
      {summary && (
        <div className="flex items-center gap-3 border-t px-4 py-1.5 text-[10px]" style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
          <span><strong style={{ color: 'var(--color-text-primary)' }}>{summary.total}</strong> total</span>
          <span className="inline-block h-1 w-1 rounded-full" style={{ background: 'var(--color-border-default)' }} />
          <span><strong style={{ color: 'var(--color-danger)' }}>{summary.unassigned}</strong> needs assignment</span>
          <span className="inline-block h-1 w-1 rounded-full" style={{ background: 'var(--color-border-default)' }} />
          <span><strong style={{ color: 'var(--color-brand)' }}>{summary.active}</strong> active</span>
          <span className="inline-block h-1 w-1 rounded-full" style={{ background: 'var(--color-border-default)' }} />
          <span><strong style={{ color: 'var(--color-warning)' }}>{summary.issues}</strong> issues</span>
        </div>
      )}
    </div>
  );
}
