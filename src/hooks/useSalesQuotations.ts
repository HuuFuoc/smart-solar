import { useQuery } from '@tanstack/react-query'
import * as quotationService from '@/services/salesQuotationService'
import type { ApiError } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Báo giá lắp đặt phía kinh doanh, quản lý, quản trị: chỉ đọc

export const salesQuotationKeys = {
  all: ['sales-quotations'] as const,
  list: (surveyRequestId: string) => [...salesQuotationKeys.all, 'list', surveyRequestId] as const,
}

export function useQuotationsQuery(
  surveyRequestId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<QuotationView[], ApiError>({
    queryKey: salesQuotationKeys.list(surveyRequestId ?? ''),
    queryFn: () => quotationService.listForSurveyRequest(surveyRequestId!),
    enabled: enabled && Boolean(surveyRequestId),
  })
}
