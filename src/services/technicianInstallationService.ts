import type {
  AcceptAssignmentRequest,
  AssetsRequest,
  CompletionReportRequest,
  DeclineAssignmentRequest,
  EvidenceRequest,
} from '@/types/req/technicianInstallationsReq'
import type {
  EvidenceDisposition,
  InstallationEvidenceFileView,
  InstallationEvidenceUrlView,
} from '@/types/res/customerInstallationsRes'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Công trình lắp đặt của kỹ thuật viên phụ trách. Mọi thao tác trả về view mới của công trình
// Chỉ kỹ thuật viên của phân công đang hiệu lực mới làm được; người khác nhận 404 INSTALLATION_PROJECT_NOT_FOUND

const { technicianInstallations: api } = ENDPOINTS

/** Công trình đang được giao, đã nhận hoặc đã hoàn thành */
export function listMyInstallations() {
  return get<InstallationTechnicianView[]>(api.base)
}

export function getMyInstallation(projectId: string) {
  return get<InstallationTechnicianView>(api.byId(projectId))
}

/** Phân công PENDING → ACCEPTED. Đã qua khung giờ được giao thì 409 INSTALLATION_INVALID_STATE */
export function acceptInstallation(projectId: string, body: AcceptAssignmentRequest) {
  return post<InstallationTechnicianView>(api.accept(projectId), body)
}

/** Lý do bắt buộc (tối đa 500 ký tự), quản lý thấy lý do. Việc đã nhận thì không từ chối được */
export function declineInstallation(projectId: string, body: DeclineAssignmentRequest) {
  return post<InstallationTechnicianView>(api.decline(projectId), body)
}

/** SCHEDULED → IN_PROGRESS. Swagger không khai body nên không gửi gì */
export function startInstallation(projectId: string) {
  return post<InstallationTechnicianView>(api.start(projectId))
}

// Gắn ảnh đã VERIFIED do chính kỹ thuật viên tải lên (uploadFile, mục đích INSTALLATION_EVIDENCE). Chỉ khi đang thi công
// hoặc sửa lại; mỗi tệp gắn một lần (409 FILE_ALREADY_LINKED). Backend cắt chú thích quá 300 ký tự
export function addInstallationEvidence(projectId: string, body: EvidenceRequest) {
  return post<InstallationTechnicianView>(api.evidence(projectId), body)
}

/** Thông tin ảnh thi công, không có vị trí lưu trữ */
export function listInstallationEvidence(projectId: string) {
  return get<InstallationEvidenceFileView[]>(api.evidence(projectId))
}

/** URL ký sẵn cho một ảnh, sống ngắn: xin khi sắp hiện ảnh, không lưu, không ghi log */
export function getInstallationEvidenceUrl(projectId: string, evidenceId: string, disposition: EvidenceDisposition) {
  return get<InstallationEvidenceUrlView>(api.evidenceUrl(projectId, evidenceId), { params: { disposition } })
}

/** 1 đến 500 thiết bị một lần. Serial trùng (cùng hãng) thì 409 INSTALLATION_DUPLICATE_SERIAL */
export function registerInstallationAssets(projectId: string, body: AssetsRequest) {
  return post<InstallationTechnicianView>(api.assets(projectId), body)
}

/** IN_PROGRESS / REWORK_REQUIRED → PENDING_CUSTOMER_ACCEPTANCE. Cần ảnh của lượt hiện tại, tấm pin và inverter */
export function reportInstallationCompletion(projectId: string, body: CompletionReportRequest) {
  return post<InstallationTechnicianView>(api.completionReport(projectId), body)
}
