import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { preSurveyKeys } from '@/hooks/usePreSurveys'
import * as simulationService from '@/services/simulationService'
import type { CreateSimulationRequest } from '@/types/req/simulationsReq'
import type { SimulationDetail, SimulationListItem } from '@/types/res/simulationsRes'
import type { ApiError } from '@/services/api/errors'

// Key nằm dưới preSurveyKeys.one nên invalidate bản nháp cũng làm mới mô phỏng
export const simulationKeys = {
  all: (preSurveyId: string) => [...preSurveyKeys.one(preSurveyId), 'simulations'] as const,
  list: (preSurveyId: string) => [...simulationKeys.all(preSurveyId), 'list'] as const,
  detail: (preSurveyId: string, simulationId: string) =>
    [...simulationKeys.all(preSurveyId), 'detail', simulationId] as const,
}

export function useSimulationsQuery(preSurveyId: string | null | undefined) {
  return useQuery<SimulationListItem[], ApiError>({
    queryKey: simulationKeys.list(preSurveyId ?? ''),
    queryFn: () => simulationService.listSimulations(preSurveyId!),
    enabled: Boolean(preSurveyId),
  })
}

/** Kết quả không đổi sau khi lưu nên cache lâu, giữ kết quả cũ trên màn trong lúc tải bản mới */
export function useSimulationQuery(preSurveyId: string | null | undefined, simulationId: string | null | undefined) {
  return useQuery<SimulationDetail, ApiError>({
    queryKey: simulationKeys.detail(preSurveyId ?? '', simulationId ?? ''),
    queryFn: () => simulationService.getSimulation(preSurveyId!, simulationId!),
    enabled: Boolean(preSurveyId && simulationId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

/** Dùng với useIsMutating để chặn rời bước khi đang chạy */
export const CREATE_SIMULATION_KEY = ['pre-surveys', 'create-simulation'] as const

export function useCreateSimulationMutation() {
  const queryClient = useQueryClient()
  return useMutation<SimulationDetail, ApiError, { preSurveyId: string; body: CreateSimulationRequest }>({
    mutationKey: CREATE_SIMULATION_KEY,
    mutationFn: ({ preSurveyId, body }) => simulationService.createSimulation(preSurveyId, body),
    onSuccess: (detail, { preSurveyId }) => {
      // Đặt sẵn vào cache để khỏi tải lại
      queryClient.setQueryData(simulationKeys.detail(preSurveyId, detail.simulationId), detail)
    },
    // Tải lại danh sách, mặt lắp và các bản chi tiết khác vì cờ isSelected / isStale có thể đã đổi
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
