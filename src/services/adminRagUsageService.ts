import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { UpdateRagBudgetRequest } from '@/types/req/adminRagBudgetReq'
import type { ReviewAiUsageRequest } from '@/types/req/adminRagUsageReq'
import type { RagActivationView } from '@/types/res/adminRagConfigTypes'
import type {
  AiBudgetView,
  AiTopUserView,
  AiUsageBreakdownView,
  AiUsageDayView,
  AiUsagePageView,
  AiUsageSummaryView,
} from '@/types/res/adminRagUsageRes'

// Sổ chi phí AI và ngân sách (chỉ quản trị). Mọi GET chung giới hạn 60 lần / phút, lệnh ghi 10 lần / phút

export type UsageRange = { from: string; to: string }
export type UsageBreakdownKind = 'byModel' | 'byOperation' | 'byRole'
export type UsageRequestsFilter = UsageRange & {
  operation?: string
  status?: string
  outcome?: string
  page: number
  pageSize: number
}

const api = ENDPOINTS.adminRagUsage

export function getUsageSummary(range: UsageRange) {
  return get<AiUsageSummaryView>(api.summary, { params: range })
}

export function getUsageTimeseries(range: UsageRange) {
  return get<AiUsageDayView[]>(api.timeseries, { params: range })
}

export function getUsageBreakdown(kind: UsageBreakdownKind, range: UsageRange) {
  return get<AiUsageBreakdownView[]>(api[kind], { params: range })
}

export function getTopUsers(range: UsageRange, limit = 10) {
  return get<AiTopUserView[]>(api.topUsers, { params: { ...range, limit } })
}

/** Ô lọc rỗng không gửi: backend trả 400 cho giá trị lạ */
export function getUsageRequests({ operation, status, outcome, ...rest }: UsageRequestsFilter) {
  return get<AiUsagePageView>(api.requests, {
    params: { ...rest, operation: operation || undefined, status: status || undefined, outcome: outcome || undefined },
  })
}

/** Đối soát một dòng UNCERTAIN; 404 AI_USAGE_NOT_FOUND khi dòng đã được đối soát */
export function reviewUsage(ledgerId: string, body: ReviewAiUsageRequest) {
  return post<unknown>(api.review(ledgerId), body)
}

export function getBudget() {
  return get<AiBudgetView>(ENDPOINTS.adminRagBudget)
}

/** Tạo và áp dụng ngay một phiên bản cấu hình mới chỉ đổi các giới hạn chi phí; 409 khi phiên bản đang dùng đã đổi */
export function updateBudget(body: UpdateRagBudgetRequest) {
  return put<RagActivationView>(ENDPOINTS.adminRagBudget, body)
}
