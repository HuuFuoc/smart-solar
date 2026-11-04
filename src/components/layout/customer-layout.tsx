import { useMemo, type ReactNode } from 'react'
import { Outlet } from 'react-router'
import { CustomerShell } from '@/components/layout/customer-shell'
import { useAuth } from '@/context/AuthProvider'
import { awaitsPayment } from '@/features/after-sales/afterSalesDisplay'
import { isTodo } from '@/features/after-sales/serviceDisplay'
import { isCustomerTodo } from '@/features/contracts/customerContractRules'
import { awaitsCustomerDecision } from '@/features/installations/installationDisplay'
import { latestPerRequest } from '@/features/quotations/quotationDisplay'
import { canBook } from '@/features/scheduling/schedulingDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { useMyQuotationsQuery } from '@/hooks/useCustomerQuotations'
import { useMyServiceRequestsQuery, useNotificationsQuery } from '@/hooks/useCustomerServiceRequests'
import { useNavAlert } from '@/hooks/useNavAlert'
import { ROUTES } from '@/routes/paths'
import type { NotificationView, ServiceRequestSummary, SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { QuotationView } from '@/types/res/quotationsRes'

// Số đỏ cạnh menu: việc chờ khách (đặt giờ khảo sát, trả lời báo giá, nghiệm thu, duyệt báo giá sửa chữa, thanh toán gói)
// và mục có thay đổi khách chưa xem (kỹ thuật viên nhận lịch, công trình được xếp lịch...)
const requestAlert = {
  key: (r: CustomerSurveyRequestView) => r.surveyRequestId,
  sig: (r: CustomerSurveyRequestView) =>
    [r.status, r.appointment?.appointmentId, r.appointment?.status, r.appointment?.acceptanceStatus].join('|'),
  todo: canBook,
}
// Mỗi yêu cầu chỉ tính bản báo giá mới nhất
const quotationAlert = {
  key: (q: QuotationView) => q.surveyRequestId,
  sig: (q: QuotationView) => `${q.quotationId}|${q.status}`,
  todo: (q: QuotationView) => q.canAccept,
}
const projectAlert = {
  key: (p: InstallationCustomerView) => p.projectId,
  sig: (p: InstallationCustomerView) => [p.status, p.scheduledStartsAt, p.technicianName].join('|'),
  todo: awaitsCustomerDecision,
}
const serviceAlert = {
  key: (r: ServiceRequestSummary) => r.requestId,
  sig: (r: ServiceRequestSummary) => r.status,
  todo: (r: ServiceRequestSummary) => isTodo(r.status, 'customer'),
}
const contractAlert = {
  key: (c: ContractView) => c.contractId,
  sig: (c: ContractView) => c.status,
  todo: isCustomerTodo,
}
// Thông báo mới kể từ lần xem trước trên trình duyệt này (backend chưa có lệnh đánh dấu đã đọc)
const notificationAlert = {
  key: (n: NotificationView) => n.notificationId,
  sig: () => '',
}
const subscriptionAlert = {
  key: (s: SubscriptionView) => s.subscriptionId,
  sig: (s: SubscriptionView) => s.status,
  todo: awaitsPayment,
}

// Khách hàng dùng khung riêng (customer-shell), không dùng rail của nhân viên
export function CustomerLayout({ children }: { children?: ReactNode }) {
  // Layout còn là khung chờ trước RequireRole: chỉ gọi khi phiên khách hàng đã khôi phục xong
  const enabled = useAuth().user?.role === 'customer'
  const quotations = useMyQuotationsQuery({ enabled }).data
  const latestQuotations = useMemo(() => quotations && latestPerRequest(quotations), [quotations])
  const requests = useNavAlert(ROUTES.customer.requests, useMyRequestsQuery({ enabled }).data, requestAlert)
  const quotes = useNavAlert(ROUTES.customer.quotations, latestQuotations, quotationAlert)
  const projects = useNavAlert(ROUTES.customer.projects, useMyInstallationsQuery({ enabled }).data, projectAlert)
  const services = useNavAlert(ROUTES.customer.afterSales, useMyServiceRequestsQuery({ enabled }).data, serviceAlert)
  const packages = useNavAlert(ROUTES.customer.packages, useSubscriptionsQuery({ enabled }).data, subscriptionAlert)
  const contracts = useNavAlert(ROUTES.customer.contracts, useMyContractsQuery({ enabled }).data, contractAlert)
  const notifications = useNavAlert(
    ROUTES.customer.notifications,
    useNotificationsQuery({ enabled }).data,
    notificationAlert,
  )
  return (
    <CustomerShell
      badges={{
        [ROUTES.customer.requests]: { value: requests, attention: true },
        [ROUTES.customer.quotations]: { value: quotes, attention: true },
        [ROUTES.customer.projects]: { value: projects, attention: true },
        [ROUTES.customer.afterSales]: { value: services, attention: true },
        [ROUTES.customer.packages]: { value: packages, attention: true },
        [ROUTES.customer.contracts]: { value: contracts, attention: true },
        // Cùng sự việc đã báo đỏ ở mục của nó nên số thông báo là xám
        [ROUTES.customer.notifications]: { value: notifications },
      }}
    >
      {children ?? <Outlet />}
    </CustomerShell>
  )
}
