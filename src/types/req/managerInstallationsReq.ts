/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AssignInstallationTechnicianRequest = {
  /** Format: uuid */
  technicianUserId?: string
  /** Format: date-time */
  scheduledStartsAt?: string | null
  /** Format: date-time */
  scheduledEndsAt?: string | null
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
  crossZoneAuthorized?: boolean | null
}

export type CancelInstallationRequest = {
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}

export type ChecklistRequest = {
  /** Format: int32 */
  revision?: number
  isRequired?: boolean
  status?: string | null
  /** Format: uuid */
  evidenceFileId?: string | null
  note?: string | null
}

export type ReturnToReworkRequest = {
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}
