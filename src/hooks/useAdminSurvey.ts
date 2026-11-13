import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminSurveyService from '@/services/adminSurveyService'
import type { ApiError } from '@/services/api/errors'
import { dispatchKeys } from '@/hooks/useDispatch'
import { surveyRequestKeys } from '@/hooks/useSurveyRequests'
import type { AssignTechnicianRequest, SalesRescheduleRequest } from '@/types/req/surveyRequestsReq'
import type { SetSalesOwnerRequest } from '@/types/req/adminSurveyRequestsReq'
import type { AssignmentView, SalesOwnerView, SalesRescheduleView } from '@/types/res/surveyRequestsRes'

// Phân công thẳng / đổi giờ / đổi kinh doanh phụ trách. Xong (kể cả lỗi 409 lịch vừa đổi) thì tải lại availability và điều phối,
// không tự gửi lại với revision mới
function useInvalidateSurvey() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: surveyRequestKeys.all })
    void queryClient.invalidateQueries({ queryKey: dispatchKeys.all })
  }
}

export function useOverrideSurveyTechnicianMutation() {
  const invalidate = useInvalidateSurvey()
  return useMutation<AssignmentView, ApiError, { appointmentId: string; body: AssignTechnicianRequest }>({
    mutationFn: ({ appointmentId, body }) => adminSurveyService.overrideSurveyTechnician(appointmentId, body),
    onSettled: invalidate,
  })
}

export function useStaffRescheduleMutation() {
  const invalidate = useInvalidateSurvey()
  return useMutation<SalesRescheduleView, ApiError, { surveyRequestId: string; body: SalesRescheduleRequest }>({
    mutationFn: ({ surveyRequestId, body }) => adminSurveyService.rescheduleSurvey(surveyRequestId, body),
    onSettled: invalidate,
  })
}

export function useSetSurveySalesOwnerMutation() {
  const invalidate = useInvalidateSurvey()
  return useMutation<SalesOwnerView, ApiError, { surveyRequestId: string; body: SetSalesOwnerRequest }>({
    mutationFn: ({ surveyRequestId, body }) => adminSurveyService.setSurveySalesOwner(surveyRequestId, body),
    onSettled: invalidate,
  })
}
