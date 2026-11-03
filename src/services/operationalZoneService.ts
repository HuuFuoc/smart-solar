import type { CreateZoneRequest, SetZoneCommunesRequest, UpdateZoneRequest } from '@/types/req/adminOperationalZonesReq'
import type {
  OperationalZoneListItem,
  ZoneCoverageReportView,
  ZoneDetailView,
  ZoneTechnicianView,
} from '@/types/res/operationalZonesRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Khu vực phục vụ: mỗi khu là một nhóm phường, xã; một phường, xã thuộc tối đa một khu đang hoạt động.
// Đọc: ADMIN, MANAGER. Ghi: chỉ ADMIN (backend kiểm cả vai trò hiện tại của tài khoản). Mọi lệnh sửa gửi `revision`.
// Danh sách khu dùng chung với form khu vực của kỹ thuật viên (technicianAdminService.listOperationalZones)

const api = ENDPOINTS.operationalZones

export function getZone(zoneId: string) {
  return get<ZoneDetailView>(api.byId(zoneId))
}

/** 201. Mã khu được viết hoa và không đổi được sau khi tạo */
export function createZone(body: CreateZoneRequest) {
  return post<OperationalZoneListItem>(api.base, body)
}

/** Tên bắt buộc gửi lại; `responsibleManagerUserId` ghi đè (null là bỏ người phụ trách); cờ null là giữ nguyên */
export function updateZone(zoneId: string, body: UpdateZoneRequest) {
  return put<OperationalZoneListItem>(api.byId(zoneId), body)
}

/** Thay cả danh sách: mã có mà chưa thuộc khu thì thêm, mã đang thuộc khu mà không gửi thì gỡ */
export function setZoneCommunes(zoneId: string, body: SetZoneCommunesRequest) {
  return put<ZoneDetailView>(api.communes(zoneId), body)
}

export function listZoneTechnicians(zoneId: string) {
  return get<ZoneTechnicianView[]>(api.technicians(zoneId))
}

export function getZoneCoverage(provinceCode: string) {
  return get<ZoneCoverageReportView>(api.coverage, { params: { provinceCode } })
}
