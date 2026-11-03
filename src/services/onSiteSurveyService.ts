import type {
  OnSiteSurveyAttachmentRequest,
  OnSiteSurveyRequest,
  OnSiteSurveyRevisionRequest,
} from '@/types/req/technicianOnSiteSurveyReq'
import type { OnSiteSurveyAttachmentUrlView, OnSiteSurveyView } from '@/types/res/technicianOnSiteSurveyRes'
import { del, get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Khảo sát tại công trình. Mỗi yêu cầu khảo sát có một biên bản; kỹ thuật viên ghi theo mã lịch hẹn của mình
// Mọi lệnh ghi trả lại cả biên bản (kèm revision mới)

const tech = ENDPOINTS.technicianOnSiteSurvey
const staff = ENDPOINTS.staffOnSiteSurvey

/** GET: null khi chưa bắt đầu hay lưu lần nào */
export function getMyOnSiteSurvey(appointmentId: string) {
  return get<OnSiteSurveyView | null>(tech.base(appointmentId))
}

/** POST start: ghi giờ bắt đầu tại công trình (sớm nhất ~2 giờ trước giờ hẹn) */
export function startOnSiteSurvey(appointmentId: string) {
  return post<OnSiteSurveyView>(tech.start(appointmentId))
}

/** PUT: ghi đè số đo và danh sách vật cản. `revision` null khi chưa có biên bản */
export function saveOnSiteSurvey(appointmentId: string, body: OnSiteSurveyRequest) {
  return put<OnSiteSurveyView>(tech.base(appointmentId), body)
}

/** POST attachments: gắn tệp ONSITE_SURVEY_EVIDENCE đã xác minh */
export function addOnSiteSurveyAttachment(appointmentId: string, body: OnSiteSurveyAttachmentRequest) {
  return post<OnSiteSurveyView>(tech.attachments(appointmentId), body)
}

export function removeOnSiteSurveyAttachment(appointmentId: string, attachmentId: string) {
  return del<OnSiteSurveyView>(tech.attachment(appointmentId, attachmentId))
}

export function getMyOnSiteSurveyAttachmentUrl(appointmentId: string, attachmentId: string) {
  return get<OnSiteSurveyAttachmentUrlView>(tech.attachmentUrl(appointmentId, attachmentId), {
    params: { disposition: 'inline' },
  })
}

/** POST complete: cần đã bắt đầu, đủ số đo bắt buộc và ít nhất một ảnh mái. Lịch hẹn và yêu cầu chuyển sang xong */
export function completeOnSiteSurvey(appointmentId: string, body: OnSiteSurveyRevisionRequest) {
  return post<OnSiteSurveyView>(tech.complete(appointmentId), body)
}

/** GET cho kinh doanh đang phụ trách yêu cầu, quản lý, quản trị. 404 ONSITE_SURVEY_NOT_FOUND khi chưa có biên bản */
export function getOnSiteSurveyForStaff(surveyRequestId: string) {
  return get<OnSiteSurveyView>(staff.base(surveyRequestId))
}

export function getStaffOnSiteSurveyAttachmentUrl(surveyRequestId: string, attachmentId: string) {
  return get<OnSiteSurveyAttachmentUrlView>(staff.attachmentUrl(surveyRequestId, attachmentId), {
    params: { disposition: 'inline' },
  })
}
