import { SERVICE_REQUEST_KINDS } from '@/common/afterSales'
import { awaitsPayment } from '@/features/after-sales/afterSalesDisplay'
import { isTodo, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { contractStatusMeta } from '@/features/contracts/contractDisplay'
import { isCustomerTodo } from '@/features/contracts/customerContractRules'
import { customerRequestTodo } from '@/features/dispatch/dispatchDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { ServiceRequestSummary, SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'

// Báo giá lắp đặt và nghiệm thu công trình làm tại công trình với kỹ thuật viên / quản lý, không còn là việc của khách
export type TodoKind = 'survey' | 'contract' | 'service' | 'package'

/** Tên nhóm trên tab "Việc cần làm", theo thứ tự khách đi qua */
export const TODO_KINDS: { kind: TodoKind; label: string }[] = [
  { kind: 'survey', label: 'Khảo sát' },
  { kind: 'contract', label: 'Hợp đồng' },
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
  contracts: ContractView[]
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
      label: contractStatusMeta(c.status, 'customer').label,
      detail: `Hợp đồng ${c.contractNumber}`,
      to: withId(ROUTES.customer.contract, c.contractId),
      action: contractAction(c.status),
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
