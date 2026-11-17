import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ragConfigKeys } from '@/hooks/useAdminRagConfig'
import * as service from '@/services/adminRagUsageService'
import type { UsageBreakdownKind, UsageRange, UsageRequestsFilter } from '@/services/adminRagUsageService'
import type { ApiError } from '@/services/api/errors'
import type { UpdateRagBudgetRequest } from '@/types/req/adminRagBudgetReq'
import type { ReviewAiUsageRequest } from '@/types/req/adminRagUsageReq'

// Trang Chi phí AI. Mọi GET chung 60 lần / phút nên không tự tải lại khi quay lại tab; đổi khoảng ngày thì giữ số cũ (mờ)
// tới khi có số mới

export const ragUsageKeys = {
  all: ['admin-rag-usage'] as const,
  summary: (range: UsageRange) => [...ragUsageKeys.all, 'summary', range] as const,
  timeseries: (range: UsageRange) => [...ragUsageKeys.all, 'timeseries', range] as const,
  breakdown: (kind: UsageBreakdownKind, range: UsageRange) => [...ragUsageKeys.all, 'breakdown', kind, range] as const,
  topUsers: (range: UsageRange) => [...ragUsageKeys.all, 'top-users', range] as const,
  requests: (filter: UsageRequestsFilter) => [...ragUsageKeys.all, 'requests', filter] as const,
  budget: () => [...ragUsageKeys.all, 'budget'] as const,
}

// Chức năng tắt (503) và lỗi 4xx gọi lại vẫn vậy
const retry = (count: number, error: ApiError) =>
  !(error.status >= 400 && error.status < 500) && error.status !== 503 && count < 2

const reads = { staleTime: 30_000, refetchOnWindowFocus: false, retry, placeholderData: keepPreviousData } as const

export function useUsageSummaryQuery(range: UsageRange, enabled: boolean) {
  return useQuery({
    ...reads,
    queryKey: ragUsageKeys.summary(range),
    queryFn: () => service.getUsageSummary(range),
    enabled,
  })
}

export function useUsageTimeseriesQuery(range: UsageRange, enabled: boolean) {
  return useQuery({
    ...reads,
    queryKey: ragUsageKeys.timeseries(range),
    queryFn: () => service.getUsageTimeseries(range),
    enabled,
  })
}

export function useUsageBreakdownQuery(kind: UsageBreakdownKind, range: UsageRange, enabled: boolean) {
  return useQuery({
    ...reads,
    queryKey: ragUsageKeys.breakdown(kind, range),
    queryFn: () => service.getUsageBreakdown(kind, range),
    enabled,
  })
}

export function useTopUsersQuery(range: UsageRange, enabled: boolean) {
  return useQuery({
    ...reads,
    queryKey: ragUsageKeys.topUsers(range),
    queryFn: () => service.getTopUsers(range),
    enabled,
  })
}

export function useUsageRequestsQuery(filter: UsageRequestsFilter, enabled: boolean) {
  return useQuery({
    ...reads,
    queryKey: ragUsageKeys.requests(filter),
    queryFn: () => service.getUsageRequests(filter),
    enabled,
  })
}

export function useBudgetQuery() {
  return useQuery({ ...reads, queryKey: ragUsageKeys.budget(), queryFn: () => service.getBudget() })
}

/** Đối soát chuyển tiền từ "chưa chắc" sang "đã chốt": tải lại cả trang, kể cả khi lỗi (dòng đã được người khác đối soát) */
export function useReviewUsageMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { ledgerId: string; body: ReviewAiUsageRequest }>({
    mutationFn: ({ ledgerId, body }) => service.reviewUsage(ledgerId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ragUsageKeys.all }),
  })
}

/** Đổi giới hạn tạo phiên bản cấu hình mới: tải lại ngân sách, số liệu và tab Cấu hình AI */
export function useUpdateBudgetMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateRagBudgetRequest) => service.updateBudget(body),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ragUsageKeys.all }),
        queryClient.invalidateQueries({ queryKey: ragConfigKeys.all }),
      ]),
  })
}
