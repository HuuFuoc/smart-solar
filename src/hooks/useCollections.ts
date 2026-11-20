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

/** Số trang tối đa đọc cho thống kê công nợ (100 hồ sơ mỗi trang, giới hạn PageRequest.MaxPageSize của backend) */
const COLLECTIONS_SUMMARY_MAX_PAGES = 10

export type CollectionsSummary = {
  items: CollectionCaseView[]
  totalItems: number
  /** Còn hồ sơ chưa đọc vì vượt COLLECTIONS_SUMMARY_MAX_PAGES trang */
  partial: boolean
}

/** Mọi hồ sơ công nợ (cả đã đóng) cho biểu đồ của trang Tổng quan: phát sinh / đóng theo tháng, bước xử lý. Giữ 2 phút */
export function useCollectionsSummaryQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<CollectionsSummary, ApiError>({
    queryKey: [...collectionKeys.all, 'summary'],
    queryFn: async () => {
      const pageSize = 100
      const first = await collectionService.listCollections({ page: 1, pageSize, openOnly: false })
      const items = [...first.items]
      const last = Math.min(first.totalPages, COLLECTIONS_SUMMARY_MAX_PAGES)
      for (let page = 2; page <= last; page++) {
        const next = await collectionService.listCollections({ page, pageSize, openOnly: false })
        items.push(...next.items)
      }
      return { items, totalItems: first.totalItems, partial: first.totalPages > last }
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    enabled,
  })
}
