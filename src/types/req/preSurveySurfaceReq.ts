/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type SurfaceObstacleRequest = {
  name?: string | null
  /** Format: double */
  xM?: number | null
  /** Format: double */
  yM?: number | null
  /** Format: double */
  widthM?: number | null
  /** Format: double */
  lengthM?: number | null
  /** Format: double */
  heightM?: number | null
}

export type UpdatePreSurveySurfaceRequest = {
  /** Format: int32 */
  expectedRevision?: number | null
  /** Format: double */
  surfaceLengthM?: number | null
  /** Format: double */
  surfaceWidthM?: number | null
  /** Format: double */
  surfaceTiltDegree?: number | null
  /** Format: double */
  surfaceAzimuthDegree?: number | null
  obstacles?: SurfaceObstacleRequest[] | null
}
