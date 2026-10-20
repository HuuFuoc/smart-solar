import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { preSurveyKeys } from '@/features/pre-surveys/hooks/usePreSurveys'
import * as simulationService from '@/features/pre-surveys/services/simulationService'
import type { CreateSimulationRequest } from '@/types/req/simulationsReq'
import type { SimulationDetail, SimulationListItem } from '@/types/res/simulationsRes'
import type { ApiError } from '@/services/api/errors'

/*
 * Mô phỏng của một bản đánh giá. Khoá nằm dưới khoá của bản nháp (preSurveyKeys.one) nên lưu mặt lắp hay gửi
 * bản đánh giá cũng làm mới danh sách (cờ "cũ", "đang chọn").
 */
export const simulationKeys = {
  all: (preSurveyId: string) => [...preSurveyKeys.one(preSurveyId), 'simulations'] as const,
  list: (preSurveyId: string) => [...simulationKeys.all(preSurveyId), 'list'] as const,
  detail: (preSurveyId: string, simulationId: string) => [...simulationKeys.all(preSurveyId), 'detail', simulationId] as const,
}

export function useSimulationsQuery(preSurveyId: string | null | undefined) {
  return useQuery<SimulationListItem[], ApiError>({
    queryKey: simulationKeys.list(preSurveyId ?? ''),
    queryFn: () => simulationService.listSimulations(preSurveyId!),
    enabled: Boolean(preSurveyId),
  })
}

/**
 * Bản đầy đủ của một lần chạy. Nội dung không đổi sau khi lưu (chỉ hai cờ isStale / isSelected), nên giữ cache lâu.
 * Đổi sang lần chạy khác: giữ kết quả đang xem trên màn (mờ đi) tới khi bản mới về, để không nháy khung chờ và không mất
 * góc nhìn / mục đang mở của người xem.
 */
export function useSimulationQuery(preSurveyId: string | null | undefined, simulationId: string | null | undefined) {
  return useQuery<SimulationDetail, ApiError>({
    queryKey: simulationKeys.detail(preSurveyId ?? '', simulationId ?? ''),
    queryFn: () => simulationService.getSimulation(preSurveyId!, simulationId!),
    enabled: Boolean(preSurveyId && simulationId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

/** Khoá của lần chạy mô phỏng: trang wizard dùng useIsMutating để không cho rời bước / gửi khi đang chạy. */
export const CREATE_SIMULATION_KEY = ['pre-surveys', 'create-simulation'] as const

export function useCreateSimulationMutation() {
  const queryClient = useQueryClient()
  return useMutation<SimulationDetail, ApiError, { preSurveyId: string; body: CreateSimulationRequest }>({
    mutationKey: CREATE_SIMULATION_KEY,
    mutationFn: ({ preSurveyId, body }) => simulationService.createSimulation(preSurveyId, body),
    onSuccess: (detail, { preSurveyId }) => {
      // Kết quả vừa nhận là bản đầy đủ: đặt sẵn vào cache để mở lại không phải tải lần nữa.
      queryClient.setQueryData(simulationKeys.detail(preSurveyId, detail.simulationId), detail)
    },
    /*
      Danh sách (lần chạy mới), mặt lắp (selectedSimulationId) và MỌI bản chi tiết đã cache (cờ isSelected / isStale của lần
      chạy cũ vừa đổi) đều phải tải lại; lỗi 409 "mặt lắp đã đổi" cũng cần tải lại. Bản vừa nhận đã đặt sẵn ở onSuccess nên
      bỏ qua (predicate), không tải lại lần nữa.
    */
    onSettled: (data, _error, { preSurveyId }) => {
      void queryClient.invalidateQueries({ queryKey: simulationKeys.list(preSurveyId) })
      void queryClient.invalidateQueries({ queryKey: preSurveyKeys.surface(preSurveyId) })
      void queryClient.invalidateQueries({
        queryKey: [...simulationKeys.all(preSurveyId), 'detail'],
        predicate: (q) => q.queryKey.at(-1) !== data?.simulationId,
      })
    },
  })
}
