import { SERVICE_REQUEST_KINDS } from '@/common/afterSales'
import { awaitsPayment } from '@/features/after-sales/afterSalesDisplay'
import { isTodo, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { contractStatusMeta } from '@/features/contracts/contractDisplay'
import { isCustomerTodo } from '@/features/contracts/customerContractRules'
import { customerRequestTodo } from '@/features/dispatch/dispatchDisplay'
import { awaitsCustomerDecision } from '@/features/installations/installationDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { ServiceRequestSummary, SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'
import type { QuotationView } from '@/types/res/quotationsRes'

export type TodoKind = 'survey' | 'quotation' | 'contract' | 'project' | 'service' | 'package'

/** Tên nhóm trên tab "Việc cần làm", theo thứ tự khách đi qua */
export const TODO_KINDS: { kind: TodoKind; label: string }[] = [
  { kind: 'survey', label: 'Khảo sát' },
  { kind: 'quotation', label: 'Báo giá' },
  { kind: 'contract', label: 'Hợp đồng' },
  { kind: 'project', label: 'Lắp đặt' },
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

/** Hợp đồng đã ký thì việc còn lại là trả tiền; chờ ký hoặc bản ký bị trả lại thì ký */
const contractAction = (status: string) =>
  status === 'SIGNED' ? { label: 'Thanh toán', icon: 'payments' } : { label: 'Ký hợp đồng', icon: 'draw' }

export type TodoSources = {
  requests: CustomerSurveyRequestView[]
  dispatches: Map<string, CustomerDispatchView>
  /** Mỗi yêu cầu khảo sát chỉ bản báo giá mới nhất */
  quotations: QuotationView[]
  contracts: ContractView[]
  installations: InstallationCustomerView[]
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
  for (const q of s.quotations.filter((q) => q.canAccept))
    items.push({
      key: `quote-${q.quotationId}`,
      kind: 'quotation',
      label: 'Trả lời báo giá',
      detail: q.quoteNumber,
      to: withId(ROUTES.customer.quotation, q.quotationId),
      action: { label: 'Xem báo giá', icon: 'request_quote' },
    })
  for (const c of s.contracts.filter(isCustomerTodo))
    items.push({
      key: `contract-${c.contractId}`,
      kind: 'contract',
      label: contractStatusMeta(c.status, 'customer').label,
      detail: `Hợp đồng ${c.contractNumber}`,
      to: withId(ROUTES.customer.contract, c.contractId),
      action: contractAction(c.status),
    })
  for (const p of s.installations.filter(awaitsCustomerDecision))
    items.push({
      key: `project-${p.projectId}`,
      kind: 'project',
      label: 'Nghiệm thu công trình',
      detail: `Công trình ${shortCode(p.projectId)}`,
      to: withId(ROUTES.customer.project, p.projectId),
      action: { label: 'Nghiệm thu', icon: 'fact_check' },
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
