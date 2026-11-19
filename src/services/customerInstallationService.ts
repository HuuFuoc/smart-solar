import type {
  EnergyMonitoringView,
  EvidenceDisposition,
  HandoverView,
  InstallationCustomerView,
  InstallationEvidenceFileView,
  InstallationEvidenceUrlView,
} from '@/types/res/customerInstallationsRes'
import type { CustomerAcceptanceRequest } from '@/types/req/paymentPlanReq'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Khách theo dõi dự án lắp đặt của mình: tiến độ, ảnh thi công, bàn giao, và nghiệm thu (backend 7d27054 trả lại quyền nghiệm thu
// cho khách; quản lý chỉ còn trả về làm lại). Đồng ý thay thiết bị trong ứng dụng vẫn bỏ (410)
// Dự án của người khác backend trả 404 INSTALLATION_PROJECT_NOT_FOUND (không lộ là có tồn tại)

/**
 * Khách quyết định báo cáo hoàn thành đang chờ: ACCEPT (hợp đồng 30/70 mở khoản 70%, hạn 72 giờ do backend tính), hoặc
 * REQUEST_REWORK / REJECT kèm lý do và ảnh ACCEPTANCE_EVIDENCE. Gửi `revision` của dự án đang xem (lệch thì 409)
 */
export function decideAcceptance(projectId: string, body: CustomerAcceptanceRequest) {
  return post<InstallationCustomerView>(ENDPOINTS.customerAcceptance.decide(projectId), body)
}

/** GET /api/customers/me/installation-projects */
export function listMyProjects() {
  return get<InstallationCustomerView[]>(ENDPOINTS.customerInstallations.base)
}

/** GET /api/customers/me/installation-projects/{projectId} */
export function getMyProject(projectId: string) {
  return get<InstallationCustomerView>(ENDPOINTS.customerInstallations.byId(projectId))
}

/** GET .../evidence: thông tin ảnh, không có địa chỉ lưu trữ */
export function listEvidence(projectId: string) {
  return get<InstallationEvidenceFileView[]>(ENDPOINTS.customerInstallations.evidence(projectId))
}

/** GET .../evidence/{evidenceId}/url: URL ký sẵn sống vài phút, xin ngay trước khi hiện / tải và không lưu lại */
export function getEvidenceUrl(projectId: string, evidenceId: string, disposition: EvidenceDisposition) {
  return get<InstallationEvidenceUrlView>(ENDPOINTS.customerInstallations.evidenceUrl(projectId, evidenceId), {
    params: { disposition },
  })
}

/** Sản lượng dự kiến theo mô phỏng đã chọn, không phải số đo */
export function getEnergyMonitoring(projectId: string) {
  return get<EnergyMonitoringView>(ENDPOINTS.customerInstallations.energyMonitoring(projectId))
}

/** GET .../handover, chỉ khi dự án COMPLETED (trước đó 409 INSTALLATION_NOT_HANDED_OVER) */
export function getHandover(projectId: string) {
  return get<HandoverView>(ENDPOINTS.customerInstallations.handover(projectId))
}
