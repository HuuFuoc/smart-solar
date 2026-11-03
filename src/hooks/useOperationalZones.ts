import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as zoneService from '@/services/operationalZoneService'
import type { ApiError } from '@/services/api/errors'
import { technicianAdminKeys } from '@/hooks/useTechnicianAdmin'
import type { CreateZoneRequest, SetZoneCommunesRequest, UpdateZoneRequest } from '@/types/req/adminOperationalZonesReq'
import type {
  OperationalZoneListItem,
  ZoneCoverageReportView,
  ZoneDetailView,
  ZoneTechnicianView,
} from '@/types/res/operationalZonesRes'

// Khu vực phục vụ. Danh sách khu dùng chung khoá với form khu vực của kỹ thuật viên (useOperationalZonesQuery).
// Không tự gửi lại khi 409: tải lại rồi để người dùng làm lại

export const zoneKeys = {
  all: ['operational-zones'] as const,
  detail: (zoneId: string) => [...zoneKeys.all, 'detail', zoneId] as const,
  technicians: (zoneId: string) => [...zoneKeys.all, 'technicians', zoneId] as const,
  coverage: (provinceCode: string) => [...zoneKeys.all, 'coverage', provinceCode] as const,
}

export function useZoneQuery(zoneId: string | undefined) {
  return useQuery<ZoneDetailView, ApiError>({
    queryKey: zoneKeys.detail(zoneId ?? ''),
    queryFn: () => zoneService.getZone(zoneId!),
    enabled: Boolean(zoneId),
  })
}

export function useZoneTechniciansQuery(zoneId: string | undefined) {
  return useQuery<ZoneTechnicianView[], ApiError>({
    queryKey: zoneKeys.technicians(zoneId ?? ''),
    queryFn: () => zoneService.listZoneTechnicians(zoneId!),
    enabled: Boolean(zoneId),
  })
}

export function useZoneCoverageQuery(provinceCode: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ZoneCoverageReportView, ApiError>({
    queryKey: zoneKeys.coverage(provinceCode),
    queryFn: () => zoneService.getZoneCoverage(provinceCode),
    enabled,
  })
}

// Đổi khu thì số khu, độ phủ và form khu vực của kỹ thuật viên đều có thể đổi: tải lại cả nhóm, kể cả khi lỗi
function useZoneMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation<R, ApiError, V>({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: zoneKeys.all })
      void queryClient.invalidateQueries({ queryKey: technicianAdminKeys.zones() })
    },
  })
}

export function useCreateZoneMutation() {
  return useZoneMutation<CreateZoneRequest, OperationalZoneListItem>((body) => zoneService.createZone(body))
}

export function useUpdateZoneMutation() {
  return useZoneMutation<{ zoneId: string; body: UpdateZoneRequest }, OperationalZoneListItem>(({ zoneId, body }) =>
    zoneService.updateZone(zoneId, body),
  )
}

export function useSetZoneCommunesMutation() {
  return useZoneMutation<{ zoneId: string; body: SetZoneCommunesRequest }, ZoneDetailView>(({ zoneId, body }) =>
    zoneService.setZoneCommunes(zoneId, body),
  )
}
