import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as technicianJobService from '@/services/technicianJobService'
import type { ApiError } from '@/services/api/errors'
import type { AssignmentView } from '@/types/res/surveyRequestsRes'
import type {
  OpenAppointmentView,
  ReleaseView,
  TechnicianAppointmentListItem,
  TechnicianJobView,
  TechnicianScheduleView,
} from '@/types/res/technicianAppointmentsRes'

export const technicianJobKeys = {
  all: ['technician-jobs'] as const,
  list: () => [...technicianJobKeys.all, 'list'] as const,
  open: () => [...technicianJobKeys.all, 'open'] as const,
  detail: (id: string) => [...technicianJobKeys.all, 'detail', id] as const,
  schedule: (date: string) => [...technicianJobKeys.all, 'schedule', date] as const,
}

/** Lịch mới khách đặt hiện ra không cần tải lại trang */
const JOBS_REFRESH_MS = 60_000

type Options = { enabled?: boolean }

/** `enabled`: chỉ gọi khi phiên kỹ thuật viên đã khôi phục */
export function useMyAppointmentsQuery({ enabled = true }: Options = {}) {
  return useQuery<TechnicianAppointmentListItem[], ApiError>({
    queryKey: technicianJobKeys.list(),
    queryFn: technicianJobService.listMyAppointments,
    refetchInterval: JOBS_REFRESH_MS,
    enabled,
  })
}

export function useOpenAppointmentsQuery({ enabled = true }: Options = {}) {
  return useQuery<OpenAppointmentView[], ApiError>({
    queryKey: technicianJobKeys.open(),
    queryFn: technicianJobService.listOpenAppointments,
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

export function useMyScheduleQuery(date: string) {
  return useQuery<TechnicianScheduleView, ApiError>({
    queryKey: technicianJobKeys.schedule(date),
    queryFn: () => technicianJobService.getMySchedule(date),
  })
}

/** Nhận hay trả việc đều đổi cả danh sách chờ nhận, việc của tôi và lịch ngày, nên làm mới tất cả */
function useRefreshJobs() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: technicianJobKeys.all })
}

export function useAcceptAppointmentMutation() {
  const refresh = useRefreshJobs()
  return useMutation<AssignmentView, ApiError, { id: string; revision: number }>({
    mutationFn: ({ id, revision }) => technicianJobService.acceptAppointment(id, { expectedRevision: revision }),
    onSettled: refresh,
  })
}

export function useReleaseAppointmentMutation() {
  const refresh = useRefreshJobs()
  return useMutation<ReleaseView, ApiError, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => technicianJobService.releaseAppointment(id, { reason }),
    onSettled: refresh,
  })
}
