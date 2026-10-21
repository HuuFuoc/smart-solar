import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { preSurveyKeys } from '@/hooks/usePreSurveys'
import * as simulationService from '@/services/simulationService'
import type { CreateSimulationRequest } from '@/types/req/simulationsReq'
import type { SelectedSimulation, SimulationDetail, SimulationList, SimulationView } from '@/types/res/simulationsRes'
import type { ApiError } from '@/services/api/errors'

// Key nằm dưới preSurveyKeys.one nên invalidate bản nháp cũng làm mới mô phỏng
export const simulationKeys = {
  all: (preSurveyId: string) => [...preSurveyKeys.one(preSurveyId), 'simulations'] as const,
  list: (preSurveyId: string) => [...simulationKeys.all(preSurveyId), 'list'] as const,
  detail: (preSurveyId: string, simulationId: string) =>
    [...simulationKeys.all(preSurveyId), 'detail', simulationId] as const,
}

export function useSimulationsQuery(preSurveyId: string | null | undefined) {
  return useQuery<SimulationList, ApiError>({
    queryKey: simulationKeys.list(preSurveyId ?? ''),
    queryFn: () => simulationService.listSimulations(preSurveyId!),
    enabled: Boolean(preSurveyId),
  })
}

/** Giữ kết quả cũ trên màn trong lúc tải bản mới */
export function useSimulationQuery(preSurveyId: string | null | undefined, simulationId: string | null | undefined) {
  return useQuery<SimulationView, ApiError>({
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
      // Đợi danh sách có lần chạy mới rồi mới báo xong, để nút chọn không tưởng lần chạy này đã hết hạn
      return queryClient.invalidateQueries({ queryKey: simulationKeys.list(preSurveyId) })
    },
  })
}

/** Chọn hay bỏ chọn đều đổi cờ isSelected ở danh sách, chi tiết và id mô phỏng chính của mặt lắp */
function useRefreshSelection() {
  const queryClient = useQueryClient()
  return (preSurveyId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: simulationKeys.all(preSurveyId) }),
      queryClient.invalidateQueries({ queryKey: preSurveyKeys.surface(preSurveyId) }),
    ])
}

export function useSelectSimulationMutation() {
  const refresh = useRefreshSelection()
  return useMutation<
    SelectedSimulation,
    ApiError,
    { preSurveyId: string; simulationId: string; expectedGeometryVersion: number }
  >({
    mutationFn: ({ preSurveyId, simulationId, expectedGeometryVersion }) =>
      simulationService.selectSimulation(preSurveyId, simulationId, { expectedGeometryVersion }),
    onSettled: (_data, _error, { preSurveyId }) => refresh(preSurveyId),
  })
}

export function useClearSelectionMutation() {
  const refresh = useRefreshSelection()
  return useMutation<void, ApiError, string>({
    mutationFn: (preSurveyId) => simulationService.clearSimulationSelection(preSurveyId),
    onSettled: (_data, _error, preSurveyId) => refresh(preSurveyId),
  })
}
