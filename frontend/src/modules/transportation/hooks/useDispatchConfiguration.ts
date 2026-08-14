import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDispatchSettings,
  getExecutiveResources,
  updateDispatchSettings,
} from '../api/transportation.api';

export function useDispatchConfiguration() {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: ['dispatchSettings'],
    queryFn: getDispatchSettings,
  });

  const executiveResources = useQuery({
    queryKey: ['executiveResources'],
    queryFn: getExecutiveResources,
    staleTime: 30_000,
  });

  const invalidateSettings = () =>
    queryClient.invalidateQueries({ queryKey: ['dispatchSettings'] });

  const toggleAuto = useMutation({
    mutationFn: async () => {
      if (!settings.data) return;
      return updateDispatchSettings({ autoDispatchEnabled: !settings.data.autoDispatchEnabled });
    },
    onSuccess: () => {
      invalidateSettings();
      queryClient.invalidateQueries({ queryKey: ['executiveResources'] });
    },
  });

  const toggleBoss = useMutation({
    mutationFn: async () => {
      if (!settings.data) return;
      return updateDispatchSettings({
        executiveReservationMode: !settings.data.executiveReservationMode,
      });
    },
    onSuccess: () => {
      invalidateSettings();
      queryClient.invalidateQueries({ queryKey: ['executiveResources'] });
    },
  });

  const changeStrategy = useMutation({
    mutationFn: async (strategy: string) =>
      updateDispatchSettings({ defaultAssignmentStrategy: strategy }),
    onSuccess: invalidateSettings,
  });

  return { settings, executiveResources, toggleAuto, toggleBoss, changeStrategy };
}
