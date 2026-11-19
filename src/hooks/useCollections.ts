import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contractKeys } from '@/hooks/useContracts'
import * as collectionService from '@/services/collectionService'
import type { ApiError } from '@/services/api/errors'
import type { CollectionActivityRequest, CollectionDecisionRequest, CollectionQuery } from '@/types/req/paymentPlanReq'
import type { CollectionCaseView, PagedResult } from '@/types/res/paymentPlanRes'

// Hồ sơ thu hồi khoản quá hạn. Lệnh ghi gửi `expectedRevision` đang xem; xong (kể cả lỗi 409) thì tải lại danh sách và hồ sơ

export const collectionKeys = {
  all: ['collections'] as const,
  list: (query: CollectionQuery) => [...collectionKeys.all, 'list', query] as const,
  detail: (caseId: string) => [...collectionKeys.all, 'detail', caseId] as const,
}

export function useCollectionsQuery(query: CollectionQuery) {
  return useQuery<PagedResult<CollectionCaseView>, ApiError>({
    queryKey: collectionKeys.list(query),
    queryFn: () => collectionService.listCollections(query),
    placeholderData: keepPreviousData,
  })
}

export function useCollectionQuery(caseId: string | undefined) {
  return useQuery<CollectionCaseView, ApiError>({
    queryKey: collectionKeys.detail(caseId ?? ''),
    queryFn: () => collectionService.getCollection(caseId!),
    enabled: Boolean(caseId),
  })
}

function useCollectionWrite<V>(write: (variables: V) => Promise<CollectionCaseView>) {
  const queryClient = useQueryClient()
  return useMutation<CollectionCaseView, ApiError, V>({
    mutationFn: write,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
        queryClient.invalidateQueries({ queryKey: contractKeys.all }),
      ]),
  })
}

export const useRecordCollectionActivityMutation = () =>
  useCollectionWrite(({ caseId, body }: { caseId: string; body: CollectionActivityRequest }) =>
    collectionService.recordActivity(caseId, body),
  )

export type CollectionDecision = 'escalate' | 'legal-review' | 'resolve'

export const useCollectionDecisionMutation = () =>
  useCollectionWrite(
    ({ caseId, decision, body }: { caseId: string; decision: CollectionDecision; body: CollectionDecisionRequest }) =>
      decision === 'escalate'
        ? collectionService.escalate(caseId, body)
        : decision === 'legal-review'
          ? collectionService.requestLegalReview(caseId, body)
          : collectionService.resolve(caseId, body),
  )
