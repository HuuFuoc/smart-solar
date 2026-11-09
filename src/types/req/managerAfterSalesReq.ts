/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AssetCorrectionRequest = {
  manufacturer?: string | null
  model?: string | null
  serialNumber?: string | null
  positionCode?: string | null
  specifications?: string | null
  reason?: string | null
}

export type AssignTaskRequest = {
  /** Format: uuid */
  salesUserId?: string
  reason?: string | null
}

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

export type DecisionRequest = {
  approve?: boolean
  reason?: string | null
}

export type DisputeReviewRequest = {
  requireRework?: boolean
  note?: string | null
}

export type DuplicateRequest = {
  /** Format: uuid */
  originalRequestId?: string
  reason?: string | null
}

export type PackageCancellationDecisionRequest = {
  approve?: boolean
  /** Format: double */
  refundAmount?: number | null
  note?: string | null
}

export type RefundDecisionRequest = {
  approve?: boolean
  /** Format: double */
  approvedAmount?: number | null
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

export type StopWorkRequest = {
  reason?: string | null
  /** Format: double */
  refundAmount?: number
}

export type WarrantyActivationRequest = {
  activatedAt?: string | null
  /** Format: uuid */
  evidenceFileId?: string | null
  reason?: string | null
}
