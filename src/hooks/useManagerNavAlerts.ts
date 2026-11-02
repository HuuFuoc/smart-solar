import { isTodo } from '@/features/after-sales/serviceDisplay'
import { useDispatchQueueQuery } from '@/hooks/useDispatch'
import { technicianReadiness } from '@/features/scheduling/schedulingDisplay'
import { useServiceRequestsQuery } from '@/hooks/useManagerAfterSales'
import { useInstallationProjectsQuery, useReadyContractsQuery } from '@/hooks/useManagerInstallations'
import { useNavAlert } from '@/hooks/useNavAlert'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'
import type { DispatchQueueItemView } from '@/types/res/dispatchRes'
import type { InstallationProjectSummary } from '@/types/res/managerInstallationsRes'

// Số đỏ trên menu của quản lý và quản trị: hợp đồng chưa tạo dự án, dự án chờ phân công, yêu cầu bảo hành chờ xử lý,
// công trình chờ xếp kỹ thuật viên, kỹ thuật viên chưa thuộc khu vực nào, cộng dự án / yêu cầu vừa đổi trạng thái mà chưa xem
const projectAlert = {
  key: (p: InstallationProjectSummary) => p.projectId,
  sig: (p: InstallationProjectSummary) => `${p.status}|${p.technicianAccepted}`,
  todo: (p: InstallationProjectSummary) => p.status === 'PENDING_ASSIGNMENT',
}
const dispatchAlert = {
  key: (d: DispatchQueueItemView) => d.dispatchRequestId,
  sig: (d: DispatchQueueItemView) => `${d.status}|${d.liveProposal?.proposalId ?? ''}`,
  todo: (d: DispatchQueueItemView) => d.status === 'OPEN',
}
const requestAlert = {
  key: (r: ServiceRequestSummary) => r.requestId,
  sig: (r: ServiceRequestSummary) => r.status,
  todo: (r: ServiceRequestSummary) => isTodo(r.status, 'manager'),
}

/** `enabled`: chỉ gọi khi phiên quản lý / quản trị đã khôi phục */
export function useManagerNavAlerts(
  enabled: boolean,
  routes: { installations: string; afterSales: string; dispatch: string },
) {
  const ready = useReadyContractsQuery({ enabled }).data?.length ?? 0
  const projects = useInstallationProjectsQuery(undefined, { enabled }).data
  const projectsAlert = useNavAlert(routes.installations, projects, projectAlert)
  const requestsAlert = useNavAlert(routes.afterSales, useServiceRequestsQuery({ enabled }).data, requestAlert)
  const missingBase = useTechniciansQuery({ enabled }).data?.filter(
    (t) => technicianReadiness(t).tone === 'danger',
  ).length
  const dispatch = useNavAlert(routes.dispatch, useDispatchQueueQuery({ enabled }).data?.items, dispatchAlert)
  return { installations: ready + projectsAlert, afterSales: requestsAlert, dispatch, technicians: missingBase }
}
