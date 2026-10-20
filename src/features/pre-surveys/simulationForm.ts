import { toArea } from '@/features/pre-surveys/assessmentForm'
import type { MountingType } from '@/common/simulation'
import type { ApiError } from '@/services/api/errors'
import type { CreateSimulationRequest } from '@/types/req/simulationsReq'
import type { ProductResponse } from '@/types/res/adminProductsRes'

// Form cấu hình một lần mô phỏng (POST /api/pre-surveys/{id}/simulations).
// Ô để trống thì gửi null để backend dùng giá trị mặc định.
// Luật kiểm tra theo CreateSimulationCommandValidator của backend.

export type SpacingField =
  'panelGapMm' | 'rowGapMm' | 'edgeSetbackMm' | 'obstacleClearanceMm' | 'rackLowEdgeClearanceMm'

export type SimulationForm = {
  productId: string
  /** FLUSH: áp sát mái, RACK: khung nghiêng */
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

// Số mặc định chỉ hiện làm placeholder, không điền sẵn vào ô.
// Điền sẵn thì gửi lên thành số của khách, và kết quả mất nguồn "mặc định".
export const SPACING_FIELDS: {
  field: SpacingField
  label: string
  /** Câu gợi ý dưới ô */
  hint: (mounting: MountingType) => string
  /** Số mặc định hiện mờ trong ô */
  placeholder: (mounting: MountingType) => string
  max: number
  /** Chỉ có ở kiểu khung nghiêng */
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
  {
    field: 'edgeSetbackMm',
    label: 'Lùi vào từ mép mái',
    hint: () => 'Mặc định 300 mm.',
    placeholder: () => '300',
    max: 5000,
  },
  {
    field: 'obstacleClearanceMm',
    label: 'Cách vật cản',
    hint: () => 'Mặc định 300 mm.',
    placeholder: () => '300',
    max: 5000,
  },
  {
    field: 'rackLowEdgeClearanceMm',
    label: 'Mép thấp khung cách mái',
    hint: () => 'Mặc định 200 mm.',
    placeholder: () => '200',
    max: 3000,
    rackOnly: true,
  },
]

/** Tổn hao hệ thống mặc định (%) khi để trống */
export const DEFAULT_SYSTEM_LOSS_PERCENT = '14'

export type SimulationErrors = Partial<Record<keyof SimulationForm, string>>

/** Tấm pin dùng được cho mô phỏng: đang bán và có đủ công suất, kích thước */
export function canSimulate(p: ProductResponse) {
  return (
    p.status?.toUpperCase() === 'ACTIVE' && (p.widthMm ?? 0) > 0 && (p.heightMm ?? 0) > 0 && (p.ratedPowerW ?? 0) > 0
  )
}

// Số được đọc kiểu Việt ("1.000" là một nghìn), vì giao diện in số theo kiểu đó và khách hay chép lại
const parse = toArea

function issue(value: string, label: string, min: number, max: number, required: boolean) {
  const n = parse(value)
  if (n === null) return required ? `Nhập ${label}.` : null
  if (!Number.isFinite(n)) return `Nhập ${label} bằng số.`
  if (n < min || n > max)
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} từ ${min} đến ${new Intl.NumberFormat('vi-VN').format(max)}.`
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

/** Body gửi backend (form đã qua validateSimulation). Kiểu FLUSH không gửi góc, hướng riêng và rackLowEdgeClearanceMm */
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

// Tên field của backend (viết thường) đổi sang ô của form
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

/** Đánh dấu các ô bị server báo lỗi bằng câu ngắn, vì câu lỗi đầy đủ đã hiện cạnh nút chạy */
export function serverSimulationErrors(error: ApiError): SimulationErrors {
  const errors: SimulationErrors = {}
  for (const raw of Object.keys(error.fieldErrors)) {
    const key = formKey(raw)
    if (key) errors[key] = 'Kiểm tra lại ô này.'
  }
  // Lỗi 422 có `details` là mảng { code, parameter, message }
  if (Array.isArray(error.details)) {
    for (const item of error.details) {
      const parameter =
        item && typeof item === 'object' && 'parameter' in item ? (item as { parameter?: unknown }).parameter : null
      const key = typeof parameter === 'string' ? formKey(parameter) : undefined
      if (key) errors[key] = 'Kiểm tra lại ô này.'
    }
  }
  return errors
}
