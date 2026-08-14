import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFleetMapState, fleetMapStateKey } from './useFleetMapState';
import type { FleetMapStateResponse } from '../types/fleetMapState.types';
import { getFleetMapState } from '../api/transportation.api';

vi.mock('../api/transportation.api', () => ({
  getFleetMapState: vi.fn(),
}));

const response: FleetMapStateResponse = {
  vehicles: [],
  summary: { totalVehicles: 0, mappedVehicles: 0, unlocatedVehicles: 0 },
  generatedAt: '2026-08-13T00:00:00.000Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFleetMapState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFleetMapState).mockResolvedValue(response);
  });

  it('fetches the fleet map state under its own query key', async () => {
    const { result } = renderHook(() => useFleetMapState(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.mapState.isSuccess).toBe(true));
    expect(getFleetMapState).toHaveBeenCalledTimes(1);
    expect(result.current.mapState.data).toEqual(response);
    expect(fleetMapStateKey).toEqual(['fleetMapState']);
  });

  it('surfaces the error without throwing (non-fatal by contract)', async () => {
    vi.mocked(getFleetMapState).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useFleetMapState(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.mapState.isError).toBe(true), {
      timeout: 6000,
    });
    expect(result.current.mapState.data).toBeUndefined();
  });

  it('refreshes the map state query via refreshMapState', async () => {
    const { result } = renderHook(() => useFleetMapState(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.mapState.isSuccess).toBe(true));
    await result.current.refreshMapState();
    await waitFor(() =>
      expect(vi.mocked(getFleetMapState).mock.calls.length).toBeGreaterThanOrEqual(2),
    );
  });
});