import { keepPreviousData, useQuery } from '@tanstack/react-query'
import * as financeService from '@/services/adminFinanceService'
import type { FinanceQuery } from '@/services/adminFinanceService'
import type { ApiError } from '@/services/api/errors'
import type { FinanceOverviewView } from '@/types/res/paymentPlanRes'

export const adminFinanceKeys = {
  all: ['admin-finance'] as const,
  overview: (query: FinanceQuery) => [...adminFinanceKeys.all, 'overview', query] as const,
}

/** Báo cáo tài chính; dùng chung hạn mức đọc hợp đồng nên không tự tải lại khi quay lại tab */
export function useFinanceOverviewQuery(query: FinanceQuery, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<FinanceOverviewView, ApiError>({
    queryKey: adminFinanceKeys.overview(query),
    queryFn: () => financeService.getFinanceOverview(query),
    enabled,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  })
}
