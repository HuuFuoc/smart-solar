/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type IotBindingView = {
  /** Format: uuid */
  bindingId?: string
  /** Format: uuid */
  deviceRecordId?: string
  deviceId?: string | null
  deviceDisplayName?: string | null
  /** Format: uuid */
  projectId?: string
  /** Format: uuid */
  customerUserId?: string
  status?: string | null
  /** Format: date-time */
  boundAt?: string
  /** Format: uuid */
  boundByUserId?: string
  note?: string | null
  /** Format: date-time */
  releasedAt?: string | null
  /** Format: uuid */
  releasedByUserId?: string | null
  releaseReason?: string | null
}

export type IotDeviceCredentialView = {
  device?: IotDeviceView
  secret?: string | null
  /** Format: int32 */
  secretVersion?: number
}

export type IotDeviceView = {
  /** Format: uuid */
  id?: string
  deviceId?: string | null
  displayName?: string | null
  status?: string | null
  sensorModel?: string | null
  /** Format: double */
  maxCurrentAmps?: number
  /** Format: int32 */
  secretVersion?: number
  /** Format: date-time */
  secretRotatedAt?: string
  /** Format: date-time */
  lastSeenAt?: string | null
  connectionStatus?: string | null
  currentBinding?: IotBindingView
  /** Format: date-time */
  disabledAt?: string | null
  disabledReason?: string | null
  /** Format: date-time */
  createdAt?: string
  /** Format: date-time */
  updatedAt?: string
  /** Format: int32 */
  revision?: number
}

export type IotDeviceViewPagedResult = {
  items?: IotDeviceView[] | null
  /** Format: int32 */
  page?: number
  /** Format: int32 */
  pageSize?: number
  /** Format: int32 */
  totalItems?: number
  /** Format: int32 */
  totalPages?: number
}
