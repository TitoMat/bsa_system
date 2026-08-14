import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getTransportationRequests } from '../../api/transportation.api';
import type { TransportationPriority } from '../../types/transportation.types';
import type { CalendarEvent, CalendarView } from './types';
import { toCalendarEvent } from './types';

const PAGE_SIZE = 100;

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

export function useCalendarState(): CalendarState {
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filters, setFilters] = useState<CalendarFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = visibleStart.toISOString();
      const end = visibleEnd.toISOString();
      const firstPage = await getTransportationRequests({
        page: 1,
        pageSize: PAGE_SIZE,
        scheduledFrom: start,
        scheduledTo: end,
        sortBy: 'scheduledPickupAt',
        sortDirection: 'ASC',
      });

      const items = [...firstPage.items];
      if (firstPage.total > firstPage.items.length) {
        const totalPages = Math.ceil(firstPage.total / PAGE_SIZE);
        const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const rest = await Promise.all(
          pages.map((p) =>
            getTransportationRequests({
              page: p,
              pageSize: PAGE_SIZE,
              scheduledFrom: start,
              scheduledTo: end,
              sortBy: 'scheduledPickupAt',
              sortDirection: 'ASC',
            })
          )
        );
        for (const r of rest) items.push(...r.items);
      }

      setEvents(items.map(toCalendarEvent));
    } catch {
      setEvents([]);
      setError('Unable to load calendar events.');
    } finally {
      setLoading(false);
    }
  }, [visibleStart, visibleEnd]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
    loading,
    error,
    goToday,
    goPrev,
    goNext,
    refresh: loadEvents,
  };
}