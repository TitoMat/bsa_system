import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFleetMapState } from '../api/transportation.api';

export const fleetMapStateKey = ['fleetMapState'] as const;

/**
 * R6 — Fleet vehicle map state. Refreshes on the same cadence as the dispatch
 * board. mapState.isError is NON-FATAL by design: the dispatch board and
 * request operations must keep working when the fleet map state endpoint
 * fails (errors surface as a small retryable chip on the map, nothing else).
 */
export function useFleetMapState() {
  const queryClient = useQueryClient();

  const mapState = useQuery({
    queryKey: fleetMapStateKey,
    queryFn: getFleetMapState,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
    placeholderData: (previous) => previous,
  });

  const refreshMapState = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: fleetMapStateKey });
  }, [queryClient]);

  return { mapState, refreshMapState };
}