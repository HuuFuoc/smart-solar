import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as preSurveyService from '@/services/preSurveyService'
import { bookingKeys } from '@/hooks/useBooking'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'
import type { UpdatePreSurveySurfaceRequest } from '@/types/req/preSurveySurfaceReq'
import type { CreatePreSurveyRequest, UpdatePreSurveyRequest } from '@/types/req/preSurveysReq'
import type { CreateCustomerProfileResponse, CreatePropertySiteResponse } from '@/types/res/customersRes'
import type { PreSurveySurfaceView, UpdatePreSurveySurfaceResponse } from '@/types/res/preSurveySurfaceRes'
import type { CreatePreSurveyResponse, SubmitPreSurveyResponse } from '@/types/res/preSurveysRes'
import type { ApiError } from '@/services/api/errors'

// Backend chỉ cho đọc lại mặt lắp của bản nháp. Mọi lần ghi đều làm mới mặt lắp và danh sách mô phỏng

export const preSurveyKeys = {
  all: ['pre-surveys'] as const,
  one: (id: string) => [...preSurveyKeys.all, id] as const,
  surface: (id: string) => [...preSurveyKeys.one(id), 'surface'] as const,
}

export function useCreateCustomerProfileMutation() {
  return useMutation<CreateCustomerProfileResponse, ApiError, CreateCustomerProfileRequest>({
    mutationFn: (body) => preSurveyService.createCustomerProfile(body),
  })
}

export function useCreatePropertySiteMutation() {
  return useMutation<CreatePropertySiteResponse, ApiError, CreatePropertySiteRequest>({
    mutationFn: (body) => preSurveyService.createPropertySite(body),
  })
}

export function useCreatePreSurveyMutation() {
  return useMutation<CreatePreSurveyResponse, ApiError, CreatePreSurveyRequest>({
    mutationFn: (body) => preSurveyService.createPreSurvey(body),
  })
}

/** Không await để nút bấm báo xong ngay */
function useInvalidatePreSurvey() {
  const queryClient = useQueryClient()
  return (id: string) => {
    void queryClient.invalidateQueries({ queryKey: preSurveyKeys.one(id) })
  }
}

export function useUpdatePreSurveyMutation() {
  const invalidate = useInvalidatePreSurvey()
  return useMutation<unknown, ApiError, { id: string; body: UpdatePreSurveyRequest }>({
    mutationFn: ({ id, body }) => preSurveyService.updatePreSurvey(id, body),
    onSettled: (_data, _error, { id }) => invalidate(id),
  })
}

export function useSubmitPreSurveyMutation() {
  const invalidate = useInvalidatePreSurvey()
  const queryClient = useQueryClient()
  return useMutation<SubmitPreSurveyResponse, ApiError, string>({
    mutationFn: (id) => preSurveyService.submitPreSurvey(id),
    // Để danh sách yêu cầu của khách có ngay yêu cầu mới
    onSettled: (_data, _error, id) =>
      Promise.all([invalidate(id), queryClient.invalidateQueries({ queryKey: bookingKeys.all })]),
  })
}

/** Chỉ gọi khi đã có id bản nháp */
export function useSurfaceQuery(id: string | null | undefined) {
  return useQuery<PreSurveySurfaceView, ApiError>({
    queryKey: preSurveyKeys.surface(id ?? ''),
    queryFn: () => preSurveyService.getSurface(id!),
    enabled: Boolean(id),
  })
}

export function useSaveSurfaceMutation() {
  const invalidate = useInvalidatePreSurvey()
  return useMutation<UpdatePreSurveySurfaceResponse, ApiError, { id: string; body: UpdatePreSurveySurfaceRequest }>({
    mutationFn: ({ id, body }) => preSurveyService.saveSurface(id, body),
    onSettled: (_data, _error, { id }) => invalidate(id),
  })
}
