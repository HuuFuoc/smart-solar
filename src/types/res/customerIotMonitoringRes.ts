/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type IotLatestReadingView = {
  connectionStatus?: string | null
  reading?: IotReadingView
}

export type IotProjectDeviceView = {
  /** Format: uuid */
  bindingId?: string
  deviceId?: string | null
  displayName?: string | null
  sensorModel?: string | null
  /** Format: double */
  maxCurrentAmps?: number
  deviceStatus?: string | null
  connectionStatus?: string | null
  /** Format: date-time */
  boundAt?: string
  /** Format: date-time */
  lastReadingAt?: string | null
  /** Format: int32 */
  offlineAfterSeconds?: number
  /** Format: int32 */
  expectedReportIntervalSeconds?: number
}

export type IotReadingHistoryView = {
  items?: IotReadingView[] | null
  /** Format: int32 */
  limit?: number
  hasMore?: boolean
  /** Format: date-time */
  nextBefore?: string | null
  /** Format: date-time */
  from?: string | null
  /** Format: date-time */
  to?: string | null
}

export type IotReadingView = {
  /** Format: uuid */
  readingId?: string
  deviceId?: string | null
  /** Format: date-time */
  receivedAt?: string
  /** Format: double */
  currentAmps?: number
}
