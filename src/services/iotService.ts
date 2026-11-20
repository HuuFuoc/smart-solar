import type { DisableIotDeviceRequest, RegisterIotDeviceRequest } from '@/types/req/adminIotDevicesReq'
import type { BindIotDeviceRequest } from '@/types/req/staffIotMonitoringReq'
import type {
  IotBindingView,
  IotDeviceCredentialView,
  IotDevicePage,
  IotDeviceView,
  IotLatestReadingView,
  IotProjectDeviceView,
  IotReadingHistoryView,
} from '@/types/res/iotMonitoringRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Giám sát dòng điện bằng ESP32 + ACS712. Thiết bị tự gửi số đo bằng khoá riêng (X-Device-Key), web không gửi số đo. Secret chỉ
// có trong response lúc đăng ký / đổi key: nơi gọi giữ trong state của hộp thoại, không đưa vào cache, storage hay log

const admin = ENDPOINTS.adminIotDevices
const staff = ENDPOINTS.staffIot

export type IotViewer = 'staff' | 'customer'

export function listDevices(params: { status?: string; search?: string; page: number; pageSize: number }) {
  return get<IotDevicePage>(admin.base, {
    params: { ...params, status: params.status || undefined, search: params.search?.trim() || undefined },
  })
}

export function getDevice(id: string) {
  return get<IotDeviceView>(admin.byId(id))
}

/** 201 kèm `secret` (hiện một lần). Mã thiết bị trùng: 409 IOT_DEVICE_ID_TAKEN */
export function registerDevice(body: RegisterIotDeviceRequest) {
  return post<IotDeviceCredentialView>(admin.base, body)
}

export function disableDevice(id: string, body: DisableIotDeviceRequest) {
  return post<IotDeviceView>(admin.disable(id), body)
}

export function enableDevice(id: string, expectedRevision: number) {
  return post<IotDeviceView>(admin.enable(id), undefined, { params: { expectedRevision } })
}

/** Secret mới, secret cũ mất hiệu lực ngay: thiết bị phải nạp key mới mới gửi được */
export function rotateDeviceKey(id: string, expectedRevision: number) {
  return post<IotDeviceCredentialView>(admin.rotate(id), undefined, { params: { expectedRevision } })
}

/**
 * Gắn thiết bị vào công trình. Công trình đã có thiết bị khác: 409 IOT_PROJECT_ALREADY_BOUND, gửi lại `replaceCurrent: true` để
 * thay. Thiết bị đang ở công trình khác: 409 IOT_DEVICE_ALREADY_BOUND (phải tháo ở đó trước)
 */
export function bindDevice(projectId: string, body: BindIotDeviceRequest) {
  return post<IotBindingView>(staff.bind(projectId), body)
}

export type BindingFilter = { projectId?: string; deviceId?: string; status?: 'ACTIVE' | 'RELEASED' }

/** Lịch sử gắn / tháo, mới nhất trước */
export function listBindings(filter: BindingFilter) {
  return get<IotBindingView[]>(staff.bindings, { params: filter })
}

export function releaseBinding(bindingId: string, reason: string) {
  return post<IotBindingView>(staff.release(bindingId), { reason })
}

const monitoring = (viewer: IotViewer, projectId: string) =>
  viewer === 'staff' ? ENDPOINTS.iotMonitoring.staff(projectId) : ENDPOINTS.iotMonitoring.customer(projectId)

/** 404 IOT_BINDING_NOT_FOUND khi công trình hiện không có thiết bị */
export function getProjectDevice(viewer: IotViewer, projectId: string) {
  return get<IotProjectDeviceView>(`${monitoring(viewer, projectId)}/device`)
}

export function getLatestReading(viewer: IotViewer, projectId: string) {
  return get<IotLatestReadingView>(`${monitoring(viewer, projectId)}/readings/latest`)
}

export type ReadingQuery = { from?: string; to?: string; before?: string; limit: number }

/**
 * Mới nhất trước, gồm mọi thiết bị từng gắn với công trình này (và chỉ công trình này). `before` là `nextBefore` của trang trước
 * (mốc thời gian, không phải số trang); `limit` 1–500
 */
export function getReadings(viewer: IotViewer, projectId: string, query: ReadingQuery) {
  return get<IotReadingHistoryView>(`${monitoring(viewer, projectId)}/readings`, { params: query })
}
