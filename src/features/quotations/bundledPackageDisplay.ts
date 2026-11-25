import { bundledKindLabel } from '@/features/after-sales/servicePackageDisplay'
import {
  issuePackageProblems,
  quotationPackages,
  type IssuePackageProblem,
} from '@/features/quotations/bundledPackageRules'
import { quotationErrorMessage } from '@/features/quotations/quotationDisplay'
import { isApiError } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Câu của gói dịch vụ đi kèm trên giỏ báo giá kỹ thuật viên: lý do chưa chọn được gói, gói chặn việc chốt báo giá

/** Lý do chưa chọn / đổi gói được (xem bundledPackageRules.panelQuantityProblem) */
export function panelProblemText(problem: 'none' | 'fractional' | null) {
  if (problem === 'fractional')
    return 'Số lượng tấm pin phải là số nguyên để chọn gói dịch vụ. Sửa số lượng các dòng tấm pin.'
  if (problem === 'none') return 'Thêm tấm pin vào báo giá để chọn gói dịch vụ: giá gói tính theo số tấm pin.'
  return null
}

const PROBLEM_TEXT: Record<string, string> = {
  QUOTATION_SERVICE_PACKAGE_INACTIVE: 'gói đã ngừng bán',
  QUOTATION_SERVICE_PACKAGE_INCOMPATIBLE: 'gói không còn tính theo tấm pin hoặc không đúng loại',
  QUOTATION_SERVICE_PACKAGE_NOT_FOUND: 'gói không còn trong danh mục',
}

/** "Gói bảo trì "Bảo trì cơ bản": gói đã ngừng bán" */
export function issueProblemText(p: IssuePackageProblem, q: Pick<QuotationView, 'servicePackages'>) {
  const name = quotationPackages(q).find((x) => x.packageId === p.packageId || x.kind === p.kind)?.packageName
  const what = (p.code && PROBLEM_TEXT[p.code]) ?? 'gói không còn bán được'
  return `${bundledKindLabel(p.kind)}${name ? ` "${name}"` : ''}: ${what}`
}

/** Loại gói bị chặn khi chốt báo giá, để tô đỏ đúng dòng gói */
export const blockedKindsOf = (error: unknown) =>
  isApiError(error) ? issuePackageProblems(error.details).map((p) => p.kind) : []

/**
 * Câu lỗi của lệnh chốt báo giá: gói đi kèm chặn thì kể từng gói và việc phải làm, không gộp thành một câu chung. Lỗi khác dùng câu
 * của giỏ báo giá
 */
export function issueErrorMessage(error: unknown, q: Pick<QuotationView, 'servicePackages'>) {
  const problems = isApiError(error) ? issuePackageProblems(error.details) : []
  if (problems.length === 0) return quotationErrorMessage(error)
  const list = problems.map((p) => issueProblemText(p, q)).join('; ')
  return `Chưa chốt được báo giá vì gói dịch vụ đi kèm không còn bán được: ${list}. Bỏ hoặc đổi gói đó rồi chốt lại.`
}
