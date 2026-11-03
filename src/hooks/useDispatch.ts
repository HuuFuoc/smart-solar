import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingKeys } from '@/hooks/useBooking'
import * as dispatchService from '@/services/dispatchService'
import type { DispatchQueue, DispatchTechnicianBody } from '@/services/dispatchService'
import type { ApiError } from '@/services/api/errors'
import type {
  CustomerDispatchView,
  DispatchCandidatesView,
  DispatchStaffView,
  DispatchStatus,
  PreferredWindowView,
} from '@/types/res/dispatchRes'

// Điều phối kỹ thuật viên. Mọi thao tác (kể cả lỗi 409) đều tải lại vì nhân viên và khách cùng sửa một yêu cầu

export const dispatchKeys = {
  all: ['dispatch'] as const,
  mine: (surveyRequestId: string) => [...dispatchKeys.all, 'mine', surveyRequestId] as const,
  queue: (scope: QueueScope) => [...dispatchKeys.all, 'queue', scope] as const,
  detail: (id: string) => [...dispatchKeys.all, 'detail', id] as const,
  candidates: (id: string, startsAt: string) => [...dispatchKeys.all, 'candidates', id, startsAt] as const,
}

/** Đề xuất có hạn trả lời nên tải lại mỗi phút */
const REFRESH_MS = 60_000

export function useMyDispatchQuery(surveyRequestId: string | undefined, { enabled = true } = {}) {
  return useQuery<CustomerDispatchView | null, ApiError>({
    queryKey: dispatchKeys.mine(surveyRequestId ?? ''),
    queryFn: () => dispatchService.getMyDispatchRequest(surveyRequestId!),
    enabled: Boolean(surveyRequestId) && enabled,
    refetchInterval: REFRESH_MS,
  })
}

// Đồng ý đề xuất thì yêu cầu khảo sát có lịch mới, nên tải lại cả yêu cầu của khách
function useInvalidateCustomerDispatch() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: dispatchKeys.all }),
      queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
    ])
}

export function useCreateDispatchMutation() {
  const invalidate = useInvalidateCustomerDispatch()
  return useMutation<
    CustomerDispatchView,
    ApiError,
    { surveyRequestId: string; preferredWindows: PreferredWindowView[]; note: string | null }
  >({
    mutationFn: ({ surveyRequestId, ...body }) => dispatchService.createDispatchRequest(surveyRequestId, body),
    onSettled: invalidate,
  })
}

export function useAnswerProposalMutation() {
  const invalidate = useInvalidateCustomerDispatch()
  return useMutation<
    CustomerDispatchView,
    ApiError,
    { surveyRequestId: string; proposalId: string; revision: number; accept: boolean; reason?: string | null }
  >({
    mutationFn: ({ surveyRequestId, proposalId, revision, accept, reason }) =>
      accept
        ? dispatchService.acceptProposal(surveyRequestId, proposalId, revision)
        : dispatchService.declineProposal(surveyRequestId, proposalId, revision, reason ?? null),
    onSettled: invalidate,
  })
}

export function useCancelDispatchMutation() {
  const invalidate = useInvalidateCustomerDispatch()
  return useMutation<CustomerDispatchView, ApiError, { surveyRequestId: string; reason: string | null }>({
    mutationFn: ({ surveyRequestId, reason }) => dispatchService.cancelDispatchRequest(surveyRequestId, reason),
    onSettled: invalidate,
  })
}

/** Đang cần làm (chờ xếp, chờ khách trả lời) và đã xong */
const QUEUE_STATUSES = {
  active: ['OPEN', 'PROPOSAL_PENDING'],
  done: ['ASSIGNED', 'UNSERVICEABLE', 'CLOSED'],
} as const satisfies Record<string, readonly DispatchStatus[]>
type QueueScope = keyof typeof QUEUE_STATUSES

/**
 * `enabled`: menu chỉ gọi khi đã chắc là quản lý / quản trị. `done`: yêu cầu đã xong, chỉ lấy các yêu cầu gần đây
 * và không tự tải lại (thao tác của nhân viên vẫn làm mới)
 */
export function useDispatchQueueQuery({ enabled = true, done = false }: { enabled?: boolean; done?: boolean } = {}) {
  const scope: QueueScope = done ? 'done' : 'active'
  return useQuery<DispatchQueue, ApiError>({
    queryKey: dispatchKeys.queue(scope),
    queryFn: () => dispatchService.listDispatchRequests(QUEUE_STATUSES[scope], { latest: done }),
    refetchInterval: done ? false : REFRESH_MS,
    enabled,
  })
}

export function useDispatchRequestQuery(id: string | undefined) {
  return useQuery<DispatchStaffView, ApiError>({
    queryKey: dispatchKeys.detail(id ?? ''),
    queryFn: () => dispatchService.getDispatchRequest(id!),
    enabled: Boolean(id),
    refetchInterval: REFRESH_MS,
  })
}

export function useDispatchCandidatesQuery(id: string | undefined, startsAt: string | null) {
  return useQuery<DispatchCandidatesView, ApiError>({
    queryKey: dispatchKeys.candidates(id ?? '', startsAt ?? ''),
    queryFn: () => dispatchService.getDispatchCandidates(id!, startsAt!),
    enabled: Boolean(id && startsAt),
    staleTime: 30_000,
    retry: false,
  })
}

function useStaffDispatchMutation<Vars>(action: (vars: Vars) => Promise<DispatchStaffView>) {
  const queryClient = useQueryClient()
  return useMutation<DispatchStaffView, ApiError, Vars>({
    mutationFn: action,
    onSettled: () => queryClient.invalidateQueries({ queryKey: dispatchKeys.all }),
  })
}

export function useDispatchTechnicianMutation() {
  return useStaffDispatchMutation<{ id: string; body: DispatchTechnicianBody; propose: boolean }>(
    ({ id, body, propose }) =>
      propose ? dispatchService.proposeDispatch(id, body) : dispatchService.assignDispatch(id, body),
  )
}

export function useWithdrawProposalMutation() {
  return useStaffDispatchMutation<{ id: string; proposalId: string; reason: string | null }>(
    ({ id, proposalId, reason }) => dispatchService.withdrawProposal(id, proposalId, reason),
  )
}

export function useResolveDispatchMutation() {
  return useStaffDispatchMutation<{ id: string; reason: string; revision: number; unserviceable: boolean }>(
    ({ id, reason, revision, unserviceable }) =>
      unserviceable
        ? dispatchService.markUnserviceable(id, reason, revision)
        : dispatchService.closeDispatchRequest(id, reason, revision),
  )
}
