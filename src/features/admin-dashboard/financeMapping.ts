import type { FinanceOverviewView, MoneyBucket } from '@/types/res/paymentPlanRes'
import { FINANCE_COMPONENT_LABELS, FINANCE_COMPONENT_ORDER } from '../../common/servicePackages.ts'
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
  ] satisfies {
    key: string
    label: string
    amount: Record<InstallmentStatusKey, number>
    count: Record<InstallmentStatusKey, number>
  }[]
}

/** Tiền đã thu một tháng của xu hướng, theo ba nhóm rời nhau */
export function collectedSplit(v: FinanceOverviewView) {
  return {
    deposit: v.depositsCollected.amount,
    balance: v.balancesCollected.amount,
    legacy: v.legacyContractPaymentsCollected.amount,
  }
}

export type ComponentRow = { key: string; label: string; count: number; amount: number; retail: boolean }

/**
 * Tiền đã thu trong kỳ theo thành phần (backend 763cb0b, `collectedByComponent`). Đọc nguyên số backend, không cộng thêm tiền gói
 * vào khoản đã thu: gói đi kèm nằm trong chính các khoản 30% / 70%, nên lắp đặt + gói đi kèm = khoản 30% và 70% đã thu; gói mua riêng
 * là tiền riêng (trả 100% trước). null khi máy chủ chưa trả mục này
 */
export function collectedComponents(v: Pick<FinanceOverviewView, 'collectedByComponent'>) {
  if (!Array.isArray(v.collectedByComponent)) return null
  const byKey = new Map(v.collectedByComponent.map((b) => [b.key, b]))
  const known = new Set<string>(FINANCE_COMPONENT_ORDER)
  const keys = [...FINANCE_COMPONENT_ORDER, ...v.collectedByComponent.map((b) => b.key).filter((k) => !known.has(k))]
  const rows: ComponentRow[] = keys.map((key) => ({
    key,
    label: FINANCE_COMPONENT_LABELS[key] ?? key,
    count: byKey.get(key)?.count ?? 0,
    amount: byKey.get(key)?.amount ?? 0,
    retail: key.startsWith('RETAIL_'),
  }))
  const sum = (list: ComponentRow[]) => list.reduce((s, r) => s + r.amount, 0)
  return {
    rows,
    /** Lắp đặt + gói đi kèm: phải bằng khoản 30% + 70% đã thu trong kỳ */
    installments: sum(rows.filter((r) => !r.retail)),
    retail: sum(rows.filter((r) => r.retail)),
  }
}

/** Thứ tự chặng của gói 30/70 (để tô màu đậm dần theo tiến độ) */
export const STAGE_ORDER = [
  'DRAFT_CREATED',
  'DEPOSIT_VERIFIED',
  'READY_FOR_INSTALLATION',
  'BALANCE_DUE',
  'FULLY_PAID',
] as const

/** Hồ sơ công nợ đang mở, xếp theo số tiền giảm dần */
export const openCasesRanked = (v: FinanceOverviewView) =>
  [...v.openCollectionCasesByStatus].filter((b) => b.count > 0).sort((a, b) => b.amount - a.amount)
