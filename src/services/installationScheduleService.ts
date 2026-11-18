import type { InstallationScheduleRequest } from '@/types/req/technicianInstallationSchedulesReq'
import type {
  InstallationScheduleView,
  InstallationSlotAvailabilityView,
  TechnicianScheduleContractView,
} from '@/types/res/installationSchedulesRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Lịch thi công đã thống nhất trực tiếp với khách. Kỹ thuật viên khảo sát ghi ngày khi hợp đồng đã có và đã trả tiền (hoặc đã ký
// với hợp đồng cũ): PLANNED, không giữ chỗ. Hợp đồng thành PAID (đã trả và đã ký) thì backend tự tạo dự án thi công và xác nhận
// lịch (CONFIRMED) hoặc báo phải hẹn lại (RESCHEDULE_REQUIRED). FE không tự đổi trạng thái lịch. Gửi khung cho khách chọn đã bỏ

const tech = ENDPOINTS.technicianInstallationSchedules
const customer = ENDPOINTS.customerInstallationSchedules
const manager = ENDPOINTS.managerInstallationSchedules

/** Hợp đồng của công trình mình khảo sát hẹn được ngày (đã trả tiền hoặc đã ký), kèm lịch đang hiệu lực */
export function listTechnicianSchedules() {
  return get<TechnicianScheduleContractView[]>(tech.base)
}

/** Lịch sử lịch của một hợp đồng, mới nhất trước; hợp đồng của kỹ thuật viên khác thì 404 */
export function getTechnicianContractSchedule(contractId: string) {
  return get<InstallationScheduleView[]>(tech.byContract(contractId))
}

/**
 * Ghi hoặc đổi ngày đã thống nhất. Ghi chú khách đồng ý bắt buộc; đổi lịch đang có thì bắt buộc lý do và gửi `expectedRevision`
 * của lịch đó. Gửi lại đúng lịch cũ thì backend trả lại lịch đó, không tạo lịch mới
 */
export function proposeTechnicianSchedule(contractId: string, body: InstallationScheduleRequest) {
  return post<InstallationScheduleView>(tech.byContract(contractId), body)
}

/** Huỷ lịch PLANNED / RESCHEDULE_REQUIRED của mình, lý do bắt buộc. Lịch đã xác nhận thì quản lý xử lý trên dự án thi công */
export function cancelTechnicianSchedule(scheduleId: string, reason: string) {
  return post<InstallationScheduleView>(tech.cancel(scheduleId), { reason })
}

/** Khung trống để chọn ngày, mỗi ngày bắt đầu trong [from, to] (≤ 31 ngày) một khung kéo dài `durationDays` ngày làm việc */
export function getTechnicianAvailability(contractId: string, from: string, to: string, durationDays: number) {
  return get<InstallationSlotAvailabilityView[]>(tech.availability(contractId), {
    params: { from, to, durationDays },
  })
}

/** Lịch đang hiệu lực của khách (mỗi hợp đồng nhiều nhất một) */
export function listCustomerSchedules() {
  return get<InstallationScheduleView[]>(customer.base)
}

/** Lịch sử lịch của một hợp đồng của khách, mới nhất trước */
export function getCustomerContractSchedule(contractId: string) {
  return get<InstallationScheduleView[]>(customer.byContract(contractId))
}

/** Khách xin ngày khác (ghi chú bắt buộc). Lịch giữ nguyên trạng thái tới khi kỹ thuật viên ghi ngày mới */
export function requestScheduleChange(scheduleId: string, note: string) {
  return post<InstallationScheduleView>(customer.changeRequest(scheduleId), { note })
}

/** Mọi lịch, lọc theo trạng thái (null = mọi trạng thái), mới nhất trước */
export function listStaffSchedules(status: string | null) {
  return get<InstallationScheduleView[]>(manager.base, { params: status ? { status } : undefined })
}

export function getStaffContractSchedule(contractId: string) {
  return get<InstallationScheduleView[]>(manager.byContract(contractId))
}

/** Ghi lịch cho một kỹ thuật viên khác (kỹ thuật viên khảo sát không làm được); cùng luật kiểm tra như của kỹ thuật viên */
export function proposeStaffSchedule(contractId: string, body: InstallationScheduleRequest) {
  return post<InstallationScheduleView>(manager.byContract(contractId), body)
}

/** Xác nhận lại lịch PLANNED của hợp đồng đã thanh toán (backend tự thử lại mỗi phút; gọi nhiều lần vẫn một kết quả) */
export function confirmStaffSchedule(contractId: string) {
  return post<InstallationScheduleView | null>(manager.confirm(contractId))
}

export function cancelStaffSchedule(scheduleId: string, reason: string) {
  return post<InstallationScheduleView>(manager.cancel(scheduleId), { reason })
}
