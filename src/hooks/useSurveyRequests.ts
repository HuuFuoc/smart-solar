import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as surveyRequestService from '@/services/surveyRequestService'
import type { SalesRescheduleRequest } from '@/types/req/surveyRequestsReq'
import type { TechnicianAvailabilityView } from '@/types/res/technicianAvailabilityRes'
import type {
  AssignmentView,
  ClaimSurveyRequestResponse,
  EscalatedAppointmentView,
  MySurveyRequestItem,
  PendingSurveyRequestItem,
  SalesRescheduleView,
  SurveyRequestDetail,
} from '@/types/res/surveyRequestsRes'
import type { ApiError } from '@/services/api/errors'

// Nhận yêu cầu thì làm mới cả 2 danh sách "Chờ nhận" và "Của tôi"

export const surveyRequestKeys = {
  all: ['survey-requests'] as const,
  pending: () => [...surveyRequestKeys.all, 'pending'] as const,
  my: () => [...surveyRequestKeys.all, 'my'] as const,
  detail: (id: string) => [...surveyRequestKeys.all, 'detail', id] as const,
  availability: (id: string) => [...surveyRequestKeys.all, 'availability', id] as const,
  escalated: () => [...surveyRequestKeys.all, 'escalated'] as const,
}

const QUEUE_REFRESH_MS = 60_000

/** Layout render trước khi xác thực xong, nên tắt query cho tới khi chắc là sales */
type QueueOptions = { enabled?: boolean }

export function usePendingSurveyRequestsQuery({ enabled = true }: QueueOptions = {}) {
  return useQuery<PendingSurveyRequestItem[], ApiError>({
    queryKey: surveyRequestKeys.pending(),
    queryFn: surveyRequestService.listPendingSurveyRequests,
    refetchInterval: QUEUE_REFRESH_MS,
    enabled,
  })
}

export function useMySurveyRequestsQuery({ enabled = true }: QueueOptions = {}) {
  return useQuery<MySurveyRequestItem[], ApiError>({
    queryKey: surveyRequestKeys.my(),
    queryFn: surveyRequestService.listMySurveyRequests,
    refetchInterval: QUEUE_REFRESH_MS,
    enabled,
  })
}

export function useSurveyRequestQuery(id: string | undefined) {
  return useQuery<SurveyRequestDetail, ApiError>({
    queryKey: surveyRequestKeys.detail(id ?? ''),
    queryFn: () => surveyRequestService.getSurveyRequest(id!),
    enabled: Boolean(id),
  })
}

export function useClaimSurveyRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation<ClaimSurveyRequestResponse, ApiError, string>({
    mutationFn: (id) => surveyRequestService.claimSurveyRequest(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: surveyRequestKeys.all }),
  })
}

export function useEscalatedAppointmentsQuery({ enabled = true }: QueueOptions = {}) {
  return useQuery<EscalatedAppointmentView[], ApiError>({
    queryKey: surveyRequestKeys.escalated(),
    queryFn: surveyRequestService.listEscalatedAppointments,
    refetchInterval: QUEUE_REFRESH_MS,
    enabled,
  })
}

export function useTechnicianAvailabilityQuery(surveyRequestId: string | undefined, { enabled = true } = {}) {
  return useQuery<TechnicianAvailabilityView, ApiError>({
    queryKey: surveyRequestKeys.availability(surveyRequestId ?? ''),
    queryFn: () => surveyRequestService.getTechnicianAvailability(surveyRequestId!),
    enabled: Boolean(surveyRequestId) && enabled,
    staleTime: 30_000,
    retry: false,
  })
}

// Làm mới cả khi lỗi (409) để thấy lịch mới nhất
function useInvalidateSchedule() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: surveyRequestKeys.all })
}

type AssignVars = { id: string; technicianUserId: string; reason: string; revision: number; reassign: boolean }

export function useAssignTechnicianMutation() {
  const invalidate = useInvalidateSchedule()
  return useMutation<AssignmentView, ApiError, AssignVars>({
    mutationFn: ({ id, technicianUserId, reason, revision, reassign }) =>
      (reassign ? surveyRequestService.reassignTechnician : surveyRequestService.assignTechnician)(id, {
        technicianUserId,
        reason,
        expectedRevision: revision,
      }),
    onSettled: invalidate,
  })
}

export function useSalesRescheduleMutation() {
  const invalidate = useInvalidateSchedule()
  return useMutation<SalesRescheduleView, ApiError, { id: string; body: SalesRescheduleRequest }>({
    mutationFn: ({ id, body }) => surveyRequestService.rescheduleSurveyRequest(id, body),
    onSettled: invalidate,
  })
}
