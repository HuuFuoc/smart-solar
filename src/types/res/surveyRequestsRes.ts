// Viết tay vì swagger không có schema response (tag SurveyRequests)
// Backend trả mọi enum bằng chữ in hoa (PENDING, ROOFTOP); request vẫn gửi số được

/**
 * PENDING (chưa có kỹ thuật viên xác nhận), SCHEDULED, COMPLETED, CANCELLED (khách rút), CLOSED (sales đóng).
 * CANCELLED và CLOSED là trạng thái cuối, không mở lại được
 */
export type SurveyRequestStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'CLOSED' | (string & {})

/** Tên enum InstallationSurfaceType: ROOFTOP, GROUND, CARPORT, FACADE, OTHER */
export type SurfaceTypeName = string

/** Lịch đang hiệu lực của một dòng trong hàng chờ. Hàng chờ chưa ai nhận không có tên kỹ thuật viên */
export type SurveyRequestAppointmentItem = {
  appointmentId: string
  status: AppointmentStatus
  startsAt: string
  endsAt: string
  acceptanceDeadlineAt: string | null
  technicianUserId: string | null
  technicianName: string | null
  /** Đã qua giờ kết thúc mà chưa khảo sát xong */
  isOverdue: boolean
}

export type PendingSurveyRequestItem = {
  surveyRequestId: string
  preSurveyId: string
  customerName: string | null
  propertyName: string | null
  province: string | null
  district: string | null
  ward: string | null
  /** Tên chính thức theo mã phường, xã */
  communeName: string | null
  installationSurfaceType: SurfaceTypeName
  totalAreaM2: number | null
  usableAreaM2: number | null
  /** Format: date-time */
  submittedAt: string
  appointment: SurveyRequestAppointmentItem | null
}

export type MySurveyRequestItem = {
  surveyRequestId: string
  preSurveyId: string
  customerName: string | null
  propertyName: string | null
  province: string | null
  district: string | null
  ward: string | null
  communeName: string | null
  status: SurveyRequestStatus
  /** Format: date-time */
  submittedAt: string
  assignedAt: string | null
  scheduledAt: string | null
  appointment: SurveyRequestAppointmentItem | null
}

export type SurveyRequestDetail = {
  surveyRequestId: string
  preSurveyId: string
  assignedSaleId: string | null
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  propertyName: string | null
  province: string | null
  district: string | null
  ward: string | null
  streetLine: string | null
  latitude: number | null
  longitude: number | null
  installationSurfaceType: SurfaceTypeName
  surfaceMaterial: string | null
  totalAreaM2: number | null
  usableAreaM2: number | null
  tiltDegree: number | null
  azimuthDegree: number | null
  hasObstruction: boolean | null
  status: SurveyRequestStatus
  /** Format: date-time */
  submittedAt: string
  assignedAt: string | null
  scheduledAt: string | null
  salesNote: string | null
  /** Lần mô phỏng khách chọn khi gửi, null nếu chưa chạy mô phỏng */
  selectedSimulation: SelectedSimulationSummary | null
  /** Lịch hẹn đang hiệu lực, null khi chưa đặt giờ hoặc đã huỷ */
  appointment: SurveyAppointmentSummary | null
}

/**
 * Trạng thái lịch hẹn. PENDING_ACCEPTANCE: chờ kỹ thuật viên trong khu vực tự nhận; ESCALATED: quá hạn không ai nhận,
 * chuyển cho sales; ACCEPTED: kỹ thuật viên tự nhận; ASSIGNED: sales / quản lý phân công.
 */
export type AppointmentStatus =
  'PENDING_ACCEPTANCE' | 'ESCALATED' | 'ACCEPTED' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED' | (string & {})

/** Khu vực phục vụ (nhóm phường, xã do admin lập) */
export type ZoneView = {
  zoneId: string
  code: string
  name: string
}

/** Lịch hẹn như sales thấy. Người giữ chỗ chỉ là chỗ trống tạm, chưa phải người nhận việc */
export type SurveyAppointmentSummary = {
  appointmentId: string
  /** Format: date-time (+07:00) */
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  capacityHolderUserId: string | null
  capacityHolderName: string | null
  /** Kỹ thuật viên đã xác nhận (tự nhận hoặc được phân công) */
  assignedTechnicianUserId: string | null
  assignedTechnicianName: string | null
  /** SELF_ACCEPTED, SALES_ASSIGNED, MANAGER_OVERRIDE, ... */
  assignmentSource: string | null
  assignmentReason: string | null
  customerNote: string | null
  bookedAt: string
  /** Hạn để kỹ thuật viên nhận, quá hạn thì chuyển cho sales */
  acceptanceDeadlineAt: string | null
  escalatedAt: string | null
  acceptedAt: string | null
  assignedAt: string | null
  completedAt: string | null
  operationalZoneId: string | null
  revision: number
}

/** POST .../assign-technician và PUT .../reassign-technician (cùng một handler) */
export type AssignmentView = {
  appointmentId: string
  surveyRequestId: string
  technicianUserId: string
  technicianName: string
  startsAt: string
  endsAt: string
  appointmentStatus: AppointmentStatus
  assignmentSource: string | null
  assignmentReason: string | null
  surveyRequestStatus: string
  scheduledAt: string
  reassigned: boolean
  changed: boolean
  revision: number
}

/** PUT .../reschedule. previousAppointmentId là lịch cũ (đã huỷ, giữ làm lịch sử) */
export type SalesRescheduleView = {
  appointmentId: string
  previousAppointmentId: string | null
  surveyRequestId: string
  technicianUserId: string | null
  technicianName: string | null
  startsAt: string
  endsAt: string
  appointmentStatus: AppointmentStatus
  acceptanceStatus: string
  surveyRequestStatus: string
  scheduledAt: string | null
}

/** GET /api/survey-requests/escalated: lịch cần người phân công (không ai nhận kịp) */
export type EscalatedAppointmentView = {
  appointmentId: string
  surveyRequestId: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  acceptanceDeadlineAt: string | null
  escalatedAt: string | null
  revision: number
  zone: ZoneView | null
  customerName: string
  propertyName: string
  province: string
  district: string | null
  ward: string | null
  assignedSaleId: string | null
  ownedByMe: boolean
  hasEligibleTechnician: boolean
}

/** Tóm tắt mô phỏng khách chọn; bản đầy đủ đọc ở GET /api/pre-surveys/{preSurveyId}/simulations/{simulationId}. */
export type SelectedSimulationSummary = {
  simulationId: string
  status: string
  energyStatus: string
  isStale: boolean
  mountingType: string
  productSku: string
  productName: string
  panelCount: number
  installedCapacityKwp: number
  annualEnergyKwh: number | null
  /** Format: date-time */
  createdAt: string
}

export type ClaimSurveyRequestResponse = {
  surveyRequestId: string
}

/** Lý do sales đóng yêu cầu. NOT_FEASIBLE chỉ dùng được khi khảo sát kết luận không lắp được; OTHER phải ghi chú */
export type CloseReasonCode = 'NOT_FEASIBLE' | 'CUSTOMER_DECLINED' | 'NO_RESPONSE' | 'OTHER'

/** POST .../close (sales) và .../withdraw (khách). Báo giá chưa gửi của yêu cầu bị huỷ theo */
export type SalesOutcomeView = {
  surveyRequestId: string
  /** "Cancelled" khi khách rút, "Closed" khi sales đóng */
  status: string
  /** CUSTOMER_WITHDREW hoặc một CloseReasonCode */
  reasonCode: string
  note: string | null
  closedAt: string
  cancelledQuotationIds: string[]
}
