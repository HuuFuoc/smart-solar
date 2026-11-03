import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { knowledgeKeys } from '@/hooks/useKnowledgeDocuments'
import { adminRagConfigService } from '@/services/adminRagConfigService'
import type { ApiError } from '@/services/api/errors'
import type {
  RagActivationView,
  RagConfigurationState,
  RagConfigurationValidationView,
  RagReindexStaleView,
  SaveRagConfigurationDraftRequest,
} from '@/types/res/adminRagConfigTypes'

export const ragConfigKeys = {
  all: ['admin-rag-config'] as const,
  configuration: () => [...ragConfigKeys.all, 'configuration'] as const,
  models: () => [...ragConfigKeys.all, 'models'] as const,
  versions: (page: number, pageSize: number) => [...ragConfigKeys.all, 'versions', { page, pageSize }] as const,
}

// Chức năng tắt (503) gọi lại vẫn vậy, như 4xx: không tự thử lại
const retryUnlessUnavailable = (count: number, error: ApiError) =>
  !(error.status >= 400 && error.status < 500) && error.status !== 503 && count < 2

export function useRagConfigurationQuery() {
  return useQuery<RagConfigurationState, ApiError>({
    queryKey: ragConfigKeys.configuration(),
    queryFn: () => adminRagConfigService.getConfiguration(),
    staleTime: 30_000,
    retry: retryUnlessUnavailable,
  })
}

export function useRagModelsQuery() {
  return useQuery({
    queryKey: ragConfigKeys.models(),
    queryFn: () => adminRagConfigService.getModels(),
    staleTime: 300_000,
    retry: retryUnlessUnavailable,
  })
}

export function useRagVersionsQuery(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ragConfigKeys.versions(page, pageSize),
    queryFn: () => adminRagConfigService.getVersions(page, pageSize),
    staleTime: 15_000,
    retry: retryUnlessUnavailable,
  })
}

// Mọi lệnh ghi (kể cả lỗi, vd. 409 revision cũ) tải lại cấu hình và lịch sử để người dùng thấy bản mới nhất
function useRagMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation<R, ApiError, V>({
    mutationFn,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ragConfigKeys.all }),
  })
}

export function useSaveRagDraftMutation() {
  return useRagMutation((payload: SaveRagConfigurationDraftRequest) => adminRagConfigService.saveDraft(payload))
}

export function useActivateRagDraftMutation() {
  return useRagMutation<number, RagActivationView>((expectedRevision) =>
    adminRagConfigService.activateDraft(expectedRevision),
  )
}

/** Chỉ đọc, không đổi gì trên backend */
export function useValidateRagDraftMutation() {
  return useMutation<RagConfigurationValidationView, ApiError, void>({
    mutationFn: () => adminRagConfigService.validateDraft(),
  })
}

export function useRollbackRagMutation() {
  return useRagMutation<number, RagActivationView>((version) => adminRagConfigService.rollback(version))
}

export function useDeleteRagDraftMutation() {
  return useRagMutation<number, void>((expectedRevision) => adminRagConfigService.deleteDraft(expectedRevision))
}

// Lượt nạp hiện ở kho tri thức nên tải lại cả tài liệu
export function useReindexStaleMutation() {
  const queryClient = useQueryClient()
  return useMutation<RagReindexStaleView, ApiError, void>({
    mutationFn: () => adminRagConfigService.reindexStale(),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: knowledgeKeys.all }),
  })
}
