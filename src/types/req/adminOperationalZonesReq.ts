/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CreateZoneRequest = {
  code?: string | null
  name?: string | null
  isActive?: boolean
  isServiceable?: boolean
  /** Format: uuid */
  responsibleManagerUserId?: string | null
}

export type SetZoneCommunesRequest = {
  communeCodes?: string[] | null
  reason?: string | null
  /** Format: int32 */
  revision?: number
}

export type UpdateZoneRequest = {
  name?: string | null
  isActive?: boolean | null
  isServiceable?: boolean | null
  /** Format: uuid */
  responsibleManagerUserId?: string | null
  /** Format: int32 */
  revision?: number
}
