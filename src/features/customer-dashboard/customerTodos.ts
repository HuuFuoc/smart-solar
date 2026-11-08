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

export type TodoItem = { key: string; label: string; detail: string; to: string }

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
    items.push({
      key: `request-${r.surveyRequestId}`,
      label: dispatch?.status === 'PROPOSAL_PENDING' ? 'Trả lời giờ khảo sát đề xuất' : 'Chọn giờ khảo sát',
      detail: r.propertyName,
      to: withId(ROUTES.customer.request, r.surveyRequestId),
    })
  }
  for (const q of s.quotations.filter((q) => q.canAccept))
    items.push({
      key: `quote-${q.quotationId}`,
      label: 'Trả lời báo giá',
      detail: q.quoteNumber,
      to: withId(ROUTES.customer.quotation, q.quotationId),
    })
  for (const c of s.contracts.filter(isCustomerTodo))
    items.push({
      key: `contract-${c.contractId}`,
      label: contractStatusMeta(c.status, 'customer').label,
      detail: `Hợp đồng ${c.contractNumber}`,
      to: withId(ROUTES.customer.contract, c.contractId),
    })
  for (const p of s.installations.filter(awaitsCustomerDecision))
    items.push({
      key: `project-${p.projectId}`,
      label: 'Nghiệm thu công trình',
      detail: `Công trình ${shortCode(p.projectId)}`,
      to: withId(ROUTES.customer.project, p.projectId),
    })
  for (const r of s.serviceRequests.filter((r) => isTodo(r.status, 'customer')))
    items.push({
      key: `service-${r.requestId}`,
      label: requestStatusMeta(r.status, 'customer').label,
      detail: `${SERVICE_REQUEST_KINDS[r.kind] ?? r.kind} ${r.requestNumber}`,
      to: withId(ROUTES.customer.afterSalesRequest, r.requestId),
    })
  for (const sub of s.subscriptions.filter(awaitsPayment))
    items.push({
      key: `sub-${sub.subscriptionId}`,
      label: 'Thanh toán gói',
      detail: sub.packageName,
      to: ROUTES.customer.packages,
    })
  return items
}
