/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CreatePreSurveyRequest = {
  /** Format: uuid */
  propertySiteId?: string
  /** Format: double */
  totalAreaM2?: number | null
  /** Format: double */
  usableAreaM2?: number | null
  /** Format: double */
  tiltDegree?: number | null
  /** Format: double */
  azimuthDegree?: number | null
  hasObstruction?: boolean | null
}

export type UpdatePreSurveyRequest = {
  /** Format: double */
  totalAreaM2?: number | null
  /** Format: double */
  usableAreaM2?: number | null
  /** Format: double */
  tiltDegree?: number | null
  /** Format: double */
  azimuthDegree?: number | null
  hasObstruction?: boolean | null
}
