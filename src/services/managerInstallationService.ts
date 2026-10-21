import type {
  AssignInstallationTechnicianRequest,
  CancelInstallationRequest,
  ChecklistRequest,
  ReturnToReworkRequest,
} from '@/types/req/managerInstallationsReq'
import type {
  HandoverView,
  InstallationCandidateView,
  InstallationEvidenceFileView,
  InstallationEvidenceUrlView,
  InstallationProjectSummary,
  InstallationStaffView,
  InstallationStatus,
  PaidContractSource,
} from '@/types/res/managerInstallationsRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// API thi công của quản lý và quản trị (backend chỉ cho MANAGER, ADMIN)
// Mọi thao tác ghi gửi revision của dự án và trả về chi tiết dự án mới nhất

const api = ENDPOINTS.managerInstallations

/** Hợp đồng đã thanh toán đủ mà chưa có dự án */
export function listReadyContracts() {
  return get<PaidContractSource[]>(api.readyContracts)
}

/** Swagger không khai body nên không gửi gì; mỗi hợp đồng chỉ có một dự án */
export function createProjectFromContract(contractId: string) {
  return post<InstallationStaffView>(api.createFromContract(contractId))
}

/** Không truyền `status` thì lấy mọi trạng thái */
export function listProjects(status?: InstallationStatus) {
  return get<InstallationProjectSummary[]>(api.projects, { params: status ? { status } : undefined })
}

export function getProject(projectId: string) {
  return get<InstallationStaffView>(api.byId(projectId))
}

/** Chỉ xem ai nhận được khoảng thời gian này, không giữ chỗ */
export function listTechnicianCandidates(projectId: string, startsAt: string, endsAt: string) {
  return get<InstallationCandidateView[]>(api.candidates(projectId), { params: { startsAt, endsAt } })
}

/** Phân công, đổi người hoặc đổi lịch; kỹ thuật viên phải nhận lại việc */
export function assignTechnician(projectId: string, body: AssignInstallationTechnicianRequest) {
  return put<InstallationStaffView>(api.assignment(projectId), body)
}

/** `revision` trong body là revision của dự án */
export function updateChecklistItem(projectId: string, itemId: string, body: ChecklistRequest) {
  return put<InstallationStaffView>(api.checklistItem(projectId, itemId), body)
}

export function cancelProject(projectId: string, body: CancelInstallationRequest) {
  return post<InstallationStaffView>(api.cancel(projectId), body)
}

/** Chỉ khi báo cáo hoàn thành đang chờ khách nghiệm thu */
export function returnToRework(projectId: string, body: ReturnToReworkRequest) {
  return post<InstallationStaffView>(api.returnToRework(projectId), body)
}

export function listEvidence(projectId: string) {
  return get<InstallationEvidenceFileView[]>(api.evidence(projectId))
}

/** Link có hạn ngắn: xin ngay trước khi hiện / tải, không lưu lại */
export function getEvidenceUrl(projectId: string, evidenceId: string, disposition: 'inline' | 'attachment') {
  return get<InstallationEvidenceUrlView>(api.evidenceUrl(projectId, evidenceId), { params: { disposition } })
}

/** Chỉ có khi dự án đã hoàn thành (khách đã nghiệm thu) */
export function getHandover(projectId: string) {
  return get<HandoverView>(api.handover(projectId))
}
