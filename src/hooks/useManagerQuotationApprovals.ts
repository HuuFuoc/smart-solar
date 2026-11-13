import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as approvalService from '@/services/managerQuotationApprovalService'
import * as quotationService from '@/services/salesQuotationService'
import type { ApiError } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Hàng chờ duyệt giá của quản lý. Không cập nhật lạc quan: quyết định xong (kể cả lỗi vì kinh doanh vừa sửa giá) thì tải lại

export const pricingApprovalKeys = {
  all: ['manager-pricing-approvals'] as const,
  pending: () => [...pricingApprovalKeys.all, 'pending'] as const,
  detail: (quotationId: string) => [...pricingApprovalKeys.all, 'detail', quotationId] as const,
}

export function usePricingApprovalsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<QuotationView[], ApiError>({
    queryKey: pricingApprovalKeys.pending(),
    queryFn: approvalService.listPendingPricingApprovals,
    enabled,
  })
}

/** Một bản báo giá (GET /quotations/{id} cho quản lý đọc), luôn tải lại khi mở để quyết định trên revision mới nhất */
export function useApprovalQuotationQuery(quotationId: string | undefined) {
  return useQuery<QuotationView, ApiError>({
    queryKey: pricingApprovalKeys.detail(quotationId ?? ''),
    queryFn: () => quotationService.getQuotation(quotationId!),
    enabled: Boolean(quotationId),
    refetchOnMount: 'always',
  })
}

export function useDecidePricingApprovalMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    QuotationView,
    ApiError,
    { quotationId: string; revision: number; approve: boolean; reason: string }
  >({
    mutationFn: ({ quotationId, ...body }) => approvalService.decidePricingApproval(quotationId, body),
    onSuccess: (view) => queryClient.setQueryData(pricingApprovalKeys.detail(view.quotationId), view),
    onSettled: () => queryClient.invalidateQueries({ queryKey: pricingApprovalKeys.all }),
  })
}
