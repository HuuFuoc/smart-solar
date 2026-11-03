/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CancellationDecisionRequest = {
  approve?: boolean
  /** Format: double */
  nonRecoverableAmount?: number
  note?: string | null
}

export type CoverageDecisionRequest = {
  /** Format: uuid */
  itemId?: string
  coverage?: string | null
  reason?: string | null
}

export type CoverageRequest = {
  decisions?: CoverageDecisionRequest[] | null
}

export type DisputeReviewRequest = {
  requireRework?: boolean
  note?: string | null
}

export type ScheduleVisitRequest = {
  /** Format: uuid */
  technicianUserId?: string
  /** Format: date-time */
  startsAt?: string
  /** Format: date-time */
  endsAt?: string | null
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number
  crossZoneAuthorized?: boolean
  companyCaused?: boolean
}
