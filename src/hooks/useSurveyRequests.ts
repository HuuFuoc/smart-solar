import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as surveyRequestService from '@/features/pre-surveys/services/surveyRequestService'
import type { SalesRescheduleRequest } from '@/types/req/surveyRequestsReq'
import type { TechnicianAvailabilityView } from '@/types/res/technicianAvailabilityRes'
import type {
  AssignmentView,
  ClaimSurveyRequestResponse,
  MySurveyRequestItem,
  PendingSurveyRequestItem,
  SalesRescheduleView,
  SurveyRequestDetail,
} from '@/types/res/surveyRequestsRes'
import type { ApiError } from '@/services/api/errors'

/*
 * Query + mutation cho yêu cầu khảo sát của sales. Nhận yêu cầu (hoặc bị người khác nhận trước)
 * đều làm mới cả hai danh sách, vì yêu cầu rời "Chờ nhận" và vào "Của tôi" cùng lúc.
 */

export const surveyRequestKeys = {
  all: ['survey-requests'] as const,
  pending: () => [...surveyRequestKeys.all, 'pending'] as const,
  my: () => [...surveyRequestKeys.all, 'my'] as const,
  detail: (id: string) => [...surveyRequestKeys.all, 'detail', id] as const,
  availability: (id: string) => [...surveyRequestKeys.all, 'availability', id] as const,
}

/** Hàng chờ tự làm mới mỗi phút (số đếm trên menu và danh sách cùng dùng một cache). */
const QUEUE_REFRESH_MS = 60_000

/**
 * `enabled`: layout dùng để chỉ gọi khi đã chắc là sales. Layout còn được vẽ làm khung chờ (hydrateFallbackElement)
 * TRƯỚC RequireRole và trước khi phiên được khôi phục, lúc đó gọi API sẽ không có token.
 */
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

/*
 * Kỹ thuật viên rảnh cho một yêu cầu (đã kiểm tra lịch + đường đi tại lúc hỏi). `startsAt` rỗng = giờ khách đã đặt.
 * Chỉ là ảnh chụp ngắn: không tự tải lại khi quay về tab (mỗi lần hỏi có thể gọi Vietmap, giới hạn 20 lần / phút), tải
 * lại sau mỗi lần phân công / đổi giờ.
 */
export function useTechnicianAvailabilityQuery(surveyRequestId: string | undefined, startsAt?: string, { enabled = true } = {}) {
  return useQuery<TechnicianAvailabilityView, ApiError>({
    queryKey: [...surveyRequestKeys.availability(surveyRequestId ?? ''), startsAt ?? 'booked'],
    queryFn: () => surveyRequestService.getTechnicianAvailability(surveyRequestId!, startsAt),
    enabled: Boolean(surveyRequestId) && enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

/* Phân công / đổi người / đổi giờ đều làm mới chi tiết, hàng "Của tôi" và danh sách kỹ thuật viên rảnh, kể cả khi lỗi
   (409: người khác vừa đổi lịch – phải thấy bản mới nhất thay vì giữ giờ cũ trên màn hình). */
function useInvalidateSchedule() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: surveyRequestKeys.all })
}

type AssignVars = { id: string; technicianUserId: string; reason: string | null; reassign: boolean }

export function useAssignTechnicianMutation() {
  const invalidate = useInvalidateSchedule()
  return useMutation<AssignmentView, ApiError, AssignVars>({
    mutationFn: ({ id, technicianUserId, reason, reassign }) =>
      (reassign ? surveyRequestService.reassignTechnician : surveyRequestService.assignTechnician)(id, { technicianUserId, reason }),
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
