import {
  INSTALLATION_SOURCES,
  MOUNTING_TYPES,
  NO_PANEL_REASONS,
  PROVIDER_FAILURES,
  SIMULATION_WARNINGS,
} from '@/common/simulation'
import type { Tone } from '@/components/common/ui/badge'
import type {
  EnergyInfo,
  InstallationValue,
  ProviderFailure,
  SelectedSimulation,
  SimulationView,
  SimulationWarning,
} from '@/types/res/simulationsRes'

export function mountingLabel(type: string | null | undefined) {
  const known = MOUNTING_TYPES.find((mounting) => mounting.value === type?.toUpperCase())
  return known?.label ?? type ?? '—'
}

/** Backend chỉ còn bản tóm tắt của mô phỏng đã chọn (kết quả đầy đủ đã hết hạn) */
export function isSummaryOnly(view: SimulationView): view is SelectedSimulation {
  return view.source === 'SUMMARY'
}

// PARTIALLY_COMPLETED: xếp tấm xong nhưng thiếu sản lượng hoặc thiếu dữ liệu khí hậu
export function simulationStatusMeta(
  status: string | null | undefined,
  energyStatus?: string | null,
  climateStatus?: string | null,
): { label: string; tone: Tone } {
  if (status === 'COMPLETED') return { label: 'Hoàn tất', tone: 'neutral' }
  if (status === 'PARTIALLY_COMPLETED') {
    if (energyStatus === 'SUCCEEDED' && climateStatus !== 'SUCCEEDED') {
      return { label: 'Thiếu số liệu khí hậu', tone: 'warn' }
    }
    if (energyStatus === 'NOT_APPLICABLE') return { label: 'Không có sản lượng', tone: 'warn' }
    return { label: 'Thiếu số liệu sản lượng', tone: 'warn' }
  }
  return { label: status || '—', tone: 'neutral' }
}

export function noPanelsText(reason: string | null | undefined) {
  if (!reason) return 'Không xếp được tấm nào trên mặt lắp này.'
  return NO_PANEL_REASONS[reason] ?? `Không xếp được tấm nào (${reason}).`
}

export function providerFailureText(failure: ProviderFailure | null | undefined) {
  if (!failure) return null
  return PROVIDER_FAILURES[failure.code] ?? failure.code
}

/** Không bao giờ hiện 0 kWh khi chưa có dữ liệu */
export function energyMissingText(energy: EnergyInfo) {
  if (energy.status === 'NOT_APPLICABLE') return 'Không xếp được tấm nào nên không tính sản lượng.'
  if (energy.reason === 'LOCATION_MISSING') return 'Địa điểm chưa có toạ độ nên chưa tính được sản lượng.'
  const failure = energy.scenarios.map((scenario) => providerFailureText(scenario.failure)).find(Boolean)
  if (failure) return `Chưa lấy được số liệu bức xạ từ PVGIS: ${failure}. Chạy lại sau ít phút.`
  if (energy.status === 'FAILED') return 'Chưa lấy được số liệu bức xạ từ PVGIS. Chạy lại sau ít phút.'
  return 'Chưa có số liệu sản lượng.'
}

export function installationSourceLabel(value: InstallationValue) {
  return INSTALLATION_SOURCES[value.source] ?? value.source
}

const twoDecimals = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** Số dạng chữ trong câu tiếng Anh ("12.5") thành số kiểu Việt ("12,5") */
function vietnameseNumber(raw: string | undefined) {
  if (raw === undefined || Number.isNaN(Number(raw))) return raw
  return twoDecimals.format(Number(raw))
}

/** Cảnh báo có số trong câu: lấy số từ câu tiếng Anh. Mã chưa biết thì trả null để dùng câu gốc */
function warningWithNumbers(warning: SimulationWarning): string | null {
  if (warning.code === 'DECLARED_AREA_DIFFERS') {
    const match = /area ([\d.]+) m² differs from the drawn surface area ([\d.]+) m²/.exec(warning.message)
    if (!match) return 'Diện tích khai báo khác diện tích mặt lắp đã vẽ. Mô phỏng dùng mặt lắp đã vẽ.'
    const declared = vietnameseNumber(match[1])
    const drawn = vietnameseNumber(match[2])
    return `Diện tích khai báo ${declared} m² khác diện tích mặt lắp đã vẽ ${drawn} m². Mô phỏng dùng mặt lắp đã vẽ.`
  }
  if (warning.code === 'RACK_SUPPORT_HEIGHT_ABOVE_PRELIMINARY_THRESHOLD') {
    const pattern = /edge is ([\d.]+) m above the surface, above the preliminary review threshold of ([\d.]+) m/
    const match = pattern.exec(warning.message)
    if (!match) return 'Mép cao của tấm vượt ngưỡng chiều cao cần kỹ sư xem lại giá đỡ.'
    const height = vietnameseNumber(match[1])
    const threshold = vietnameseNumber(match[2])
    return `Mép cao của tấm cách mặt mái ${height} m, vượt ngưỡng ${threshold} m cần kỹ sư xem lại giá đỡ.`
  }
  if (warning.code === 'ROW_GAP_BELOW_SHADE_ESTIMATE') {
    const match = /Row gap ([\d.]+) mm is below the advisory shading estimate of ([\d.]+) mm/.exec(warning.message)
    if (!match) return 'Khoảng cách hàng nhỏ hơn mức ước tính để tránh bóng đổ giữa các hàng.'
    const gap = vietnameseNumber(match[1])
    const estimate = vietnameseNumber(match[2])
    return `Khoảng cách hàng ${gap} mm nhỏ hơn mức ước tính để tránh bóng đổ ${estimate} mm (ngày hạ chí và đông chí, 9 giờ đến 15 giờ).`
  }
  if (warning.code === 'ENERGY_PROVIDER_FAILED') {
    return 'PVGIS chưa trả sản lượng cho ít nhất một kịch bản; chạy lại sau ít phút.'
  }
  if (warning.code === 'CLIMATE_PROVIDER_FAILED') return 'Chưa lấy được số liệu khí hậu từ NASA POWER.'
  return null
}

