import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as technicianJobService from '@/services/technicianJobService'
import type { ApiError } from '@/services/api/errors'
import type {
  AcknowledgementView,
  TechnicianAppointmentListItem,
  TechnicianJobView,
  TechnicianScheduleView,
} from '@/types/res/technicianAppointmentsRes'

export const technicianJobKeys = {
  all: ['technician-jobs'] as const,
  list: () => [...technicianJobKeys.all, 'list'] as const,
  detail: (id: string) => [...technicianJobKeys.all, 'detail', id] as const,
  schedule: (date: string) => [...technicianJobKeys.all, 'schedule', date] as const,
}

/** Việc mới được giao hiện ra không cần tải lại trang (cùng nhịp với hàng chờ của sales). */
const JOBS_REFRESH_MS = 60_000

type Options = { enabled?: boolean }

/** `enabled`: layout chỉ gọi khi phiên kỹ thuật viên đã khôi phục (layout còn là khung chờ trước RequireRole). */
export function useMyAppointmentsQuery({ enabled = true }: Options = {}) {
  return useQuery<TechnicianAppointmentListItem[], ApiError>({
    queryKey: technicianJobKeys.list(),
    queryFn: technicianJobService.listMyAppointments,
    refetchInterval: JOBS_REFRESH_MS,
    enabled,
  })
}

export function useMyAppointmentQuery(id: string | undefined) {
  return useQuery<TechnicianJobView, ApiError>({
    queryKey: technicianJobKeys.detail(id ?? ''),
    queryFn: () => technicianJobService.getMyAppointment(id!),
    enabled: Boolean(id),
  })
}

/*
 * Lịch một ngày. Đang chờ tính lại đường đi (worker chạy nền, thử lại có giãn cách) thì tự tải lại mỗi 30 giây cho tới khi
 * xong – có giới hạn, không dồn yêu cầu; còn lại không tự tải.
 */
export function useMyScheduleQuery(date: string) {
  return useQuery<TechnicianScheduleView, ApiError>({
    queryKey: technicianJobKeys.schedule(date),
    queryFn: () => technicianJobService.getMySchedule(date),
    refetchInterval: (query) => (query.state.data?.recalculation ? 30_000 : false),
  })
}

export function useAcknowledgeMutation() {
  const queryClient = useQueryClient()
  return useMutation<AcknowledgementView, ApiError, string>({
    mutationFn: (id) => technicianJobService.acknowledgeAppointment(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: technicianJobKeys.all }),
  })
}
