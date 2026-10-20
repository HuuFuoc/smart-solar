import { toArea } from '@/features/pre-surveys/assessmentForm'
import type { MountingType } from '@/common/simulation'
import type { ApiError } from '@/services/api/errors'
import type { CreateSimulationRequest } from '@/types/req/simulationsReq'
import type { ProductResponse } from '@/types/res/adminProductsRes'

/*
 * Form cấu hình một lần mô phỏng (POST /api/pre-surveys/{id}/simulations). Ô trống = để backend dùng giá trị mặc định
 * đã giải (gửi null). Luật kiểm tra bám CreateSimulationCommandValidator + SolarSimulationOptions.Limits (image 09/10/2026):
 * RACK bắt buộc góc nghiêng 0–90° và hướng 0–360°; khoảng cách 0–5.000 mm (mép thấp khung 0–3.000 mm, chỉ cho RACK);
 * tổn hao hệ thống 0–50%. Mọi khoảng cách tính bằng mm (20 mm = 2 cm).
 */

export type SpacingField = 'panelGapMm' | 'rowGapMm' | 'edgeSetbackMm' | 'obstacleClearanceMm' | 'rackLowEdgeClearanceMm'

export type SimulationForm = {
  productId: string
  mountingType: MountingType
  panelTiltDegree: string
  panelAzimuthDegree: string
  systemLossPercent: string
} & Record<SpacingField, string>

export const EMPTY_SIMULATION_FORM: SimulationForm = {
  productId: '',
  mountingType: 'FLUSH',
  panelTiltDegree: '',
  panelAzimuthDegree: '',
  systemLossPercent: '',
  panelGapMm: '',
  rowGapMm: '',
  edgeSetbackMm: '',
  obstacleClearanceMm: '',
  rackLowEdgeClearanceMm: '',
}

/** Mặc định sơ bộ của backend (appsettings SolarSimulation.PreliminaryDefaults) – chỉ để gợi ý trong ô, không gửi đi. */
/*
  Ô để trống thì backend dùng giá trị mặc định (kết quả ghi rõ nguồn "mặc định"). Số mặc định hiện mờ ngay trong ô
  (`placeholder`) để khách thấy để trống là bao nhiêu – người test 10/10/2026: "chỗ để trống là mặc định 20 mm hả, không biết".
  Không điền sẵn số vào ô: điền sẵn thì gửi lên thành số khách nhập, mất nguồn "mặc định" trong kết quả.
*/
export const SPACING_FIELDS: {
  field: SpacingField
  label: string
  hint: (mounting: MountingType) => string
  placeholder: (mounting: MountingType) => string
  max: number
  rackOnly?: boolean
}[] = [
  { field: 'panelGapMm', label: 'Khe giữa hai tấm', hint: () => 'Mặc định 20 mm.', placeholder: () => '20', max: 5000 },
  {
    field: 'rowGapMm',
    label: 'Khoảng cách giữa hai hàng',
    hint: (m) => (m === 'RACK' ? 'Mặc định tự tính theo bóng nắng (không có toạ độ thì 1.000 mm).' : 'Mặc định 20 mm.'),
    placeholder: (m) => (m === 'RACK' ? 'Tự tính' : '20'),
    max: 5000,
  },
  { field: 'edgeSetbackMm', label: 'Lùi vào từ mép mái', hint: () => 'Mặc định 300 mm.', placeholder: () => '300', max: 5000 },
  { field: 'obstacleClearanceMm', label: 'Cách vật cản', hint: () => 'Mặc định 300 mm.', placeholder: () => '300', max: 5000 },
  {
    field: 'rackLowEdgeClearanceMm',
    label: 'Mép thấp khung cách mái',
    hint: () => 'Mặc định 200 mm.',
    placeholder: () => '200',
    max: 3000,
    rackOnly: true,
  },
]

/** Tổn hao hệ thống để trống: 14% (mặc định của PVGIS). */
export const DEFAULT_SYSTEM_LOSS_PERCENT = '14'

export type SimulationErrors = Partial<Record<keyof SimulationForm, string>>

/** Tấm pin chạy mô phỏng được: đang bán, đủ công suất và kích thước (backend vẫn kiểm lại). */
export function canSimulate(p: ProductResponse) {
  return p.status?.toUpperCase() === 'ACTIVE' && (p.widthMm ?? 0) > 0 && (p.heightMm ?? 0) > 0 && (p.ratedPowerW ?? 0) > 0
}

/*
  Đọc số kiểu Việt: "1.000" là một nghìn (giao diện in 1000 mm thành "1.000 mm", khách chép lại đúng như vậy), "12,5" là
  mười hai phẩy năm. Đọc "1.000" thành 1 mm thì backend xếp hàng tấm sát nhau 1 mm mà không báo lỗi (rà code 09/10/2026).
*/
const parse = toArea

