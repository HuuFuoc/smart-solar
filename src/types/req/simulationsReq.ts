/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CreateSimulationRequest = {
  /** Format: int32 */
  expectedGeometryVersion?: number | null
  /** Format: uuid */
  productId?: string
  mountingType?: string | null
  /** Format: double */
  panelTiltDegree?: number | null
  /** Format: double */
  panelAzimuthDegree?: number | null
  installation?: InstallationSpacingRequest
  /** Format: double */
  systemLossPercent?: number | null
}

export type InstallationSpacingRequest = {
  /** Format: double */
  panelGapMm?: number | null
  /** Format: double */
  rowGapMm?: number | null
  /** Format: double */
  edgeSetbackMm?: number | null
  /** Format: double */
  obstacleClearanceMm?: number | null
  /** Format: double */
  rackLowEdgeClearanceMm?: number | null
}
