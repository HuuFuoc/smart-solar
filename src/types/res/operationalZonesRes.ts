// Viết tay vì swagger không có schema response (tag OperationalZones)

/** GET /api/admin/operational-zones: khu vực phục vụ, mỗi khu là một nhóm phường, xã */
export type OperationalZoneListItem = {
  zoneId: string
  code: string
  name: string
  isActive: boolean
  /** false: tạm ngừng nhận lịch */
  isServiceable: boolean
  responsibleManagerUserId: string | null
  communeCount: number
  memberCount: number
  schedulableMemberCount: number
  hasAvailableTechnician: boolean
  revision: number
  createdAt: string
  updatedAt: string
}

/** Một phường, xã đang thuộc khu (ZoneCommuneView) */
export type ZoneCommuneView = {
  /** 5 chữ số, giữ số 0 ở đầu */
  code: string
  name: string
  /** WARD | COMMUNE | SPECIAL_ZONE */
  unitType: string
  provinceCode: string
  assignedAt: string
}

/** GET /api/admin/operational-zones/{zoneId}, PUT .../communes trả lại bản này */
export type ZoneDetailView = {
  zone: OperationalZoneListItem
  communes: ZoneCommuneView[]
}

/** GET .../{zoneId}/technicians. `isSchedulable`: tài khoản đang hoạt động, có vai trò kỹ thuật viên và đang bật nhận lịch */
export type ZoneTechnicianView = {
  technicianUserId: string
  fullName: string
  isActiveUser: boolean
  isSchedulingActive: boolean
  isSchedulable: boolean
  assignedAt: string
}

export type CoverageCommuneView = {
  code: string
  name: string
  unitType: string
  provinceCode: string
}

/**
 * GET .../coverage?provinceCode=: phường, xã đang có hiệu lực mà chưa thuộc khu nào đang hoạt động, và các khu đang hoạt động
 * chưa có kỹ thuật viên nhận lịch được
 */
export type ZoneCoverageReportView = {
  unmappedCommuneCount: number
  unmappedCommunes: CoverageCommuneView[]
  zonesWithoutSchedulableTechnicians: OperationalZoneListItem[]
}

/** `details` của 409 COMMUNE_ALREADY_MAPPED: phường, xã đang thuộc khu khác đang hoạt động */
export type CommuneMappedDetails = {
  communes: { communeCode: string; zoneId: string; zoneCode: string; zoneName: string }[]
}

/** `details` của 409 COMMUNE_IN_USE: phường, xã sắp gỡ còn lịch khảo sát / công trình chưa xong */
export type CommuneInUseDetails = {
  communes: { communeCode: string; blockingAppointments: number; blockingInstallationProjects: number }[]
  blockingAppointments: number
  blockingInstallationProjects: number
}

/** `details` của 409 ZONE_IN_USE khi tắt khu hoặc tạm ngừng nhận lịch */
export type ZoneInUseDetails = {
  blockingAppointments: number
  blockingInstallationProjects: number
}

/** `details` của 422 ADMINISTRATIVE_LOCATION_UNKNOWN / ADMINISTRATIVE_LOCATION_SUPERSEDED khi gán phường, xã */
export type CommuneCodeProblemDetails = {
  unknownCommuneCodes: string[]
  supersededCommuneCodes: string[]
}
