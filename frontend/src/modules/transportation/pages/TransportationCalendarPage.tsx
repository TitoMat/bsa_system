import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { CalendarDays, CalendarX2, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import { getTransportationRequests, getTransportationRequest } from '../api/transportation.api';
import type { TransportationRequest } from '../types/transportation.types';
import { RequestDetailsModal } from '../components/RequestDetailsModal';
import { useCalendarState } from '../components/calendar/useCalendarState';
import { CalendarToolbar } from '../components/calendar/CalendarToolbar';
import { MiniCalendar } from '../components/calendar/MiniCalendar';
import { PriorityLegend } from '../components/calendar/PriorityLegend';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { DayView } from '../components/calendar/DayView';
import { AgendaView } from '../components/calendar/AgendaView';
import { CalendarSkeleton } from '../components/calendar/CalendarSkeleton';
import type { CalendarEvent } from '../components/calendar/types';
import { eventColor, formatEventTime, toCalendarEvent } from '../components/calendar/types';

export default function TransportationCalendarPage() {
  const navigate = useNavigate();
  const state = useCalendarState();
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const start = dayjs().startOf('day').toISOString();
    const end = dayjs().endOf('day').toISOString();
    getTransportationRequests({
      page: 1,
      pageSize: 100,
      scheduledFrom: start,
      scheduledTo: end,
      sortBy: 'scheduledPickupAt',
      sortDirection: 'ASC',
    })
      .then((r) => setTodayEvents(r.items.map(toCalendarEvent)))
      .catch(() => setTodayEvents([]));
  }, []);

  const todayCount = todayEvents.length;
  const now = dayjs();
  const ongoingCount = todayEvents.filter((e) => dayjs(e.start).isBefore(now) && dayjs(e.end).isAfter(now)).length;

  const eventDates = useMemo(
    () => state.events.map((e) => dayjs(e.start).format('YYYY-MM-DD')),
    [state.events]
  );

  const eventCountsByPriority = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of state.events) {
      counts[e.priority] = (counts[e.priority] ?? 0) + 1;
    }
    return counts;
  }, [state.events]);

  const label =
    state.view === 'month'
      ? state.selectedDate.format('MMMM YYYY')
      : state.view === 'week'
        ? `${state.selectedDate.startOf('week').format('MMM D')} – ${state.selectedDate.endOf('week').format('MMM D, YYYY')}`
        : state.selectedDate.format('dddd, MMMM D, YYYY');

  const openEvent = async (e: CalendarEvent) => {
    try {
      const detail = await getTransportationRequest(e.id);
      setDetailRequest(detail);
    } catch {
      setDetailRequest(null);
    }
  };
  const openNewRequest = () => navigate('/transportation-requests/lodge');
  const [detailRequest, setDetailRequest] = useState<TransportationRequest | null>(null);

  const selectedPriority = state.filters.priority ?? [];
  const togglePriority = (p: (typeof selectedPriority)[number]) => {
    const next = selectedPriority.includes(p)
      ? selectedPriority.filter((s) => s !== p)
      : [...selectedPriority, p];
    state.setFilters({ priority: next.length > 0 ? next : undefined });
  };

  if (state.loading && state.events.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Transportation Calendar</h1>
        </div>
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Transportation Calendar</h1>
        <button
          type="button"
          onClick={state.refresh}
          disabled={state.loading}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition hover:bg-[var(--color-bg-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw size={16} className={state.loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Today's Overview */}
      <div
        className="mb-1 rounded-2xl border p-4 shadow-sm sm:p-5"
        style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--color-brand) 12%, transparent)' }}
            >
              <CalendarDays size={22} style={{ color: 'var(--color-brand)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{dayjs().format('dddd')}</p>
              <p className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {dayjs().format('MMMM D, YYYY')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border px-4 py-2.5 text-center" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-brand)' }}>{todayCount}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Today</p>
            </div>
            {ongoingCount > 0 && (
              <div
                className="rounded-xl border px-4 py-2.5 text-center"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
                  background: 'color-mix(in srgb, var(--color-success) 8%, transparent)',
                }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{ongoingCount}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Ongoing</p>
              </div>
            )}
          </div>
        </div>

        {todayEvents.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              Today's Schedule
            </p>
            {todayEvents.slice(0, 5).map((e) => (
              <button
                type="button"
                key={e.id}
                onClick={() => openEvent(e)}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:opacity-80"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: eventColor(e) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {e.title}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {formatEventTime(e.start, e.end)} · {e.pickupAddress} → {e.destinationAddress}
                  </p>
                </div>
                <ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            ))}
            {todayCount > 5 && (
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                +{todayCount - 5} more request{todayCount - 5 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Clock size={14} />
            <span>No requests scheduled for today.</span>
            <button
              type="button"
              onClick={openNewRequest}
              className="ml-1 font-medium underline"
              style={{ color: 'var(--color-brand)' }}
            >
              Create one
            </button>
          </div>
        )}
      </div>

      <CalendarToolbar
        view={state.view}
        onViewChange={state.setView}
        label={label}
        searchQuery={state.searchQuery}
        onSearchChange={state.setSearchQuery}
        onToday={state.goToday}
        onPrev={state.goPrev}
        onNext={state.goNext}
        onNewRequest={openNewRequest}
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full shrink-0 space-y-4 lg:w-64">
          <MiniCalendar
            currentMonth={state.selectedDate}
            selectedDate={state.selectedDate}
            onSelect={state.setSelectedDate}
            onPrevMonth={() => state.setSelectedDate(state.selectedDate.subtract(1, 'month'))}
            onNextMonth={() => state.setSelectedDate(state.selectedDate.add(1, 'month'))}
            eventDates={eventDates}
          />
          <div
            className="rounded-xl border p-3 shadow-sm"
            style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                Priority
              </h4>
              {state.filters.priority && state.filters.priority.length > 0 && (
                <button
                  type="button"
                  onClick={() => state.setFilters({})}
                  className="text-[10px] font-medium underline transition hover:opacity-80"
                  style={{ color: 'var(--color-brand)' }}
                >
                  Clear
                </button>
              )}
            </div>
            <PriorityLegend
              selected={selectedPriority}
              onToggle={togglePriority}
              eventCounts={eventCountsByPriority}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {state.error && (
            <div
              className="mb-4 flex items-center gap-2 rounded-xl border p-4 text-sm"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)',
                background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)',
                color: 'var(--color-danger)',
              }}
            >
              <CalendarX2 size={16} />
              {state.error}
              <button
                type="button"
                onClick={state.refresh}
                className="ml-auto text-sm font-medium underline"
              >
                Try again
              </button>
            </div>
          )}

          {!state.error && state.filteredEvents.length === 0 && (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border py-16 shadow-sm"
              style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {state.searchQuery || (state.filters.priority && state.filters.priority.length > 0)
                  ? 'No requests match your filters.'
                  : 'No requests scheduled for this period.'}
              </p>
              <button
                type="button"
                onClick={openNewRequest}
                className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-85"
                style={{ background: 'var(--color-brand)' }}
              >
                New Request
              </button>
            </div>
          )}

          {!state.error && state.filteredEvents.length > 0 && (
            <>
              {state.view === 'month' && (
                <MonthView
                  currentMonth={state.selectedDate}
                  selectedDate={state.selectedDate}
                  events={state.filteredEvents}
                  onDateClick={state.setSelectedDate}
                  onEventClick={openEvent}
                />
              )}
              {state.view === 'week' && (
                <WeekView
                  currentDate={state.selectedDate}
                  events={state.filteredEvents}
                  onEventClick={openEvent}
                  onDateClick={state.setSelectedDate}
                />
              )}
              {state.view === 'day' && (
                <DayView
                  date={state.selectedDate}
                  events={state.filteredEvents}
                  onEventClick={openEvent}
                />
              )}
              {state.view === 'agenda' && (
                <AgendaView
                  startDate={state.visibleStart}
                  endDate={state.visibleEnd}
                  events={state.filteredEvents}
                  onEventClick={openEvent}
                />
              )}
            </>
          )}
        </div>
      </div>

      <RequestDetailsModal request={detailRequest} onClose={() => setDetailRequest(null)} />
    </div>
  );
}