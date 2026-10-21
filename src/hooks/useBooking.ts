import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as bookingService from '@/services/bookingService'
import type { ApiError } from '@/services/api/errors'
import type { BookSurveyAppointmentRequest } from '@/types/req/customerSurveyRequestsReq'
import type {
  BookingConfirmation,
  CustomerAppointmentView,
  CustomerSurveyRequestDetailView,
  CustomerSurveyRequestView,
} from '@/types/res/customerSurveyRequestsRes'
import type { SurveySlotsView } from '@/types/res/surveySlotsRes'

// Đặt lịch khảo sát của khách. Giờ trống có thể bị người khác lấy bất cứ lúc nào
// nên sau mỗi lần đặt / đổi / huỷ (kể cả lỗi) đều tải lại. Không cập nhật lạc quan

export const bookingKeys = {
  all: ['customer-survey-requests'] as const,
  list: () => [...bookingKeys.all, 'list'] as const,
  detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
  slotsAll: ['survey-slots'] as const,
  slots: (propertySiteId: string, date: string) => ['survey-slots', propertySiteId, date] as const,
}

export function useMyRequestsQuery() {
  return useQuery<CustomerSurveyRequestView[], ApiError>({
    queryKey: bookingKeys.list(),
    queryFn: bookingService.listMyRequests,
  })
}

export function useMyRequestQuery(id: string | undefined) {
  return useQuery<CustomerSurveyRequestDetailView, ApiError>({
    queryKey: bookingKeys.detail(id ?? ''),
    queryFn: () => bookingService.getMyRequest(id!),
    enabled: Boolean(id),
  })
}

// Backend giới hạn 20 lần / phút nên cache 30 giây và không tự retry
export function useSurveySlotsQuery(propertySiteId: string | undefined, date: string | null) {
  return useQuery<SurveySlotsView, ApiError>({
    queryKey: bookingKeys.slots(propertySiteId ?? '', date ?? ''),
    queryFn: () => bookingService.getSurveySlots(propertySiteId!, date!),
    enabled: Boolean(propertySiteId && date),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

type BookVars = { id: string; body: BookSurveyAppointmentRequest }

function useInvalidateBooking() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
      queryClient.invalidateQueries({ queryKey: bookingKeys.slotsAll }),
    ])
}

export function useBookAppointmentMutation() {
  const invalidate = useInvalidateBooking()
  return useMutation<BookingConfirmation, ApiError, BookVars>({
    mutationFn: ({ id, body }) => bookingService.bookAppointment(id, body),
    onSettled: invalidate,
  })
}

export function useRescheduleAppointmentMutation() {
  const invalidate = useInvalidateBooking()
  return useMutation<BookingConfirmation, ApiError, BookVars>({
    mutationFn: ({ id, body }) => bookingService.rescheduleAppointment(id, body),
    onSettled: invalidate,
  })
}

export function useCancelAppointmentMutation() {
  const invalidate = useInvalidateBooking()
  return useMutation<CustomerAppointmentView, ApiError, { id: string; reason: string | null }>({
    mutationFn: ({ id, reason }) => bookingService.cancelAppointment(id, { reason }),
    onSettled: invalidate,
  })
}
