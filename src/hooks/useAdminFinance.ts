import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
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

/** Số lần gọi tối đa cho biểu đồ xu hướng: backend giới hạn 60 lần đọc hợp đồng / phút, dùng chung với các màn hợp đồng */
export const FINANCE_TREND_MAX_MONTHS = 12

/**
 * Xu hướng tiền đã thu: mỗi tháng một lần gọi báo cáo với khoảng ngày của đúng tháng đó (backend không có chuỗi theo ngày).
 * Cùng khoá cache với báo cáo chính, nên tháng trùng kỳ đang xem không gọi lại. Giữ 5 phút, không tự tải lại khi quay lại tab
 */
export function useFinanceTrendQueries(
  periods: readonly { from: string; to: string }[],
  zoneId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQueries({
    queries: periods.slice(-FINANCE_TREND_MAX_MONTHS).map((p) => {
      const query: FinanceQuery = { from: p.from, to: p.to, zoneId }
      return {
        queryKey: adminFinanceKeys.overview(query),
        queryFn: () => financeService.getFinanceOverview(query),
        enabled,
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      }
    }),
    combine: (results) => ({
      data: results.map((r) => r.data as FinanceOverviewView | undefined),
      isPending: results.some((r) => r.isPending),
      isError: results.some((r) => r.isError),
      isFetching: results.some((r) => r.isFetching),
      refetch: () => Promise.allSettled(results.map((r) => r.refetch())),
    }),
  })
}
