import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as preSurveyService from '@/services/preSurveyService'
import { bookingKeys } from '@/hooks/useBooking'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'
import type { UpdatePreSurveySurfaceRequest } from '@/types/req/preSurveySurfaceReq'
import type { CreatePreSurveyRequest, UpdatePreSurveyRequest } from '@/types/req/preSurveysReq'
import type {
  CreateCustomerProfileResponse,
  CreatePropertySiteResponse,
  CustomerListPage,
  CustomerPreSurveyListItem,
  CustomerSiteListItem,
} from '@/types/res/customersRes'
import type { SiteLocationView } from '@/types/res/customerSiteLocationRes'
import type { PreSurveySurfaceView, UpdatePreSurveySurfaceResponse } from '@/types/res/preSurveySurfaceRes'
import type { CreatePreSurveyResponse, SubmitPreSurveyResponse } from '@/types/res/preSurveysRes'
import type { ApiError } from '@/services/api/errors'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'

// Backend chỉ cho đọc lại mặt lắp của bản nháp. Mọi lần ghi đều làm mới mặt lắp và danh sách mô phỏng

export const preSurveyKeys = {
  all: ['pre-surveys'] as const,
  mySites: ['pre-surveys', 'my-sites'] as const,
  myDrafts: ['pre-surveys', 'my-drafts'] as const,
  one: (id: string) => [...preSurveyKeys.all, id] as const,
  surface: (id: string) => [...preSurveyKeys.one(id), 'surface'] as const,
}

export function useCreateCustomerProfileMutation() {
  return useMutation<CreateCustomerProfileResponse, ApiError, CreateCustomerProfileRequest>({
    mutationFn: (body) => preSurveyService.createCustomerProfile(body),
  })
}

export function useCreatePropertySiteMutation() {
  const queryClient = useQueryClient()
  return useMutation<CreatePropertySiteResponse, ApiError, CreatePropertySiteRequest>({
    mutationFn: (body) => preSurveyService.createPropertySite(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preSurveyKeys.mySites }),
  })
}

/**
 * Bổ sung mã phường, xã cho địa điểm đã có. Xong (kể cả lỗi) thì tải lại địa điểm, giờ trống khảo sát (khu vực phục vụ
 * suy từ mã này) và yêu cầu khảo sát của khách
 */
export function useSetSiteLocationMutation() {
  const queryClient = useQueryClient()
  return useMutation<SiteLocationView, ApiError, { siteId: string; communeCode: string }>({
    mutationFn: ({ siteId, communeCode }) =>
      preSurveyService.setSiteAdministrativeLocation(siteId, { provinceCode: HCM_PROVINCE.code, communeCode }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: preSurveyKeys.mySites }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.slotsAll }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
      ]),
  })
}

export function useMySitesQuery() {
  return useQuery<CustomerListPage<CustomerSiteListItem>, ApiError>({
    queryKey: preSurveyKeys.mySites,
    queryFn: preSurveyService.listMySites,
  })
}

/** Bản nháp trên mọi máy của khách, để mở tiếp bản nháp làm ở máy khác */
export function useMyDraftsQuery() {
  return useQuery<CustomerListPage<CustomerPreSurveyListItem>, ApiError>({
    queryKey: preSurveyKeys.myDrafts,
    queryFn: preSurveyService.listMyDrafts,
  })
}

export function useCreatePreSurveyMutation() {
  const queryClient = useQueryClient()
  return useMutation<CreatePreSurveyResponse, ApiError, CreatePreSurveyRequest>({
    mutationFn: (body) => preSurveyService.createPreSurvey(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: preSurveyKeys.myDrafts }),
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
      Promise.all([
        invalidate(id),
        queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
        queryClient.invalidateQueries({ queryKey: preSurveyKeys.myDrafts }),
      ]),
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
