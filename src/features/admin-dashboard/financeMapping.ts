import type { FinanceOverviewView, MoneyBucket } from '@/types/res/paymentPlanRes'
import { collectedInPeriod } from '../dashboard/dashboardStats.ts'

// Đọc báo cáo tài chính (GET /api/admin/finance/overview, backend 7d27054) thành số cho ô và biểu đồ. Chỉ lấy các nhóm backend đã
// tách riêng (không trùng nhau), không suy ra số mới. "Hiện tại" là trạng thái lúc backend tạo báo cáo, "trong kỳ" là tiền đã xác minh
// trong [from, to]

export type FinanceKpis = {
  contractValue: { count: number; amount: number }
  outstanding: MoneyBucket
  outstandingDueNow: MoneyBucket
  overdue: MoneyBucket
  fullyPaid: MoneyBucket
  planContracts: MoneyBucket
  collected: { count: number; amount: number }
  depositsCollected: MoneyBucket
  balancesCollected: MoneyBucket
  legacyCollected: MoneyBucket
  unapplied: MoneyBucket
}

export function financeKpis(v: FinanceOverviewView): FinanceKpis {
  return {
    // Hai nhóm tách theo có / không có gói 30/70 nên cộng không trùng
    contractValue: {
      count: v.paymentPlanContracts.count + v.legacyContracts.count,
      amount: v.paymentPlanContracts.amount + v.legacyContracts.amount,
    },
    outstanding: v.outstanding,
    outstandingDueNow: v.outstandingDueNow,
    overdue: v.balancesOverdue,
    fullyPaid: v.fullyPaid,
    planContracts: v.paymentPlanContracts,
    collected: collectedInPeriod(v),
    depositsCollected: v.depositsCollected,
    balancesCollected: v.balancesCollected,
    legacyCollected: v.legacyContractPaymentsCollected,
    unapplied: v.unapplied,
  }
}

/** Các khoản của hợp đồng 30/70 theo trạng thái (hiện tại). Sáu nhóm rời nhau của backend; "đến hạn" không gồm quá hạn */
export const INSTALLMENT_STATUS_KEYS = ['paid', 'due', 'overdue', 'pending'] as const
export type InstallmentStatusKey = (typeof INSTALLMENT_STATUS_KEYS)[number]

export function installmentsByStatus(v: FinanceOverviewView) {
  return [
    {
      key: 'DEPOSIT',
      label: 'Khoản 30%',
      amount: { paid: v.depositsPaid.amount, due: v.depositsDue.amount, overdue: 0, pending: 0 },
      count: { paid: v.depositsPaid.count, due: v.depositsDue.count, overdue: 0, pending: 0 },
    },
    {
      key: 'BALANCE',
      label: 'Khoản 70%',
      amount: {
        paid: v.balancesPaid.amount,
        due: v.balancesDue.amount,
        overdue: v.balancesOverdue.amount,
        pending: v.balancesPending.amount,
      },
      count: {
        paid: v.balancesPaid.count,
        due: v.balancesDue.count,
        overdue: v.balancesOverdue.count,
        pending: v.balancesPending.count,
      },
    },
  ] satisfies { key: string; label: string; amount: Record<InstallmentStatusKey, number>; count: Record<InstallmentStatusKey, number> }[]
}

/** Tiền đã thu một tháng của xu hướng, theo ba nhóm rời nhau */
export function collectedSplit(v: FinanceOverviewView) {
  return {
    deposit: v.depositsCollected.amount,
    balance: v.balancesCollected.amount,
    legacy: v.legacyContractPaymentsCollected.amount,
  }
}

/** Thứ tự chặng của gói 30/70 (để tô màu đậm dần theo tiến độ) */
export const STAGE_ORDER = ['DRAFT_CREATED', 'DEPOSIT_VERIFIED', 'READY_FOR_INSTALLATION', 'BALANCE_DUE', 'FULLY_PAID'] as const

/** Hồ sơ công nợ đang mở, xếp theo số tiền giảm dần */
export const openCasesRanked = (v: FinanceOverviewView) =>
  [...v.openCollectionCasesByStatus].filter((b) => b.count > 0).sort((a, b) => b.amount - a.amount)
