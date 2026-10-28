import { isTodo } from '@/features/after-sales/serviceDisplay'
import { technicianReadiness } from '@/features/scheduling/schedulingDisplay'
import { useServiceRequestsQuery } from '@/hooks/useManagerAfterSales'
import { useInstallationProjectsQuery, useReadyContractsQuery } from '@/hooks/useManagerInstallations'
import { useNavAlert } from '@/hooks/useNavAlert'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'
import type { InstallationProjectSummary } from '@/types/res/managerInstallationsRes'

// Số đỏ trên menu của quản lý và quản trị: hợp đồng chưa tạo dự án, dự án chờ phân công, yêu cầu bảo hành chờ xử lý,
// kỹ thuật viên chưa thuộc khu vực nào, cộng dự án / yêu cầu vừa đổi trạng thái mà chưa xem
const projectAlert = {
  key: (p: InstallationProjectSummary) => p.projectId,
  sig: (p: InstallationProjectSummary) => `${p.status}|${p.technicianAccepted}`,
  todo: (p: InstallationProjectSummary) => p.status === 'PENDING_ASSIGNMENT',
}
const requestAlert = {
  key: (r: ServiceRequestSummary) => r.requestId,
  sig: (r: ServiceRequestSummary) => r.status,
  todo: (r: ServiceRequestSummary) => isTodo(r.status, 'manager'),
}

/** `enabled`: chỉ gọi khi phiên quản lý / quản trị đã khôi phục */
export function useManagerNavAlerts(enabled: boolean, routes: { installations: string; afterSales: string }) {
  const ready = useReadyContractsQuery({ enabled }).data?.length ?? 0
  const projects = useInstallationProjectsQuery(undefined, { enabled }).data
  const projectsAlert = useNavAlert(routes.installations, projects, projectAlert)
  const requestsAlert = useNavAlert(routes.afterSales, useServiceRequestsQuery({ enabled }).data, requestAlert)
  const missingBase = useTechniciansQuery({ enabled }).data?.filter(
    (t) => technicianReadiness(t).tone === 'danger',
  ).length
  return { installations: ready + projectsAlert, afterSales: requestsAlert, technicians: missingBase }
}
