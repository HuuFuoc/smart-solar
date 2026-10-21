import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as technicianAdminService from '@/services/technicianAdminService'
import type { ApiError } from '@/services/api/errors'
import type {
  AddUnavailablePeriodRequest,
  SetWorkingScheduleRequest,
  UpsertTechnicianProfileRequest,
} from '@/types/req/adminTechniciansReq'
import type { OperationalZoneListItem } from '@/types/res/operationalZonesRes'
import type { TechnicianProfileView, UnavailablePeriodView, WorkingScheduleView } from '@/types/res/adminTechniciansRes'
import type { TechnicianScheduleView } from '@/types/res/technicianAppointmentsRes'

export const technicianAdminKeys = {
  all: ['admin-technicians'] as const,
  list: () => [...technicianAdminKeys.all, 'list'] as const,
  workingSchedule: (id: string) => [...technicianAdminKeys.all, 'working-schedule', id] as const,
  unavailable: (id: string) => [...technicianAdminKeys.all, 'unavailable', id] as const,
  schedule: (id: string, date: string) => [...technicianAdminKeys.all, 'schedule', id, date] as const,
  zones: () => [...technicianAdminKeys.all, 'zones'] as const,
}

export function useOperationalZonesQuery() {
  return useQuery<OperationalZoneListItem[], ApiError>({
    queryKey: technicianAdminKeys.zones(),
    queryFn: technicianAdminService.listOperationalZones,
  })
}

/** `enabled`: layout chỉ gọi khi phiên quản trị / quản lý đã khôi phục. */
export function useTechniciansQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<TechnicianProfileView[], ApiError>({
    queryKey: technicianAdminKeys.list(),
    queryFn: technicianAdminService.listTechnicians,
    enabled,
  })
}

export function useWorkingScheduleQuery(id: string | undefined) {
  return useQuery<WorkingScheduleView, ApiError>({
    queryKey: technicianAdminKeys.workingSchedule(id ?? ''),
    queryFn: () => technicianAdminService.getWorkingSchedule(id!),
    enabled: Boolean(id),
  })
}

export function useUnavailablePeriodsQuery(id: string | undefined) {
  return useQuery<UnavailablePeriodView[], ApiError>({
    queryKey: technicianAdminKeys.unavailable(id ?? ''),
    queryFn: () => technicianAdminService.listUnavailablePeriods(id!),
    enabled: Boolean(id),
  })
}

export function useTechnicianScheduleQuery(id: string | undefined, date: string) {
  return useQuery<TechnicianScheduleView, ApiError>({
    queryKey: technicianAdminKeys.schedule(id ?? '', date),
    queryFn: () => technicianAdminService.getTechnicianSchedule(id!, date),
    enabled: Boolean(id),
  })
}

// Thay đổi cấu hình có thể đổi giờ trống, nên làm mới tất cả kể cả khi lỗi
function useInvalidateTechnicians() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: technicianAdminKeys.all })
}

export function useUpsertTechnicianProfileMutation() {
  const invalidate = useInvalidateTechnicians()
  return useMutation<TechnicianProfileView, ApiError, { id: string; body: UpsertTechnicianProfileRequest }>({
    mutationFn: ({ id, body }) => technicianAdminService.upsertTechnicianProfile(id, body),
    onSettled: invalidate,
  })
}

export function useSetWorkingScheduleMutation() {
  const invalidate = useInvalidateTechnicians()
  return useMutation<WorkingScheduleView, ApiError, { id: string; body: SetWorkingScheduleRequest }>({
    mutationFn: ({ id, body }) => technicianAdminService.setWorkingSchedule(id, body),
    onSettled: invalidate,
  })
}

export function useAddUnavailablePeriodMutation() {
  const invalidate = useInvalidateTechnicians()
  return useMutation<UnavailablePeriodView, ApiError, { id: string; body: AddUnavailablePeriodRequest }>({
    mutationFn: ({ id, body }) => technicianAdminService.addUnavailablePeriod(id, body),
    onSettled: invalidate,
  })
}

export function useRemoveUnavailablePeriodMutation() {
  const invalidate = useInvalidateTechnicians()
  return useMutation<void, ApiError, { id: string; periodId: string }>({
    mutationFn: ({ id, periodId }) => technicianAdminService.removeUnavailablePeriod(id, periodId),
    onSettled: invalidate,
  })
}

export function useSetTechnicianZonesMutation() {
  const invalidate = useInvalidateTechnicians()
  return useMutation<unknown, ApiError, { id: string; zoneIds: string[] }>({
    mutationFn: ({ id, zoneIds }) => technicianAdminService.setTechnicianZones(id, { zoneIds }),
    onSettled: invalidate,
  })
}
