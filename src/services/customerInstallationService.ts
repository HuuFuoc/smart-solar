import type {
  EnergyMonitoringView,
  EvidenceDisposition,
  HandoverView,
  InstallationCustomerView,
  InstallationEvidenceFileView,
  InstallationEvidenceUrlView,
} from '@/types/res/customerInstallationsRes'
import { get } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Khách theo dõi dự án lắp đặt của mình: tiến độ, ảnh thi công, bàn giao. Nghiệm thu và đồng ý thay thiết bị trong ứng dụng
// đã bỏ (410): quản lý / quản trị nghiệm thu nội bộ
// Dự án của người khác backend trả 404 INSTALLATION_PROJECT_NOT_FOUND (không lộ là có tồn tại)

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
