import { useMemo, type ReactNode } from 'react'
import { Outlet } from 'react-router'
import { CustomerShell } from '@/components/layout/customer-shell'
import { useAuth } from '@/context/AuthProvider'
import { awaitsPayment } from '@/features/after-sales/afterSalesDisplay'
import { isTodo } from '@/features/after-sales/serviceDisplay'
import { isCustomerTodo } from '@/features/contracts/customerContractRules'
import { awaitsCustomerAcceptance } from '@/features/customer-dashboard/customerTodos'
import { customerRequestTodo } from '@/features/dispatch/dispatchDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { useMyServiceRequestsQuery, useNotificationsQuery } from '@/hooks/useCustomerServiceRequests'
import { useMyDispatchesQuery } from '@/hooks/useDispatch'
import { useNavAlert } from '@/hooks/useNavAlert'
import { ROUTES } from '@/routes/paths'
import type { ServiceRequestSummary, SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'

// Số đỏ cạnh menu: việc chờ khách (đặt giờ khảo sát, ký / trả từng khoản hợp đồng, nghiệm thu công trình, duyệt báo giá sửa chữa do
// kinh doanh lập, thanh toán gói) và mục có thay đổi khách chưa xem (kỹ thuật viên nhận lịch, công trình được xếp lịch...)
type RequestItem = { request: CustomerSurveyRequestView; dispatch: CustomerDispatchView | undefined }
const requestAlert = {
  key: ({ request: r }: RequestItem) => r.surveyRequestId,
  // Phần điều phối chỉ thêm khi có, để dấu "đã xem" của yêu cầu không nhờ xếp kỹ thuật viên vẫn giữ nguyên
  sig: ({ request: r, dispatch: d }: RequestItem) => {
    const base = [r.status, r.appointment?.appointmentId, r.appointment?.status, r.appointment?.acceptanceStatus]
    return (d ? [...base, d.status, d.liveProposal?.proposalId] : base).join('|')
  },
  // Đặt giờ hoặc trả lời giờ Smart Solar đề xuất; đang chờ nhân viên xếp người thì không tính
  todo: ({ request, dispatch }: RequestItem) => customerRequestTodo(request, dispatch),
}
const projectAlert = {
  key: (p: InstallationCustomerView) => p.projectId,
  sig: (p: InstallationCustomerView) => [p.status, p.scheduledStartsAt, p.technicianName].join('|'),
  // Kỹ thuật viên báo hoàn thành: khách nghiệm thu hoặc yêu cầu làm lại (backend 7d27054)
  todo: awaitsCustomerAcceptance,
}
const serviceAlert = {
  key: (r: ServiceRequestSummary) => r.requestId,
  sig: (r: ServiceRequestSummary) => r.status,
  todo: (r: ServiceRequestSummary) => isTodo(r.status, 'customer'),
}
const contractAlert = {
  key: (c: ContractView) => c.contractId,
  // Hợp đồng 30/70 đổi chặng (vd. khoản 70% đến hạn) mà trạng thái hợp đồng vẫn là SIGNED
  sig: (c: ContractView) => [c.status, c.paymentPlan?.stage].join('|'),
  todo: isCustomerTodo,
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
  const requestRows = useMyRequestsQuery({ enabled }).data
  const { dispatches, pending } = useMyDispatchesQuery(requestRows, { enabled })
  const requestItems = useMemo(
    () =>
      requestRows && !pending
        ? requestRows.map((request) => ({ request, dispatch: dispatches.get(request.surveyRequestId) }))
        : undefined,
    [requestRows, dispatches, pending],
  )
  const requests = useNavAlert(ROUTES.customer.requests, requestItems, requestAlert)
  const projects = useNavAlert(ROUTES.customer.projects, useMyInstallationsQuery({ enabled }).data, projectAlert)
  const services = useNavAlert(ROUTES.customer.afterSales, useMyServiceRequestsQuery({ enabled }).data, serviceAlert)
  const packages = useNavAlert(ROUTES.customer.packages, useSubscriptionsQuery({ enabled }).data, subscriptionAlert)
  const contracts = useNavAlert(ROUTES.customer.contracts, useMyContractsQuery({ enabled }).data, contractAlert)
  // Số chưa đọc theo `readAt` lưu trên server, không theo dấu "đã xem" trên trình duyệt
  const notifications = useNotificationsQuery({ enabled }).data?.filter((n) => !n.readAt).length
  return (
    <CustomerShell
      badges={{
        [ROUTES.customer.requests]: { value: requests, attention: true },
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
