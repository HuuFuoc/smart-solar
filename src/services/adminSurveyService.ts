import type { AssignTechnicianRequest, SalesRescheduleRequest } from '@/types/req/surveyRequestsReq'
import type { SetSalesOwnerRequest } from '@/types/req/adminSurveyRequestsReq'
import type { AssignmentView, SalesOwnerView, SalesRescheduleView } from '@/types/res/surveyRequestsRes'
import { post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Quản lý / quản trị can thiệp lịch khảo sát mà không cần là kinh doanh phụ trách (MANAGER, ADMIN). Phân công và đổi kinh
// doanh bắt buộc lý do ≤ 500; đổi giờ chỉ bắt buộc lý do khi lịch đã qua giờ.
// Người được chọn lấy từ nguồn thật: kỹ thuật viên từ GET /technicians/availability, kinh doanh từ danh sách tài khoản

const api = ENDPOINTS.adminSurvey

/** Phân công thẳng kỹ thuật viên cho lịch đang có; gửi `expectedRevision` của lịch lấy từ availability để không ghi đè */
export function overrideSurveyTechnician(appointmentId: string, body: AssignTechnicianRequest) {
  return post<AssignmentView>(api.assignTechnician(appointmentId), body)
}

/** Đổi nhân viên kinh doanh phụ trách yêu cầu. Trường là `saleUserId` (khác `salesUserId` của API giao việc sau bán) */
export function setSurveySalesOwner(surveyRequestId: string, body: SetSalesOwnerRequest) {
  return put<SalesOwnerView>(api.salesOwner(surveyRequestId), body)
}

/** Đổi giờ lịch khảo sát đang có, kể cả lịch đã qua giờ mà chưa khảo sát. Cùng luật với nút đổi giờ của kinh doanh */
export function rescheduleSurvey(surveyRequestId: string, body: SalesRescheduleRequest) {
  return put<SalesRescheduleView>(api.reschedule(surveyRequestId), body)
}
