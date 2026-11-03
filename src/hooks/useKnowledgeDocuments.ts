import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { needsPolling } from '@/features/knowledge/knowledgeRules'
import * as knowledgeService from '@/services/knowledgeDocumentService'
import type { ApiError } from '@/services/api/errors'
import type {
  PublishKnowledgeVersionRequest,
  RegisterKnowledgeDocumentRequest,
  UpdateKnowledgeMetadataRequest,
} from '@/types/req/adminKnowledgeDocumentsReq'
import type { KnowledgeDocumentView } from '@/types/res/knowledgeDocumentsRes'

// Kho tri thức. Mọi lệnh ghi trả lại tài liệu đầy đủ nên ghi thẳng vào chi tiết, rồi tải lại danh sách.
// Không tự gửi lại khi 409 (revision cũ): tải lại rồi để người dùng làm lại

export const knowledgeKeys = {
  all: ['knowledge-documents'] as const,
  list: (filter: { status: string; category: string }) => [...knowledgeKeys.all, 'list', filter] as const,
  detail: (documentId: string) => [...knowledgeKeys.all, 'detail', documentId] as const,
}

/** Hỏi lại 15 giây một lần khi còn việc chạy nền: 4 lần / phút, xa giới hạn đọc 60 / phút */
const POLL_MS = 15_000

// Như mặc định (4xx không thử lại), thêm 503: chức năng đang tắt thì gọi lại vẫn vậy
const noRetryOnUnavailable = (count: number, error: ApiError) =>
  !(error.status >= 400 && error.status < 500) && error.status !== 503 && count < 2

export function useKnowledgeDocumentsQuery(filter: { status: string; category: string }) {
  return useQuery<KnowledgeDocumentView[], ApiError>({
    queryKey: knowledgeKeys.list(filter),
    queryFn: () => knowledgeService.listKnowledgeDocuments(filter),
    retry: noRetryOnUnavailable,
  })
}

export function useKnowledgeDocumentQuery(documentId: string | undefined) {
  return useQuery<KnowledgeDocumentView, ApiError>({
    queryKey: knowledgeKeys.detail(documentId ?? ''),
    queryFn: () => knowledgeService.getKnowledgeDocument(documentId!),
    enabled: Boolean(documentId),
    retry: noRetryOnUnavailable,
    refetchInterval: (query) => (query.state.data && needsPolling(query.state.data) ? POLL_MS : false),
  })
}

function useDocumentMutation<V>(mutationFn: (variables: V) => Promise<KnowledgeDocumentView>) {
  const queryClient = useQueryClient()
  return useMutation<KnowledgeDocumentView, ApiError, V>({
    mutationFn,
    onSuccess: (view) => queryClient.setQueryData(knowledgeKeys.detail(view.documentId), view),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: knowledgeKeys.all }),
  })
}

export function useRegisterKnowledgeDocumentMutation() {
  return useDocumentMutation((body: RegisterKnowledgeDocumentRequest) =>
    knowledgeService.registerKnowledgeDocument(body),
  )
}

export function useUpdateKnowledgeMetadataMutation() {
  return useDocumentMutation(({ id, body }: { id: string; body: UpdateKnowledgeMetadataRequest }) =>
    knowledgeService.updateKnowledgeMetadata(id, body),
  )
}

export function useAddKnowledgeVersionMutation() {
  return useDocumentMutation(({ id, fileId }: { id: string; fileId: string }) =>
    knowledgeService.addKnowledgeVersion(id, { fileId }),
  )
}

export function usePublishKnowledgeVersionMutation() {
  return useDocumentMutation(({ id, body }: { id: string; body: PublishKnowledgeVersionRequest }) =>
    knowledgeService.publishKnowledgeVersion(id, body),
  )
}

export function useUnpublishKnowledgeMutation() {
  return useDocumentMutation(({ id, revision }: { id: string; revision: number }) =>
    knowledgeService.unpublishKnowledgeDocument(id, { revision }),
  )
}

export function useReindexKnowledgeVersionMutation() {
  return useDocumentMutation(({ id, versionId }: { id: string; versionId: string }) =>
    knowledgeService.reindexKnowledgeVersion(id, { versionId }),
  )
}

export function useRetryKnowledgeJobMutation() {
  return useDocumentMutation(({ id, jobId }: { id: string; jobId: string }) =>
    knowledgeService.retryKnowledgeJob(id, jobId),
  )
}

export function useArchiveKnowledgeMutation() {
  return useDocumentMutation(({ id, revision }: { id: string; revision: number }) =>
    knowledgeService.archiveKnowledgeDocument(id, { revision }),
  )
}
