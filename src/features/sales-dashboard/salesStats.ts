import type { MySurveyRequestItem } from '@/types/res/surveyRequestsRes'
import type { CollectionCaseView, ContractDirectoryItem } from '@/types/res/paymentPlanRes'
import { addDays as addDaysIso, bucketBy, isLiveContract, vnDayOf, vnMonthOf } from '../dashboard/dashboardStats.ts'

// Thống kê của trang Tổng quan kinh doanh. Hai phạm vi khác nhau, ghi rõ trên từng khối:
// - "Khách của tôi": yêu cầu khảo sát kinh doanh đang đăng nhập đã nhận (GET /api/survey-requests/mine) và hợp đồng sinh ra từ
//   các yêu cầu đó (GET /api/contracts, lọc theo surveyRequestId).
// - "Toàn hệ thống": hồ sơ thu hồi công nợ (GET /api/collections), vì backend không gắn hồ sơ với một kinh doanh

/** Hợp đồng đang tính của các yêu cầu do kinh doanh này nhận */
export function myLiveContracts(
  contracts: readonly ContractDirectoryItem[],
  mySurveys: readonly MySurveyRequestItem[],
) {
  const mine = new Set(mySurveys.map((s) => s.surveyRequestId))
  return contracts.filter((c) => mine.has(c.surveyRequestId) && isLiveContract(c))
}

export type FunnelStage = { key: string; label: string; value: number; hint: string }

/**
 * Phễu theo yêu cầu khảo sát (mỗi yêu cầu đếm một lần ở mỗi bước, bước sau luôn nằm trong bước trước):
 * đã nhận → đã có lịch khảo sát → đã khảo sát → có hợp đồng → đã nhận tiền (khoản 30% của gói 30/70, hoặc 100% của hợp đồng cũ).
 * Không có bước "báo giá" vì kinh doanh không có danh sách báo giá theo yêu cầu (kỹ thuật viên lập báo giá tại công trình)
 */
export function salesFunnel(
  mySurveys: readonly MySurveyRequestItem[],
  liveContracts: readonly ContractDirectoryItem[],
) {
  const withContract = new Set(liveContracts.map((c) => c.surveyRequestId))
  const paid = new Set(liveContracts.filter((c) => c.depositPaid).map((c) => c.surveyRequestId))
  const contracted = mySurveys.filter((s) => withContract.has(s.surveyRequestId))
  const surveyed = mySurveys.filter((s) => s.status === 'COMPLETED' || withContract.has(s.surveyRequestId))
  const scheduled = mySurveys.filter(
    (s) => s.status === 'SCHEDULED' || s.status === 'COMPLETED' || withContract.has(s.surveyRequestId),
  )
  const stages: FunnelStage[] = [
    { key: 'claimed', label: 'Yêu cầu đã nhận', value: mySurveys.length, hint: 'Mọi yêu cầu bạn đã nhận' },
    { key: 'scheduled', label: 'Đã có lịch khảo sát', value: scheduled.length, hint: 'Đã chốt giờ hoặc đã khảo sát' },
    { key: 'surveyed', label: 'Đã khảo sát', value: surveyed.length, hint: 'Kỹ thuật viên đã khảo sát xong' },
    { key: 'contracted', label: 'Có hợp đồng', value: contracted.length, hint: 'Có hợp đồng chưa huỷ, chưa bị thay' },
    {
      key: 'paid',
      label: 'Khách đã trả tiền',
      value: contracted.filter((s) => paid.has(s.surveyRequestId)).length,
      hint: 'Đã nhận khoản 30% (gói 30/70) hoặc đủ 100% (cách cũ)',
    },
  ]
  return {
    stages,
    closed: mySurveys.filter((s) => s.status === 'CLOSED' || s.status === 'CANCELLED').length,
  }
}

/** Hợp đồng tạo mỗi tháng, tách gói 30/70 và cách cũ */
export function contractsByMonth(contracts: readonly ContractDirectoryItem[], months: readonly string[]) {
  return months.map((month) => {
    const inMonth = contracts.filter((c) => vnMonthOf(c.createdAt) === month)
    return {
      month,
      plan: inMonth.filter((c) => c.paymentPlan !== null).length,
      legacy: inMonth.filter((c) => c.paymentPlan === null).length,
    }
  })
}

/** Khoá nhóm trạng thái của một hợp đồng: chặng thanh toán với gói 30/70, "LEGACY_<status>" với hợp đồng cũ */
export const contractGroupKey = (c: Pick<ContractDirectoryItem, 'paymentPlan' | 'stage' | 'status'>) =>
  c.paymentPlan !== null ? c.stage : `LEGACY_${c.status}`

export function contractsByGroup(contracts: readonly ContractDirectoryItem[]) {
  return bucketBy(contracts, contractGroupKey, (c) => c.totalAmount)
}

export type CollectionStats = {
  open: CollectionCaseView[]
  byStatus: Map<string, { count: number; amount: number }>
  contactRequired: CollectionCaseView[]
  /** Khách đã hẹn ngày trả, ngày hẹn đã qua mà hồ sơ còn mở */
  brokenPromises: CollectionCaseView[]
  resolved: number
  resolvedLast30Days: number
  trend: { month: string; opened: number; resolved: number }[]
}

export function collectionStats(
  cases: readonly CollectionCaseView[],
  months: readonly string[],
  today: string,
): CollectionStats {
  const open = cases.filter((c) => c.status !== 'RESOLVED')
  const resolvedCases = cases.filter((c) => c.status === 'RESOLVED')
  const since = addDaysIso(today, -29)
  return {
    open,
    byStatus: bucketBy(
      open,
      (c) => c.status,
      (c) => c.amountDue,
    ),
    contactRequired: open.filter((c) => c.status === 'SALES_CONTACT_REQUIRED'),
    brokenPromises: open.filter(
      (c) => c.status === 'AGREEMENT_RECORDED' && c.promisedPaymentDate !== null && c.promisedPaymentDate < today,
    ),
    resolved: resolvedCases.length,
    resolvedLast30Days: resolvedCases.filter((c) => vnDayOf(c.resolvedAt) >= since).length,
    trend: months.map((month) => ({
      month,
      opened: cases.filter((c) => vnMonthOf(c.openedAt) === month).length,
      resolved: resolvedCases.filter((c) => vnMonthOf(c.resolvedAt) === month).length,
    })),
  }
}
