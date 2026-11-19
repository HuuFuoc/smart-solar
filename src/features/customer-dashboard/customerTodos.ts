import { SERVICE_REQUEST_KINDS } from '@/common/afterSales'
import { awaitsPayment } from '@/features/after-sales/afterSalesDisplay'
import { isTodo, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { contractStatusMeta } from '@/features/contracts/contractDisplay'
import { isCustomerTodo } from '@/features/contracts/customerContractRules'
import { customerRequestTodo } from '@/features/dispatch/dispatchDisplay'
import { stageMeta } from '@/features/payment-plan/paymentPlanDisplay'
import { customerPlanTodo } from '@/features/payment-plan/paymentPlanRules'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { ServiceRequestSummary, SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'

// Báo giá lắp đặt chốt tại công trình với kỹ thuật viên, không phải việc của khách. Nghiệm thu công trình là việc của khách (backend
// 7d27054): kỹ thuật viên báo hoàn thành thì khách nghiệm thu hoặc yêu cầu làm lại trong ứng dụng
export type TodoKind = 'survey' | 'contract' | 'installation' | 'service' | 'package'

/** Tên nhóm trên tab "Việc cần làm", theo thứ tự khách đi qua */
export const TODO_KINDS: { kind: TodoKind; label: string }[] = [
  { kind: 'survey', label: 'Khảo sát' },
  { kind: 'contract', label: 'Hợp đồng' },
  { kind: 'installation', label: 'Nghiệm thu' },
  { kind: 'service', label: 'Bảo hành, sửa chữa' },
  { kind: 'package', label: 'Gói dịch vụ' },
]

/** `action`: chữ và icon của nút trên dòng, gọi đúng việc khách sẽ làm ở trang được mở */
export type TodoItem = {
  key: string
  kind: TodoKind
  label: string
  detail: string
  to: string
  action: { label: string; icon: string }
}

/**
 * Hợp đồng 30/70: trả 30% (bản nháp) hoặc trả 70% (sau nghiệm thu). Hợp đồng cũ: đã ký thì việc còn lại là trả tiền; chờ ký hoặc bản
 * ký bị trả lại thì ký
 */
function contractTodo(c: ContractView) {
  if (c.paymentPlan) {
    const todo = customerPlanTodo(c.paymentPlan.stage)
    return {
      label: stageMeta(c.paymentPlan.stage, 'customer').label,
      action: { label: todo === 'pay-balance' ? 'Trả 70%' : 'Trả 30%', icon: 'payments' },
    }
  }
  return {
    label: contractStatusMeta(c.status, 'customer').label,
    action: c.status === 'SIGNED' ? { label: 'Thanh toán', icon: 'payments' } : { label: 'Ký hợp đồng', icon: 'draw' },
  }
}

/** Kỹ thuật viên đã báo hoàn thành, đang chờ khách nghiệm thu */
export const awaitsCustomerAcceptance = (p: Pick<InstallationCustomerView, 'status'>) =>
  p.status === 'PENDING_CUSTOMER_ACCEPTANCE'

export type TodoSources = {
  requests: CustomerSurveyRequestView[]
  dispatches: Map<string, CustomerDispatchView>
  contracts: ContractView[]
  projects: InstallationCustomerView[]
  serviceRequests: ServiceRequestSummary[]
  subscriptions: SubscriptionView[]
}

// Việc đang chờ khách, cùng điều kiện với số đỏ trên menu (customer-layout) để hai nơi luôn khớp nhau
export function customerTodos(s: TodoSources): TodoItem[] {
  const items: TodoItem[] = []
  for (const r of s.requests) {
    const dispatch = s.dispatches.get(r.surveyRequestId)
    if (!customerRequestTodo(r, dispatch)) continue
    const proposal = dispatch?.status === 'PROPOSAL_PENDING'
    items.push({
      key: `request-${r.surveyRequestId}`,
      kind: 'survey',
      label: proposal ? 'Trả lời giờ khảo sát đề xuất' : 'Chọn giờ khảo sát',
      detail: r.propertyName,
      to: withId(ROUTES.customer.request, r.surveyRequestId),
      action: proposal ? { label: 'Trả lời', icon: 'event_available' } : { label: 'Chọn giờ', icon: 'calendar_month' },
    })
  }
  for (const c of s.contracts.filter(isCustomerTodo))
    items.push({
      key: `contract-${c.contractId}`,
      kind: 'contract',
      ...contractTodo(c),
      detail: `Hợp đồng ${c.contractNumber}`,
      to: withId(ROUTES.customer.contract, c.contractId),
    })
  for (const p of s.projects.filter(awaitsCustomerAcceptance))
    items.push({
      key: `project-${p.projectId}`,
      kind: 'installation',
      label: 'Nghiệm thu công trình',
      detail: `Công trình ${shortCode(p.projectId)}, kỹ thuật viên đã báo hoàn thành`,
      to: withId(ROUTES.customer.project, p.projectId),
      action: { label: 'Nghiệm thu', icon: 'verified' },
    })
  for (const r of s.serviceRequests.filter((r) => isTodo(r.status, 'customer')))
    items.push({
      key: `service-${r.requestId}`,
      kind: 'service',
      label: requestStatusMeta(r.status, 'customer').label,
      detail: `${SERVICE_REQUEST_KINDS[r.kind] ?? r.kind} ${r.requestNumber}`,
      to: withId(ROUTES.customer.afterSalesRequest, r.requestId),
      action: { label: 'Xử lý', icon: 'visibility' },
    })
  for (const sub of s.subscriptions.filter(awaitsPayment))
    items.push({
      key: `sub-${sub.subscriptionId}`,
      kind: 'package',
      label: 'Thanh toán gói',
      detail: sub.packageName,
      to: ROUTES.customer.packages,
      action: { label: 'Thanh toán', icon: 'payments' },
    })
  return items
}
