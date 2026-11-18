/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type InstallationScheduleReasonRequest = {
  reason?: string | null
}

export type InstallationScheduleRequest = {
  /** Format: date-time */
  startsAt?: string | null
  /** Format: date-time */
  endsAt?: string | null
  customerAgreementNote?: string | null
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
  /** Format: uuid */
  technicianUserId?: string | null
}

export type InstallationSlotOffersRequest = {
  slots?: InstallationSlotRequest[] | null
  note?: string | null
}

export type InstallationSlotRequest = {
  /** Format: date-time */
  startsAt?: string | null
  /** Format: date-time */
  endsAt?: string | null
}
