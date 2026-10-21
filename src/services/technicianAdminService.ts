import type {
  AddUnavailablePeriodRequest,
  SetTechnicianZonesRequest,
  SetWorkingScheduleRequest,
  UpsertTechnicianProfileRequest,
} from '@/types/req/adminTechniciansReq'
import type { OperationalZoneListItem } from '@/types/res/operationalZonesRes'
import type { TechnicianProfileView, UnavailablePeriodView, WorkingScheduleView } from '@/types/res/adminTechniciansRes'
import type { TechnicianScheduleView } from '@/types/res/technicianAppointmentsRes'
import { get, post, put, del } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Cấu hình lịch của kỹ thuật viên (ADMIN, MANAGER). Đụng lịch đã có thì trả 409 TECHNICIAN_HAS_CONFLICTING_APPOINTMENTS

/** Mọi tài khoản có vai trò kỹ thuật viên, kể cả chưa có hồ sơ lịch */
export function listTechnicians() {
  return get<TechnicianProfileView[]>(ENDPOINTS.adminTechnicians.base)
}

/** Bật / tắt nhận lịch và số lịch tối đa mỗi ngày */
export function upsertTechnicianProfile(id: string, body: UpsertTechnicianProfileRequest) {
  return put<TechnicianProfileView>(ENDPOINTS.adminTechnicians.profile(id), body)
}

/** Thay cả danh sách khu vực phục vụ của kỹ thuật viên ([] là bỏ hết) */
export function setTechnicianZones(id: string, body: SetTechnicianZonesRequest) {
  return put<unknown>(ENDPOINTS.adminTechnicians.zones(id), body)
}

/** Mọi khu vực phục vụ (ADMIN, MANAGER) */
export function listOperationalZones() {
  return get<OperationalZoneListItem[]>(ENDPOINTS.operationalZones.base)
}

/** GET .../working-schedule */
export function getWorkingSchedule(id: string) {
  return get<WorkingScheduleView>(ENDPOINTS.adminTechnicians.workingSchedule(id))
}

/** Thay cả tuần, hoặc useDefault=true để dùng giờ chung */
export function setWorkingSchedule(id: string, body: SetWorkingScheduleRequest) {
  return put<WorkingScheduleView>(ENDPOINTS.adminTechnicians.workingSchedule(id), body)
}

/** GET .../unavailable-periods, chỉ các khoảng nghỉ chưa kết thúc */
export function listUnavailablePeriods(id: string) {
  return get<UnavailablePeriodView[]>(ENDPOINTS.adminTechnicians.unavailablePeriods(id))
}

/** POST .../unavailable-periods (201) */
export function addUnavailablePeriod(id: string, body: AddUnavailablePeriodRequest) {
  return post<UnavailablePeriodView>(ENDPOINTS.adminTechnicians.unavailablePeriods(id), body)
}

/** DELETE .../unavailable-periods/{periodId} (204) */
export function removeUnavailablePeriod(id: string, periodId: string) {
  return del<void>(ENDPOINTS.adminTechnicians.unavailablePeriod(id, periodId))
}

/** GET /api/technicians/{id}/schedule?date=YYYY-MM-DD (MANAGER, ADMIN) */
export function getTechnicianSchedule(id: string, date: string) {
  return get<TechnicianScheduleView>(ENDPOINTS.technicianSchedule.schedule(id), { params: { date } })
}