export function warningText(warning: SimulationWarning) {
  return SIMULATION_WARNINGS[warning.code] ?? warningWithNumbers(warning) ?? warning.message
}

// So khớp theo đầu câu của SimulationLimitations.For
const LIMITATIONS: [prefix: string, text: string][] = [
  ['Preliminary estimate.', 'Đây là ước tính sơ bộ. Cần kỹ sư khảo sát trước khi quyết định lắp đặt.'],
  [
    'Energy values are PVGIS',
    'Sản lượng là ước tính năm điển hình của PVGIS từ số liệu lịch sử, không phải dự báo hay cam kết.',
  ],
  ['Climate values are NASA POWER', 'Số liệu khí hậu là trung bình lịch sử của NASA POWER, chỉ để tham khảo.'],
  ['The layout is a best-found', 'Bố trí là phương án tốt nhất tìm được ở bước sơ bộ, chưa chắc là tối ưu.'],
  [
    'Rack row shading',
    'Bóng đổ giữa các hàng khung chỉ ước tính cho ngày hạ chí và đông chí (9 giờ đến 15 giờ), không bảo đảm không bị che quanh năm.',
  ],
  ['Shading from obstacles', 'Chưa tính bóng đổ của vật cản và của đầu hàng.'],
  ['Structural, mounting-system', 'Chưa kiểm tra kết cấu, hệ khung giá đỡ, quy chuẩn xây dựng và phòng cháy.'],
  ['Installation spacing values are in millimetres', 'Khoảng cách lắp đặt tính bằng mm; mỗi giá trị ghi rõ nguồn.'],
]

export function limitationText(text: string) {
  const known = LIMITATIONS.find(([prefix]) => text.startsWith(prefix))
  return known ? known[1] : text
}

/** Giả định của ước tính sản lượng. Câu có số nên so khớp bằng regex, câu lạ thì giữ nguyên */
export function assumptionText(text: string) {
  const lossMatch = /^System losses ([\d.]+)% \((site-specified|PVGIS documented default)\)\.$/.exec(text)
  if (lossMatch) {
    const source = lossMatch[2] === 'site-specified' ? 'nhập khi chạy mô phỏng' : 'mặc định của PVGIS'
    return `Tổn hao hệ thống ${vietnameseNumber(lossMatch[1])}% (${source}).`
  }

  const technologyMatch = /^Module technology '([^']+)'/.exec(text)
  if (technologyMatch) {
    return `Công nghệ tấm pin "${technologyMatch[1]}" (mặc định của PVGIS vì danh mục chưa có trường công nghệ).`
  }

  const horizonMatch = /^Terrain horizon (included|excluded)/.exec(text)
  if (horizonMatch) {
    const included = horizonMatch[1] === 'included' ? 'Có' : 'Không'
    return `${included} tính địa hình che chân trời (PVGIS); chưa tính bóng của vật cản trên mái.`
  }

  if (text.startsWith('Flush mounting with an air gap')) {
    return 'Áp mái có khe thông gió nằm giữa hai kịch bản của PVGIS: "áp sát mái" (không thông gió) và "thông gió tự do". Kịch bản áp sát mái được lấy làm ước tính thận trọng; đây là giả định sơ bộ, không phải mức thấp nhất được bảo đảm.'
  }
  if (text.startsWith('Rack mounting uses PVGIS')) {
    return 'Khung nghiêng dùng kịch bản "thông gió tự do" của PVGIS (không khí lưu thông sau tấm).'
  }
  return text
}

export const ENERGY_DISCLAIMER =
  'Ước tính năm điển hình của PVGIS từ số liệu lịch sử, không phải dự báo cho một năm cụ thể và không phải cam kết sản lượng.'
export const CLIMATE_DISCLAIMER =
  'Trung bình tháng trong quá khứ của NASA POWER, chỉ để tham khảo; không dùng để tính sản lượng.'

const wholeNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const exactlyOneDecimal = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

type MaybeNumber = number | null | undefined

/** Số kWh, làm tròn tới số nguyên */
export function formatKwh(value: MaybeNumber) {
  return value == null ? '—' : wholeNumber.format(value)
}

/** Tối đa 1 chữ số lẻ */
export function formatOne(value: MaybeNumber) {
  return value == null ? '—' : oneDecimal.format(value)
}

/** Luôn đúng 1 chữ số lẻ (28,0 cạnh 26,2) để cột số trong bảng thẳng hàng */
export function formatFixed1(value: MaybeNumber) {
  return value == null ? '—' : exactlyOneDecimal.format(value)
}

/** Tối đa 2 chữ số lẻ */
export function formatTwo(value: MaybeNumber) {
  return value == null ? '—' : twoDecimals.format(value)
}

export function formatM2(value: MaybeNumber) {
  return value == null ? '—' : `${twoDecimals.format(value)} m²`
}

export function formatMm(value: MaybeNumber) {
  return value == null ? '—' : `${wholeNumber.format(value)} mm`
}

export const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
export const MONTH_NAMES = MONTHS.map((_, index) => `Tháng ${index + 1}`)
