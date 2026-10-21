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
