import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMonitoringBoard } from '../api/transportation.api';

export const monitoringBoardKey = ['monitoringBoard'] as const;

export function useFleetMonitoring() {
  const queryClient = useQueryClient();

  const board = useQuery({
    queryKey: monitoringBoardKey,
    queryFn: getMonitoringBoard,
    refetchInterval: 30_000,
  });

  const refreshBoard = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: monitoringBoardKey });
  }, [queryClient]);

  return { board, refreshBoard };
}
