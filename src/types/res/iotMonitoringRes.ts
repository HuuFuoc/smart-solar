// Viết tay vì các file sinh từ swagger (adminIotDevicesRes, customerIotMonitoringRes) để mọi trường là tuỳ chọn. Theo record C# của
// backend `main` 7d27054: Modules.IotMonitoring.IotViews. Thời gian là chuỗi ISO-8601 có múi giờ. Không có view nào chứa secret trừ
// IotDeviceCredentialView (chỉ có trong response đăng ký / đổi key)

/** ACTIVE | DISABLED (quản trị khoá) */
export type IotDeviceStatus = 'ACTIVE' | 'DISABLED' | (string & {})

/** Tính từ dấu thời gian lúc đọc: DISABLED > UNASSIGNED > NO_DATA > ONLINE / OFFLINE */
export type IotConnectionStatus = 'ONLINE' | 'OFFLINE' | 'NO_DATA' | 'UNASSIGNED' | 'DISABLED' | (string & {})

/** ACTIVE | RELEASED. Tháo hay thay thiết bị không xoá binding, chỉ chuyển RELEASED kèm lý do */
export type IotBindingStatus = 'ACTIVE' | 'RELEASED' | (string & {})

/** `deviceId` là mã firmware gửi (vd. ESP32-001); `deviceRecordId` là id dòng trong sổ thiết bị (GUID) */
export type IotBindingView = {
  bindingId: string
  deviceRecordId: string
  deviceId: string
  deviceDisplayName: string
  projectId: string
  customerUserId: string
  status: IotBindingStatus
  boundAt: string
  boundByUserId: string
  note: string | null
  releasedAt: string | null
  releasedByUserId: string | null
  releaseReason: string | null
}

/** Sổ thiết bị của quản trị. `id` là GUID dùng cho khoá / mở khoá / đổi key; `deviceId` là mã firmware */
export type IotDeviceView = {
  id: string
  deviceId: string
  displayName: string
  status: IotDeviceStatus
  sensorModel: string | null
  maxCurrentAmps: number
  secretVersion: number
  secretRotatedAt: string
  lastSeenAt: string | null
  connectionStatus: IotConnectionStatus
  currentBinding: IotBindingView | null
  disabledAt: string | null
  disabledReason: string | null
  createdAt: string
  updatedAt: string
  revision: number
}

/** Chỉ có ở response đăng ký / đổi key: lần duy nhất secret rời server. Không đưa vào cache, storage hay log */
export type IotDeviceCredentialView = {
  device: IotDeviceView
  secret: string
  secretVersion: number
}

/** GET /api/admin/iot/devices (PagedResult) */
export type IotDevicePage = {
  items: IotDeviceView[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/** Thiết bị đang gắn với một công trình, như khách (hoặc nhân viên đọc công trình) thấy: không có dữ liệu khoá */
export type IotProjectDeviceView = {
  bindingId: string
  deviceId: string
  displayName: string
  sensorModel: string | null
  maxCurrentAmps: number
  deviceStatus: IotDeviceStatus
  connectionStatus: IotConnectionStatus
  boundAt: string
  lastReadingAt: string | null
  offlineAfterSeconds: number
  expectedReportIntervalSeconds: number
}

/** `currentAmps` giữ nguyên dấu như cảm biến đo (âm khi kẹp ngược chiều); không suy ra chiều dòng điện */
export type IotReadingView = {
  readingId: string
  deviceId: string
  receivedAt: string
  currentAmps: number
}

/** `reading` null khi chưa có số đo, và luôn null khi thiết bị DISABLED */
export type IotLatestReadingView = {
  connectionStatus: IotConnectionStatus
  reading: IotReadingView | null
}

/** Mới nhất trước; `nextBefore` là con trỏ thời gian (không phải số trang) gửi lại làm `before` để lấy trang cũ hơn */
export type IotReadingHistoryView = {
  items: IotReadingView[]
  limit: number
  hasMore: boolean
  nextBefore: string | null
  from: string | null
  to: string | null
}

/** MEASURED: phần cứng đo được; NOT_AVAILABLE: không đo (value luôn null, không bao giờ là 0) */
export type IotMeasurementStatus = 'MEASURED' | 'NOT_AVAILABLE' | (string & {})

export type IotMeasuredQuantityView = {
  status: IotMeasurementStatus
  value: number | null
  unit: string
}

/** Khối `measured` của energy-monitoring. Bản V1 chỉ đo dòng điện (A); công suất, điện năng, mua / bán điện là NOT_AVAILABLE */
export type IotMeasuredMonitoringView = {
  source: string
  device: IotProjectDeviceView
  latest: IotReadingView | null
  currentAmps: IotMeasuredQuantityView
  powerWatts: IotMeasuredQuantityView
  energyProducedKwh: IotMeasuredQuantityView
  energyImportedKwh: IotMeasuredQuantityView
  energyExportedKwh: IotMeasuredQuantityView
  /** Câu tiếng Anh của backend: không hiện nguyên văn */
  notice: string
}
