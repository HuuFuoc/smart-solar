/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type OnSiteSurveyAmendmentRequest = {
  /** Format: int32 */
  revision?: number
  reason?: string | null
  changes?: OnSiteSurveyRequest
  additionalFileIds?: string[] | null
}

export type OnSiteSurveyAttachmentRequest = {
  /** Format: uuid */
  fileId?: string
  category?: string | null
  caption?: string | null
}

export type OnSiteSurveyObstacleRequest = {
  kind?: string | null
  description?: string | null
  /** Format: double */
  heightM?: number | null
  /** Format: double */
  areaM2?: number | null
}

export type OnSiteSurveyRequest = {
  /** Format: int32 */
  revision?: number | null
  roofType?: string | null
  roofMaterial?: string | null
  /** Format: double */
  roofLengthM?: number | null
  /** Format: double */
  roofWidthM?: number | null
  /** Format: double */
  usableAreaM2?: number | null
  /** Format: double */
  tiltDegree?: number | null
  /** Format: double */
  azimuthDegree?: number | null
  roofCondition?: string | null
  electricalCabinetNotes?: string | null
  electricalConnectionNotes?: string | null
  installationFeasibility?: string | null
  proposedInverterLocation?: string | null
  proposedPanelLayoutNotes?: string | null
  /** Format: double */
  measuredLatitude?: number | null
  /** Format: double */
  measuredLongitude?: number | null
  notes?: string | null
  obstacles?: OnSiteSurveyObstacleRequest[] | null
}

export type OnSiteSurveyRevisionRequest = {
  /** Format: int32 */
  revision?: number
}
