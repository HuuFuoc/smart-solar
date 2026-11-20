import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IOT_DEFAULTS } from '@/common/iot'
import { isFinalReadError, isNoBinding, latestPollMs } from '@/features/iot/iotRules'
import { customerInstallationKeys } from '@/hooks/useCustomerInstallations'
import { managerInstallationKeys } from '@/hooks/useManagerInstallations'
import { isApiError, type ApiError } from '@/services/api/errors'
import * as iot from '@/services/iotService'
import type { IotViewer, ReadingQuery } from '@/services/iotService'
import type { DisableIotDeviceRequest, RegisterIotDeviceRequest } from '@/types/req/adminIotDevicesReq'
import type {
  IotBindingView,
  IotDeviceCredentialView,
  IotDevicePage,
  IotDeviceView,
  IotLatestReadingView,
  IotProjectDeviceView,
  IotReadingHistoryView,
} from '@/types/res/iotMonitoringRes'

// Giám sát IoT. Khoá cache có vai trò (khách / nhân viên) và mã công trình để đổi công trình không bao giờ hiện số của công trình
// khác. Mọi đọc IoT chung hạn mức 60 lần / phút / người nên không tự tải lại khi quay lại tab; chỉ số đo mới nhất hỏi lại theo nhịp
// thiết bị gửi, và ngừng khi tab ẩn (mặc định của react-query), khi rời trang, khi không còn thiết bị đang gắn

export const iotKeys = {
  all: ['iot'] as const,
  devices: (params: object) => [...iotKeys.all, 'devices', params] as const,
  device: (id: string) => [...iotKeys.all, 'device', id] as const,
  bindings: (projectId: string) => [...iotKeys.all, 'bindings', projectId] as const,
  project: (viewer: IotViewer, projectId: string) => [...iotKeys.all, viewer, projectId] as const,
  projectDevice: (viewer: IotViewer, projectId: string) => [...iotKeys.project(viewer, projectId), 'device'] as const,
  latest: (viewer: IotViewer, projectId: string) => [...iotKeys.project(viewer, projectId), 'latest'] as const,
  history: (viewer: IotViewer, projectId: string, range: { from?: string; to?: string }) =>
    [...iotKeys.project(viewer, projectId), 'history', range.from ?? '', range.to ?? ''] as const,
}

/** Thử lại tối đa một lần với lỗi mạng / 5xx; lỗi 4xx (kể cả 429) không thử lại để không dồn request */
const retryRead = (count: number, error: ApiError) => !isFinalReadError(error.status) && count < 1

/** 404 IOT_BINDING_NOT_FOUND là trạng thái "chưa gắn thiết bị", không phải lỗi */
async function orNoBinding<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load()
  } catch (e) {
    if (isApiError(e) && isNoBinding(e.code)) return null
    throw e
  }
}

// ---------- Quản trị: sổ thiết bị ----------

export type DeviceListParams = { status: string; search: string; page: number; pageSize: number }

/** Sổ thiết bị chỉ quản trị đọc được: nơi khác truyền `enabled` theo vai trò để không bị 403 */
export function useIotDevicesQuery(params: DeviceListParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<IotDevicePage, ApiError>({
    queryKey: iotKeys.devices(params),
    queryFn: () => iot.listDevices(params),
    enabled,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: retryRead,
  })
}

export function useIotDeviceQuery(id: string | null) {
  return useQuery<IotDeviceView, ApiError>({
    queryKey: iotKeys.device(id ?? ''),
    queryFn: () => iot.getDevice(id!),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
    retry: retryRead,
  })
}

const isCredential = (r: IotDeviceView | IotDeviceCredentialView): r is IotDeviceCredentialView => 'secret' in r

function useDeviceWrite<V, R extends IotDeviceView | IotDeviceCredentialView>(write: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation<R, ApiError, V>({
    mutationFn: write,
    // Response đổi key / đăng ký có secret: không giữ trong cache của mutation sau khi hộp thoại đóng
    gcTime: 0,
    onSuccess: (result) => {
      const view: IotDeviceView | IotDeviceCredentialView = result
      const device = isCredential(view) ? view.device : view
      queryClient.setQueryData(iotKeys.device(device.id), device)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...iotKeys.all, 'devices'] }),
  })
}

export function useRegisterIotDeviceMutation() {
  return useDeviceWrite((body: RegisterIotDeviceRequest) => iot.registerDevice(body))
}

export function useDisableIotDeviceMutation() {
  return useDeviceWrite(({ id, body }: { id: string; body: DisableIotDeviceRequest }) => iot.disableDevice(id, body))
}

export function useEnableIotDeviceMutation() {
  return useDeviceWrite(({ id, revision }: { id: string; revision: number }) => iot.enableDevice(id, revision))
}

export function useRotateIotKeyMutation() {
  return useDeviceWrite(({ id, revision }: { id: string; revision: number }) => iot.rotateDeviceKey(id, revision))
}

