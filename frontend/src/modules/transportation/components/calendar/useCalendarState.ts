import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCalendarEvents } from '../../api/transportation.api';
import type { TransportationPriority } from '../../types/transportation.types';
import type { CalendarEvent, CalendarView } from './types';
import { toCalendarEventFromItem } from './types';

export function calendarEventsKey(from: string, to: string) {
  return ['calendarEvents', from, to] as const;
}

interface CalendarFilters {
  priority?: TransportationPriority[];
}

export interface CalendarState {
  view: CalendarView;
  setView: (v: CalendarView) => void;
  selectedDate: dayjs.Dayjs;
  setSelectedDate: (d: dayjs.Dayjs) => void;
  visibleStart: dayjs.Dayjs;
  visibleEnd: dayjs.Dayjs;
  events: CalendarEvent[];
  filteredEvents: CalendarEvent[];
  filters: CalendarFilters;
  setFilters: (f: CalendarFilters) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loading: boolean;
  error: string | null;
  goToday: () => void;
  goPrev: () => void;
  goNext: () => void;
  refresh: () => Promise<void>;
}

const CALENDAR_STALE_TIME_MS = 60_000;

export function useCalendarState(): CalendarState {
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs);
  const [filters, setFilters] = useState<CalendarFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const visibleStart = useMemo(() => {
    if (view === 'month') return selectedDate.startOf('month').startOf('week');
    if (view === 'week') return selectedDate.startOf('week');
    if (view === 'day') return selectedDate.startOf('day');
    return selectedDate.startOf('month');
  }, [view, selectedDate]);

  const visibleEnd = useMemo(() => {
    if (view === 'month') return selectedDate.endOf('month').endOf('week');
    if (view === 'week') return selectedDate.endOf('week');
    if (view === 'day') return selectedDate.endOf('day');
    return selectedDate.endOf('month');
  }, [view, selectedDate]);

  const from = visibleStart.toISOString();
  const to = visibleEnd.toISOString();

  const eventsQuery = useQuery({
    queryKey: calendarEventsKey(from, to),
    queryFn: () => getCalendarEvents(from, to),
    staleTime: CALENDAR_STALE_TIME_MS,
    placeholderData: (prev) => prev,
  });

  const events = useMemo(
    () => (eventsQuery.data ?? []).map(toCalendarEventFromItem),
    [eventsQuery.data],
  );

  const filteredEvents = useMemo(() => {
    let result = events;
    if (filters.priority && filters.priority.length > 0) {
      result = result.filter((e) => filters.priority!.includes(e.priority));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.status.toLowerCase().includes(q) ||
          e.priority.toLowerCase().includes(q) ||
          e.pickupAddress.toLowerCase().includes(q) ||
          e.destinationAddress.toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, filters, searchQuery]);

  const goToday = useCallback(() => setSelectedDate(dayjs()), []);
  const goPrev = useCallback(() => {
    setSelectedDate((d) => {
      if (view === 'month') return d.subtract(1, 'month');
      if (view === 'week') return d.subtract(1, 'week');
      if (view === 'day') return d.subtract(1, 'day');
      return d.subtract(1, 'month');
    });
  }, [view]);
  const goNext = useCallback(() => {
    setSelectedDate((d) => {
      if (view === 'month') return d.add(1, 'month');
      if (view === 'week') return d.add(1, 'week');
      if (view === 'day') return d.add(1, 'day');
      return d.add(1, 'month');
    });
  }, [view]);

  const refresh = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
  }, [queryClient]);

  return {
    view,
    setView,
    selectedDate,
    setSelectedDate,
    visibleStart,
    visibleEnd,
    events,
    filteredEvents,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    loading: eventsQuery.isFetching,
    error: eventsQuery.isError ? 'Unable to load calendar events.' : null,
    goToday,
    goPrev,
    goNext,
    refresh,
  };
}