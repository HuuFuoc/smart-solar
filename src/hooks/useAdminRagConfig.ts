import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminRagConfigService } from '@/services/adminRagConfigService'
import type { SaveRagConfigurationDraftRequest } from '@/types/res/adminRagConfigTypes'

export const ragConfigKeys = {
  all: ['admin-rag-config'] as const,
  configuration: () => [...ragConfigKeys.all, 'configuration'] as const,
  models: () => [...ragConfigKeys.all, 'models'] as const,
  versions: (page: number, pageSize: number) => [...ragConfigKeys.all, 'versions', { page, pageSize }] as const,
}

export function useRagConfigurationQuery() {
  return useQuery({
    queryKey: ragConfigKeys.configuration(),
    queryFn: () => adminRagConfigService.getConfiguration(),
    staleTime: 30_000,
  })
}

export function useRagModelsQuery() {
  return useQuery({
    queryKey: ragConfigKeys.models(),
    queryFn: () => adminRagConfigService.getModels(),
    staleTime: 300_000,
  })
}

export function useRagVersionsQuery(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ragConfigKeys.versions(page, pageSize),
    queryFn: () => adminRagConfigService.getVersions(page, pageSize),
    staleTime: 15_000,
  })
}

export function useSaveRagDraftMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveRagConfigurationDraftRequest) =>
      adminRagConfigService.saveDraft(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragConfigKeys.all })
    },
  })
}

export function useActivateRagDraftMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (expectedRevision: number) =>
      adminRagConfigService.activateDraft(expectedRevision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ragConfigKeys.all })
    },
  })
}
