import type { MountingType } from '@/common/simulation'
import type { ApiError } from '@/services/api/errors'
import type { CreateSimulationRequest } from '@/types/req/simulationsReq'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { capitalize, formatNumber, parseGroupedNumber, readGroupedNumber } from '@/utils/number'

// Form cấu hình một lần mô phỏng (POST /api/pre-surveys/{id}/simulations).
// Ô để trống thì gửi null để backend dùng giá trị mặc định.
// Luật kiểm tra theo CreateSimulationCommandValidator của backend.
// Số được đọc kiểu Việt ("1.000" là một nghìn), vì giao diện in số theo kiểu đó và khách hay chép lại.

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

type SpacingFieldInfo = {
  field: SpacingField
  label: string
  /** Câu gợi ý dưới ô */
  hint: (mounting: MountingType) => string
  /** Số mặc định hiện mờ trong ô */
  placeholder: (mounting: MountingType) => string
  max: number
  /** Chỉ có ở kiểu khung nghiêng */
  rackOnly?: boolean
}

// Số mặc định chỉ hiện làm placeholder, không điền sẵn vào ô.
// Điền sẵn thì gửi lên thành số của khách, và kết quả mất nguồn "mặc định".
export const SPACING_FIELDS: SpacingFieldInfo[] = [
  {
    field: 'panelGapMm',
    label: 'Khe giữa hai tấm',
    hint: () => 'Mặc định 20 mm.',
    placeholder: () => '20',
    max: 5000,
  },
  {
    field: 'rowGapMm',
    label: 'Khoảng cách giữa hai hàng',
    hint: (mounting) => {
      if (mounting === 'RACK') return 'Mặc định tự tính theo bóng nắng (không có toạ độ thì 1.000 mm).'
      return 'Mặc định 20 mm.'
    },
    placeholder: (mounting) => (mounting === 'RACK' ? 'Tự tính' : '20'),
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
export function canSimulate(product: ProductResponse) {
  const active = product.status?.toUpperCase() === 'ACTIVE'
  const hasSize = (product.widthMm ?? 0) > 0 && (product.heightMm ?? 0) > 0
  const hasPower = (product.ratedPowerW ?? 0) > 0
  return active && hasSize && hasPower
}

/** Câu lỗi khi số trong ô nằm ngoài khoảng [min, max], hoặc null nếu hợp lệ */
function checkRange(text: string, label: string, min: number, max: number, required: boolean) {
  const value = parseGroupedNumber(text)
  if (value === null) return required ? `Nhập ${label}.` : null
  if (!Number.isFinite(value)) return `Nhập ${label} bằng số.`
  if (value < min || value > max) return `${capitalize(label)} từ ${min} đến ${formatNumber(max)}.`
  return null
}

export function validateSimulation(form: SimulationForm): SimulationErrors {
  const errors: SimulationErrors = {}
  // Mỗi ô chỉ giữ lỗi đầu tiên tìm thấy
  const addError = (field: keyof SimulationForm, message: string | null) => {
    if (message && !errors[field]) errors[field] = message
  }

  if (!form.productId) addError('productId', 'Chọn tấm pin.')

  const isRack = form.mountingType === 'RACK'
  if (isRack) {
    addError('panelTiltDegree', checkRange(form.panelTiltDegree, 'góc nghiêng tấm (độ)', 0, 90, true))
    if (!form.panelAzimuthDegree.trim()) addError('panelAzimuthDegree', 'Chọn hướng tấm pin.')
  }

  for (const spacing of SPACING_FIELDS) {
    if (spacing.rackOnly && !isRack) continue
    const label = `${spacing.label.toLowerCase()} (mm)`
    addError(spacing.field, checkRange(form[spacing.field], label, 0, spacing.max, false))
  }

  addError('systemLossPercent', checkRange(form.systemLossPercent, 'tổn hao hệ thống (%)', 0, 50, false))
  return errors
}

/** Body gửi backend (form đã qua validateSimulation). Kiểu FLUSH không gửi góc, hướng riêng và rackLowEdgeClearanceMm */
export function toSimulationRequest(form: SimulationForm, expectedGeometryVersion: number): CreateSimulationRequest {
  const isRack = form.mountingType === 'RACK'
  return {
    expectedGeometryVersion,
    productId: form.productId,
    mountingType: form.mountingType,
    panelTiltDegree: isRack ? readGroupedNumber(form.panelTiltDegree) : null,
    panelAzimuthDegree: isRack ? readGroupedNumber(form.panelAzimuthDegree) : null,
    installation: {
      panelGapMm: readGroupedNumber(form.panelGapMm),
      rowGapMm: readGroupedNumber(form.rowGapMm),
      edgeSetbackMm: readGroupedNumber(form.edgeSetbackMm),
      obstacleClearanceMm: readGroupedNumber(form.obstacleClearanceMm),
      rackLowEdgeClearanceMm: isRack ? readGroupedNumber(form.rackLowEdgeClearanceMm) : null,
    },
    systemLossPercent: readGroupedNumber(form.systemLossPercent),
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

/** "Installation.PanelGapMm" hoặc "panelGapMm" thành ô "panelGapMm" của form */
function toFormField(serverField: string) {
  const lastPart = serverField.split('.').pop() ?? serverField
  return SERVER_FIELDS[lastPart.toLowerCase()]
}

/** Tên tham số trong mảng `details` của lỗi 422 ({ code, parameter, message }) */
function detailParameters(details: unknown): string[] {
  if (!Array.isArray(details)) return []
  const parameters: string[] = []
  for (const item of details) {
    if (item && typeof item === 'object' && 'parameter' in item) {
      const parameter = (item as { parameter?: unknown }).parameter
      if (typeof parameter === 'string') parameters.push(parameter)
    }
  }
  return parameters
}

/**
 * Đánh dấu các ô bị server báo lỗi. Chỉ đánh dấu bằng câu ngắn,
 * vì câu lỗi đầy đủ đã hiện cạnh nút chạy (lặp lại ở ô thì thành báo lỗi 2 lần).
 */
export function serverSimulationErrors(error: ApiError): SimulationErrors {
  const errors: SimulationErrors = {}
  const serverFields = [...Object.keys(error.fieldErrors), ...detailParameters(error.details)]
  for (const serverField of serverFields) {
    const field = toFormField(serverField)
    if (field) errors[field] = 'Kiểm tra lại ô này.'
  }
  return errors
}
