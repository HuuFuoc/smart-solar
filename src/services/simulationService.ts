import type { CreateSimulationRequest } from '@/types/req/simulationsReq'
import type { SimulationDetail, SimulationListItem } from '@/types/res/simulationsRes'
import { apiGet, apiPost } from '@/services/api/client'

/*
 * Mô phỏng bố trí tấm pin + sản lượng do backend tính (PVGIS, NASA POWER) và lưu thành từng lần chạy.
 * - Tạo: chỉ khách hàng sở hữu, bản nháp còn là Draft; tối đa 10 lần / phút / người (429 + Retry-After).
 * - Đọc: khách hàng sở hữu hoặc sales đã nhận yêu cầu khảo sát của bản đánh giá đó.
 * Backend tự chọn lần vừa tạo hoặc dùng lại làm mô phỏng chính (isSelected); không có API chọn lại lần khác.
 */

const base = (preSurveyId: string) => `/pre-surveys/${encodeURIComponent(preSurveyId)}/simulations`

/** POST – 201 tạo mới, 200 dùng lại lần chạy cùng đầu vào; có thể chờ nhà cung cấp dữ liệu tới ~25 giây. */
export function createSimulation(preSurveyId: string, body: CreateSimulationRequest) {
  return apiPost<SimulationDetail>(base(preSurveyId), body)
}

/** GET – mọi lần chạy, mới nhất trước, bản rút gọn (không có toạ độ tấm). */
export function listSimulations(preSurveyId: string) {
  return apiGet<SimulationListItem[]>(base(preSurveyId))
}

/** GET – bản đầy đủ để vẽ 2D / 3D, biểu đồ sản lượng và cảnh báo; payload có thể lớn (tới 5.000 tấm). */
export function getSimulation(preSurveyId: string, simulationId: string) {
  return apiGet<SimulationDetail>(`${base(preSurveyId)}/${encodeURIComponent(simulationId)}`)
}