function issue(value: string, label: string, min: number, max: number, required: boolean) {
  const n = parse(value)
  if (n === null) return required ? `Nhập ${label}.` : null
  if (!Number.isFinite(n)) return `Nhập ${label} bằng số.`
  if (n < min || n > max) return `${label.charAt(0).toUpperCase()}${label.slice(1)} từ ${min} đến ${new Intl.NumberFormat('vi-VN').format(max)}.`
  return null
}

export function validateSimulation(form: SimulationForm): SimulationErrors {
  const errors: SimulationErrors = {}
  const add = (key: keyof SimulationForm, message: string | null) => {
    if (message && !errors[key]) errors[key] = message
  }
  if (!form.productId) add('productId', 'Chọn tấm pin.')
  const rack = form.mountingType === 'RACK'
  if (rack) {
    add('panelTiltDegree', issue(form.panelTiltDegree, 'góc nghiêng tấm (độ)', 0, 90, true))
    if (!form.panelAzimuthDegree.trim()) add('panelAzimuthDegree', 'Chọn hướng tấm pin.')
  }
  for (const s of SPACING_FIELDS) {
    if (s.rackOnly && !rack) continue
    add(s.field, issue(form[s.field], `${s.label.toLowerCase()} (mm)`, 0, s.max, false))
  }
  add('systemLossPercent', issue(form.systemLossPercent, 'tổn hao hệ thống (%)', 0, 50, false))
  return errors
}

const value = (raw: string) => {
  const n = parse(raw)
  return n === null || !Number.isFinite(n) ? null : n
}

/** Body gửi backend (đã qua validateSimulation). FLUSH không gửi góc riêng và không được gửi rackLowEdgeClearanceMm. */
export function toSimulationRequest(form: SimulationForm, expectedGeometryVersion: number): CreateSimulationRequest {
  const rack = form.mountingType === 'RACK'
  return {
    expectedGeometryVersion,
    productId: form.productId,
    mountingType: form.mountingType,
    panelTiltDegree: rack ? value(form.panelTiltDegree) : null,
    panelAzimuthDegree: rack ? value(form.panelAzimuthDegree) : null,
    installation: {
      panelGapMm: value(form.panelGapMm),
      rowGapMm: value(form.rowGapMm),
      edgeSetbackMm: value(form.edgeSetbackMm),
      obstacleClearanceMm: value(form.obstacleClearanceMm),
      rackLowEdgeClearanceMm: rack ? value(form.rackLowEdgeClearanceMm) : null,
    },
    systemLossPercent: value(form.systemLossPercent),
  }
}

/* Tên field của backend (FluentValidation PascalCase "Installation.PanelGapMm", hoặc `parameter` camelCase trong
   details của lỗi 422) → khoá của form. */
const SERVER_FIELDS: Record<string, keyof SimulationForm> = {
  productid: 'productId',
  mountingtype: 'mountingType',
  paneltiltdegree: 'panelTiltDegree',
  panelazimuthdegree: 'panelAzimuthDegree',
  systemlosspercent: 'systemLossPercent',
  panelgapmm: 'panelGapMm',
  rowgapmm: 'rowGapMm',
  edgesetbackmm: 'edgeSetbackMm',
  obstacleclearancemm: 'obstacleClearanceMm',
  racklowedgeclearancemm: 'rackLowEdgeClearanceMm',
}

const formKey = (raw: string) => SERVER_FIELDS[(raw.split('.').pop() ?? raw).toLowerCase()]

/** Lỗi theo field từ server → ô của form. Câu của server là tiếng Anh nên ô chỉ được đánh dấu bằng câu chung. */
export function serverSimulationErrors(error: ApiError): SimulationErrors {
  const errors: SimulationErrors = {}
  for (const raw of Object.keys(error.fieldErrors)) {
    const key = formKey(raw)
    if (key) errors[key] = 'Kiểm tra lại ô này.'
  }
  /*
    422 trả details là mảng { code, parameter, message }: chỉ đánh dấu ô bằng câu ngắn – câu lỗi đầy đủ đã hiện ở cạnh nút chạy,
    lặp lại ở ô là báo đỏ hai lần cho một sự việc (quy tắc màu của dự án; kiểm thử 09/10/2026).
  */
  if (Array.isArray(error.details)) {
    for (const item of error.details) {
      const parameter = item && typeof item === 'object' && 'parameter' in item ? (item as { parameter?: unknown }).parameter : null
      const key = typeof parameter === 'string' ? formKey(parameter) : undefined
      if (key) errors[key] = 'Kiểm tra lại ô này.'
    }
  }
  return errors
}
