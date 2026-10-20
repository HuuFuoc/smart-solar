import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as technicianAdminService from '@/services/technicianAdminService'
import type { ApiError } from '@/services/api/errors'
import type {
  AddUnavailablePeriodRequest,
  SetWorkingScheduleRequest,
  UpsertTechnicianProfileRequest,
} from '@/types/req/adminTechniciansReq'
import type { TechnicianProfileView, UnavailablePeriodView, WorkingScheduleView } from '@/types/res/adminTechniciansRes'
import type { TechnicianScheduleView } from '@/types/res/technicianAppointmentsRes'

export const technicianAdminKeys = {
  all: ['admin-technicians'] as const,
  list: () => [...technicianAdminKeys.all, 'list'] as const,
  workingSchedule: (id: string) => [...technicianAdminKeys.all, 'working-schedule', id] as const,
  unavailable: (id: string) => [...technicianAdminKeys.all, 'unavailable', id] as const,
  schedule: (id: string, date: string) => [...technicianAdminKeys.all, 'schedule', id, date] as const,
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

/** Đang chờ tính lại đường đi thì tự tải lại mỗi 30 giây cho tới khi xong (xem useMyScheduleQuery). */
export function useTechnicianScheduleQuery(id: string | undefined, date: string) {
  return useQuery<TechnicianScheduleView, ApiError>({
    queryKey: technicianAdminKeys.schedule(id ?? '', date),
    queryFn: () => technicianAdminService.getTechnicianSchedule(id!, date),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.recalculation ? 30_000 : false),
  })
}

/*
 * Mọi thay đổi cấu hình có thể đổi giờ trống của khách và đường đi đã lưu (backend xếp hàng tính lại): làm mới cả cụm
 * kỹ thuật viên – hồ sơ, giờ làm, lịch nghỉ, lịch ngày – kể cả khi lỗi.
 */
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
