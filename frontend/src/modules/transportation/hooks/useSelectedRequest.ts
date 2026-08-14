import { useQuery } from '@tanstack/react-query';
import { getTransportationRequest } from '../api/transportation.api';

export function useSelectedRequest(id: string | null) {
  return useQuery({
    queryKey: ['transportationRequest', id],
    queryFn: () => getTransportationRequest(id as string),
    enabled: !!id,
    staleTime: 30_000,
  });
}
