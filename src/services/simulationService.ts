import type { CreateSimulationRequest } from '@/types/req/simulationsReq'
import type { SimulationDetail, SimulationListItem } from '@/types/res/simulationsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Mô phỏng do backend tính, tối đa 10 lần / phút (429)
// Backend tự chọn lần chạy mới nhất làm mô phỏng chính

/** 201 tạo mới, 200 dùng lại kết quả cũ. Có thể mất khoảng 25 giây */
export function createSimulation(preSurveyId: string, body: CreateSimulationRequest) {
  return post<SimulationDetail>(ENDPOINTS.simulations.base(preSurveyId), body)
}

/** Bản rút gọn, không có toạ độ tấm */
export function listSimulations(preSurveyId: string) {
  return get<SimulationListItem[]>(ENDPOINTS.simulations.base(preSurveyId))
}

/** Bản đầy đủ để vẽ 2D / 3D */
export function getSimulation(preSurveyId: string, simulationId: string) {
  return get<SimulationDetail>(ENDPOINTS.simulations.byId(preSurveyId, simulationId))
}
