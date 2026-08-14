import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  calculateTransportationRoute,
  dispatchAuto,
  dispatchReassign,
} from '../api/transportation.api';
import { monitoringBoardKey } from './useFleetMonitoring';
import { fleetMapStateKey } from './useFleetMapState';

export function useRequestActions() {
  const queryClient = useQueryClient();
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);

  const refreshBoard = () => {
    queryClient.invalidateQueries({ queryKey: monitoringBoardKey });
    queryClient.invalidateQueries({ queryKey: fleetMapStateKey });
  };

  const autoAssign = useMutation({
    mutationFn: (id: string) => dispatchAuto(id),
    onSuccess: (data) => {
      setDispatchMsg(data.ok ? 'Assignment successful' : `Failed: ${data.failures?.join('; ') ?? data.status}`);
      refreshBoard();
    },
    onError: (err: unknown) => {
      setDispatchMsg(`Error: ${String(err)}`);
    },
  });

  const reassign = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      dispatchReassign(id, reason || 'Manual reassign from board'),
    onSuccess: (data) => {
      setDispatchMsg(data.ok ? 'Reassignment successful' : `Failed: ${data.failures?.join('; ') ?? data.status}`);
      refreshBoard();
    },
    onError: (err: unknown) => {
      setDispatchMsg(`Error: ${String(err)}`);
    },
  });

  const refreshRoute = useMutation({
    mutationFn: (id: string) => calculateTransportationRoute(id),
    onSuccess: (_, id) => {
      setDispatchMsg('Route refreshed');
      refreshBoard();
      queryClient.invalidateQueries({ queryKey: ['transportationRequest', id] });
    },
    onError: (err: unknown) => {
      setDispatchMsg(`Route refresh failed: ${String(err)}`);
    },
  });

  return { dispatchMsg, setDispatchMsg, autoAssign, reassign, refreshRoute };
}
