import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { technicianJobKeys } from '@/hooks/useTechnicianJobs'
import { uploadFile } from '@/services/fileService'
import * as onSiteSurveyService from '@/services/onSiteSurveyService'
import { isApiError, type ApiError } from '@/services/api/errors'
import type { OnSiteSurveyRequest } from '@/types/req/technicianOnSiteSurveyReq'
import type { OnSiteSurveyView } from '@/types/res/technicianOnSiteSurveyRes'

export const onSiteSurveyKeys = {
  all: ['onsite-survey'] as const,
  mine: (appointmentId: string) => [...onSiteSurveyKeys.all, 'mine', appointmentId] as const,
  staff: (surveyRequestId: string) => [...onSiteSurveyKeys.all, 'staff', surveyRequestId] as const,
}

/** Biên bản của lịch đã nhận; null khi kỹ thuật viên chưa bắt đầu hay lưu lần nào */
export function useMyOnSiteSurveyQuery(appointmentId: string | undefined, { enabled = true } = {}) {
  return useQuery<OnSiteSurveyView | null, ApiError>({
    queryKey: onSiteSurveyKeys.mine(appointmentId ?? ''),
    queryFn: () => onSiteSurveyService.getMyOnSiteSurvey(appointmentId!),
    enabled: enabled && Boolean(appointmentId),
  })
}

/** Kinh doanh / quản lý đọc biên bản; chưa có biên bản (404 ONSITE_SURVEY_NOT_FOUND) thì trả null, không coi là lỗi */
export function useStaffOnSiteSurveyQuery(surveyRequestId: string | undefined, { enabled = true } = {}) {
  return useQuery<OnSiteSurveyView | null, ApiError>({
    queryKey: onSiteSurveyKeys.staff(surveyRequestId ?? ''),
    queryFn: async () => {
      try {
        return await onSiteSurveyService.getOnSiteSurveyForStaff(surveyRequestId!)
      } catch (error) {
        if (isApiError(error) && error.code === 'ONSITE_SURVEY_NOT_FOUND') return null
        throw error
      }
    },
    enabled: enabled && Boolean(surveyRequestId),
  })
}

// Mọi lệnh ghi trả lại cả biên bản: đặt thẳng vào cache. Biên bản đã đổi ở nơi khác (revision cũ) thì tải lại
function useSurveyMutation<TVars>(
  appointmentId: string,
  mutationFn: (vars: TVars) => Promise<OnSiteSurveyView>,
  { refreshJob = false } = {},
) {
  const queryClient = useQueryClient()
  return useMutation<OnSiteSurveyView, ApiError, TVars>({
    mutationFn,
    onSuccess: (view) => queryClient.setQueryData(onSiteSurveyKeys.mine(appointmentId), view),
    onError: (error) => {
      if (isApiError(error) && error.code === 'ONSITE_SURVEY_STALE_REVISION')
        void queryClient.invalidateQueries({ queryKey: onSiteSurveyKeys.mine(appointmentId) })
    },
    // Hoàn thành đổi trạng thái lịch hẹn nên tải lại việc của kỹ thuật viên
    onSettled: refreshJob ? () => queryClient.invalidateQueries({ queryKey: technicianJobKeys.all }) : undefined,
  })
}

export function useStartOnSiteSurveyMutation(appointmentId: string) {
  return useSurveyMutation<void>(appointmentId, () => onSiteSurveyService.startOnSiteSurvey(appointmentId))
}

export function useSaveOnSiteSurveyMutation(appointmentId: string) {
  return useSurveyMutation<OnSiteSurveyRequest>(appointmentId, (body) =>
    onSiteSurveyService.saveOnSiteSurvey(appointmentId, body),
  )
}

/** Tải tệp lên kho (ONSITE_SURVEY_EVIDENCE) rồi gắn vào biên bản theo loại */
export function useAddOnSiteSurveyFileMutation(appointmentId: string) {
  return useSurveyMutation<{ file: File; category: string }>(appointmentId, async ({ file, category }) => {
    const registered = await uploadFile(file, 'ONSITE_SURVEY_EVIDENCE')
    return onSiteSurveyService.addOnSiteSurveyAttachment(appointmentId, { fileId: registered.fileId, category })
  })
}

export function useRemoveOnSiteSurveyFileMutation(appointmentId: string) {
  return useSurveyMutation<string>(appointmentId, (attachmentId) =>
    onSiteSurveyService.removeOnSiteSurveyAttachment(appointmentId, attachmentId),
  )
}

export function useCompleteOnSiteSurveyMutation(appointmentId: string) {
  return useSurveyMutation<number>(
    appointmentId,
    (revision) => onSiteSurveyService.completeOnSiteSurvey(appointmentId, { revision }),
    { refreshJob: true },
  )
}
