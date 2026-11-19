// Viết tay vì swagger của tag TechnicianInstallationSchedules, CustomerInstallationSchedules, ManagerInstallationSchedules
// chỉ khai "200 OK". Theo record C# của backend `main` (462733c): Modules.Installations.InstallationScheduleHandlers
// (InstallationScheduleView, TechnicianScheduleContractView). Giờ trả về theo giờ Việt Nam (+07:00)

/**
 * PLANNED: kỹ thuật viên đã ghi ngày thống nhất với khách, chưa xác nhận và không giữ chỗ; CONFIRMED: hợp đồng đã thanh toán và
 * ngày đó đã thành lịch thi công; RESCHEDULE_REQUIRED: không xác nhận được, phải hẹn ngày khác; CANCELLED: đã huỷ (giữ lịch sử)
 */
export type InstallationScheduleStatus = 'PLANNED' | 'CONFIRMED' | 'RESCHEDULE_REQUIRED' | 'CANCELLED' | (string & {})

/** Vì sao phải hẹn lại: TECHNICIAN_UNAVAILABLE | INVALID_SCHEDULE | COVERAGE_CHANGED | PROJECT_NOT_ASSIGNABLE */
export type InstallationRescheduleReason = string

/**
 * Một lịch thi công. `isConfirmed` chỉ true khi CONFIRMED: PLANNED không bao giờ hiện như đã xác nhận. `awaitingPayment`: PLANNED
 * của hợp đồng cũ chưa thanh toán; `awaitingContractSignature`: PLANNED của hợp đồng đã nhận tiền (30/70: đã nhận 30%), chờ hợp đồng
 * ký xong (30/70: chốt đủ trang hợp đồng giấy; hợp đồng trả trước cũ: duyệt bản ký).
 * `revision` gửi làm `expectedRevision` khi đổi lịch đang hiệu lực
 */
export type InstallationScheduleView = {
  scheduleId: string
  contractId: string
  contractNumber: string
  contractStatus: string
  surveyRequestId: string
  propertySiteId: string
  propertyName: string
  technicianUserId: string
  technicianName: string
  startsAt: string
  endsAt: string
  status: InstallationScheduleStatus
  isConfirmed: boolean
  /** Khách đồng ý thế nào, lúc nào (kỹ thuật viên ghi) */
  customerAgreementNote: string
  /** Lý do đổi so với lịch trước */
  changeReason: string | null
  projectId: string | null
  /** Trạng thái dự án thi công, khác trạng thái lịch */
  projectStatus: string | null
  confirmedAt: string | null
  rescheduleReasonCode: InstallationRescheduleReason | null
  /** Câu gốc của backend (tiếng Anh, có khi kèm mã lỗi): không hiện nguyên văn */
  rescheduleDetail: string | null
  customerChangeRequestedAt: string | null
  customerChangeRequestNote: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  createdAt: string
  revision: number
  awaitingPayment: boolean
  awaitingContractSignature: boolean
}

/**
 * GET /api/technicians/me/installation-schedules: hợp đồng mình đã khảo sát hẹn được ngày (đã ký / đã thanh toán, kể cả hợp đồng
 * lập từ báo giá đã trả tiền mà chưa ký), kèm lịch đang hiệu lực
 */
export type TechnicianScheduleContractView = {
  contractId: string
  contractNumber: string
  contractStatus: string
  propertyName: string
  customerName: string
  /** Null khi chưa ghi lịch nào */
  schedule: InstallationScheduleView | null
}

/** Khung thi công kỹ thuật viên có thể đề xuất (backend 8f70cb2, InstallationSlotAvailabilityView); `reason` là câu / mã gốc */
export type InstallationSlotAvailabilityView = {
  /** Ngày bắt đầu, yyyy-MM-dd theo giờ Việt Nam */
  date: string
  startsAt: string
  endsAt: string
  available: boolean
  reason: string | null
}