// ---------- Quản lý / quản trị: gắn, tháo ----------

export function useIotBindingsQuery(projectId: string) {
  return useQuery<IotBindingView[], ApiError>({
    queryKey: iotKeys.bindings(projectId),
    queryFn: () => iot.listBindings({ projectId }),
    enabled: Boolean(projectId),
    refetchOnWindowFocus: false,
    retry: retryRead,
  })
}

/** Gắn / tháo xong: tải lại thiết bị, số đo, lịch sử gắn, khối energy-monitoring và sổ thiết bị của công trình đó */
function useAfterBindingWrite(projectId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: iotKeys.bindings(projectId) }),
      queryClient.invalidateQueries({ queryKey: iotKeys.project('staff', projectId) }),
      queryClient.invalidateQueries({ queryKey: managerInstallationKeys.energy(projectId) }),
      queryClient.invalidateQueries({ queryKey: [...iotKeys.all, 'devices'] }),
    ])
}

export function useBindIotDeviceMutation(projectId: string) {
  const after = useAfterBindingWrite(projectId)
  return useMutation<IotBindingView, ApiError, { deviceId: string; note: string | null; replaceCurrent: boolean }>({
    mutationFn: (body) => iot.bindDevice(projectId, body),
    onSettled: after,
  })
}

export function useReleaseIotBindingMutation(projectId: string) {
  const after = useAfterBindingWrite(projectId)
  return useMutation<IotBindingView, ApiError, { bindingId: string; reason: string }>({
    mutationFn: ({ bindingId, reason }) => iot.releaseBinding(bindingId, reason),
    onSettled: after,
  })
}

// ---------- Số đo của một công trình (khách và nhân viên, khác đường dẫn) ----------

/** Thiết bị đang gắn; null khi công trình không có thiết bị */
export function useProjectIotDeviceQuery(viewer: IotViewer, projectId: string) {
  return useQuery<IotProjectDeviceView | null, ApiError>({
    queryKey: iotKeys.projectDevice(viewer, projectId),
    queryFn: () => orNoBinding(() => iot.getProjectDevice(viewer, projectId)),
    enabled: Boolean(projectId),
    refetchOnWindowFocus: false,
    retry: retryRead,
  })
}

/**
 * Số đo mới nhất, hỏi lại theo nhịp gửi của thiết bị khi đang xem (`active`). Ngừng hỏi khi không có thiết bị, thiết bị bị khoá,
 * hoặc gặp lỗi 4xx (gồm 429: người dùng bấm "Thử lại" sau khi hết thời gian chờ)
 */
export function useLatestIotReadingQuery(
  viewer: IotViewer,
  projectId: string,
  { active, reportIntervalSeconds }: { active: boolean; reportIntervalSeconds?: number },
) {
  return useQuery<IotLatestReadingView | null, ApiError>({
    queryKey: iotKeys.latest(viewer, projectId),
    queryFn: () => orNoBinding(() => iot.getLatestReading(viewer, projectId)),
    enabled: active && Boolean(projectId),
    refetchOnWindowFocus: false,
    retry: retryRead,
    refetchInterval: (query) => {
      if (query.state.status === 'error' && isFinalReadError(query.state.error?.status)) return false
      const data = query.state.data
      if (data === null) return false
      return latestPollMs(data?.connectionStatus, reportIntervalSeconds ?? IOT_DEFAULTS.reportIntervalSeconds)
    },
  })
}

/**
 * Lịch sử số đo theo trang con trỏ: trang sau gửi `before = nextBefore` của trang trước. Không tự tải lại; "Làm mới" đặt lại về
 * trang đầu để không tải lại mọi trang đã mở
 */
export function useIotHistoryQuery(viewer: IotViewer, projectId: string, range: { from?: string; to?: string }) {
  return useInfiniteQuery<IotReadingHistoryView, ApiError>({
    queryKey: iotKeys.history(viewer, projectId, range),
    queryFn: ({ pageParam }) =>
      iot.getReadings(viewer, projectId, {
        ...range,
        before: (pageParam as string | undefined) || undefined,
        limit: IOT_DEFAULTS.historyPageSize,
      } satisfies ReadingQuery),
    initialPageParam: '',
    getNextPageParam: (last) => (last.hasMore && last.nextBefore ? last.nextBefore : undefined),
    enabled: Boolean(projectId),
    refetchOnWindowFocus: false,
    retry: retryRead,
  })
}

export function useResetIotHistory(viewer: IotViewer, projectId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.resetQueries({ queryKey: [...iotKeys.project(viewer, projectId), 'history'] })
}

/** Khách: tải lại khối energy-monitoring cùng số đo (ví dụ khi bấm làm mới) */
export function useRefreshCustomerEnergy(projectId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: customerInstallationKeys.energy(projectId) })
}
