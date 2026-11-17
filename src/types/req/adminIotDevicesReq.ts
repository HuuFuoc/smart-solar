/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type DisableIotDeviceRequest = {
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}

export type RegisterIotDeviceRequest = {
  deviceId?: string | null
  displayName?: string | null
  sensorModel?: string | null
  /** Format: double */
  maxCurrentAmps?: number | null
}
