import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminSystemSettingsService } from '@/services/adminSystemSettingsService'
import type { UpdateSchedulingSettingsRequest } from '@/types/req/adminSystemSettingsReq'

export const systemSettingsKeys = {
  all: ['admin-system-settings'] as const,
  scheduling: () => [...systemSettingsKeys.all, 'scheduling'] as const,
  history: (page: number, pageSize: number, key?: string) =>
    [...systemSettingsKeys.all, 'history', { page, pageSize, key }] as const,
}

export function useSchedulingSettingsQuery() {
  return useQuery({
    queryKey: systemSettingsKeys.scheduling(),
    queryFn: () => adminSystemSettingsService.getScheduling(),
    staleTime: 30_000,
  })
}

export function useUpdateSchedulingSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateSchedulingSettingsRequest) => adminSystemSettingsService.updateScheduling(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemSettingsKeys.all })
    },
  })
}

export function useSchedulingHistoryQuery(page = 1, pageSize = 20, key?: string) {
  return useQuery({
    queryKey: systemSettingsKeys.history(page, pageSize, key),
    queryFn: () => adminSystemSettingsService.getHistory(page, pageSize, key),
    staleTime: 10_000,
  })
}
