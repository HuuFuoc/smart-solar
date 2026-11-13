import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as quotationService from '@/services/managerQuotationService'
import type { ApiError } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Duyệt giá báo giá của quản lý. Quyết định xong (kể cả lỗi vì kinh doanh vừa sửa giá) thì tải lại hàng chờ

export const managerQuotationKeys = {
  all: ['manager-quotations'] as const,
  pricingApprovals: () => [...managerQuotationKeys.all, 'pricing-approvals'] as const,
}

/** Tự tải lại để số đỏ trên menu cập nhật. `enabled`: menu chỉ gọi khi đã chắc là quản lý */
export function usePricingApprovalsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<QuotationView[], ApiError>({
    queryKey: managerQuotationKeys.pricingApprovals(),
    queryFn: quotationService.listPricingApprovals,
    refetchInterval: 60_000,
    enabled,
  })
}

type DecideVars = { quotationId: string; revision: number; approve: boolean; reason: string }

export function useDecidePricingApprovalMutation() {
  const queryClient = useQueryClient()
  return useMutation<QuotationView, ApiError, DecideVars>({
    mutationFn: ({ quotationId, ...body }) => quotationService.decidePricingApproval(quotationId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: managerQuotationKeys.all }),
  })
}
