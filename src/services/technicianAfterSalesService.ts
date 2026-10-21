import type {
  AbsenceRequest,
  InspectionReportRequest,
  VisitResponseRequest,
  WorkReportRequest,
} from '@/types/req/technicianAfterSalesReq'
import type { EvidenceRequest } from '@/types/req/technicianInstallationsReq'
import type { ServiceEvidenceUrlView } from '@/types/res/customerAfterSalesRes'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Buổi hẹn bảo hành, sửa chữa, bảo trì giao cho kỹ thuật viên đang đăng nhập. Mọi thao tác ghi trả về buổi hẹn mới nhất

const api = ENDPOINTS.technicianAfterSales

export function listVisits() {
  return get<TechnicianVisitView[]>(api.visits)
}

export function getVisit(visitId: string) {
  return get<TechnicianVisitView>(api.visit(visitId))
}

/** Nhận việc, hoặc từ chối kèm lý do (quản lý xếp người khác) */
export function respond(visitId: string, body: VisitResponseRequest) {
  return post<TechnicianVisitView>(api.respond(visitId), body)
}

/** Bắt đầu sớm nhất 2 giờ trước giờ hẹn; báo giá có tiền phải được khách trả trước */
export function start(visitId: string) {
  return post<TechnicianVisitView>(api.start(visitId))
}

/** Gắn một ảnh đã tải lên và VERIFIED (mục đích SERVICE_EVIDENCE) vào buổi hẹn đang mở; mỗi ảnh gắn một lần */
export function addEvidence(visitId: string, body: EvidenceRequest) {
  return post<TechnicianVisitView>(api.evidence(visitId), body)
}

/** Link xem ảnh ký sẵn, hết hạn sau vài phút */
export function getEvidenceUrl(visitId: string, evidenceId: string) {
  return get<ServiceEvidenceUrlView>(api.evidenceUrl(visitId, evidenceId), { params: { disposition: 'inline' } })
}

/** Kết quả buổi kiểm tra: không lỗi, hoặc danh sách hạng mục hỏng. Cần ít nhất một ảnh của buổi này */
export function reportInspection(visitId: string, body: InspectionReportRequest) {
  return post<TechnicianVisitView>(api.inspection(visitId), body)
}

/** Kết quả buổi sửa, bảo trì, làm lại. Cần ít nhất một ảnh của buổi này */
export function reportWork(visitId: string, body: WorkReportRequest) {
  return post<TechnicianVisitView>(api.workReport(visitId), body)
}

/** Khách vắng hoặc không làm được: không tính tiền, quản lý hẹn lại */
export function reportAbsence(visitId: string, body: AbsenceRequest) {
  return post<TechnicianVisitView>(api.absence(visitId), body)
}
