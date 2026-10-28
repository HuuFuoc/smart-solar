import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as quotationService from '@/services/customerQuotationService'
import type { ApiError } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Báo giá lắp đặt của khách. Trả lời xong (kể cả lỗi vì báo giá vừa được thay) thì tải lại danh sách và chi tiết

export const customerQuotationKeys = {
  all: ['customer-quotations'] as const,
  list: () => [...customerQuotationKeys.all, 'list'] as const,
  detail: (quotationId: string) => [...customerQuotationKeys.all, 'detail', quotationId] as const,
}

/** `enabled`: trang khác chỉ gọi khi đã chắc là khách hàng */
export function useMyQuotationsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<QuotationView[], ApiError>({
    queryKey: customerQuotationKeys.list(),
    queryFn: quotationService.listMyQuotations,
    // Tự tải lại để số đỏ trên menu cập nhật
    refetchInterval: 60_000,
    enabled,
  })
}

export function useMyQuotationQuery(quotationId: string | undefined) {
  return useQuery<QuotationView, ApiError>({
    queryKey: customerQuotationKeys.detail(quotationId ?? ''),
    queryFn: () => quotationService.getMyQuotation(quotationId!),
    enabled: Boolean(quotationId),
  })
}

export function useAcceptMyQuotationMutation() {
  const queryClient = useQueryClient()
  return useMutation<QuotationView, ApiError, string>({
    mutationFn: quotationService.acceptQuotation,
    onSettled: () => queryClient.invalidateQueries({ queryKey: customerQuotationKeys.all }),
  })
}

export function useRequestQuotationRevisionMutation() {
  const queryClient = useQueryClient()
  return useMutation<QuotationView, ApiError, { quotationId: string; reason: string }>({
    mutationFn: ({ quotationId, reason }) => quotationService.requestRevision(quotationId, reason),
    onSettled: () => queryClient.invalidateQueries({ queryKey: customerQuotationKeys.all }),
  })
}
