import type { SolarAdvisorRequest } from '@/types/req/chatReq'

// Số liệu nhập thêm cho trợ lý cấu hình (SolarAdvisorRequest.Problem của backend). Ô bỏ trống là không gửi; số liệu đã nói trong
// các câu trước của phiên backend tự dùng lại. Không import giá trị qua "@/" để chạy được bằng node --test

export type AdvisorForm = { roofArea: string; budget: string; monthlyKwh: string; wantsBattery: boolean }

export const EMPTY_ADVISOR: AdvisorForm = { roofArea: '', budget: '', monthlyKwh: '', wantsBattery: false }

/** "1.500.000" hoặc "50,5" thành số; trống là null, sai là NaN */
function readNumber(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  // Dấu chấm là phân cách nghìn, dấu phẩy là phần lẻ theo cách viết của Việt Nam
  const normalized = t
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : Number.NaN
}

export const hasAdvisorInput = (form: AdvisorForm) =>
  Boolean(form.roofArea.trim() || form.budget.trim() || form.monthlyKwh.trim() || form.wantsBattery)

/** Lỗi theo ô, cùng khoảng giá trị với backend */
export function advisorFormErrors(form: AdvisorForm): Partial<Record<keyof AdvisorForm, string>> {
  const errors: Partial<Record<keyof AdvisorForm, string>> = {}
  const area = readNumber(form.roofArea)
  if (area !== null && !(area > 0 && area <= 100_000)) errors.roofArea = 'Diện tích lớn hơn 0 và tối đa 100.000 m².'
  const budget = readNumber(form.budget)
  if (budget !== null && !(budget >= 1_000_000 && budget <= 100_000_000_000))
    errors.budget = 'Ngân sách từ 1.000.000 đến 100.000.000.000 đồng.'
  const kwh = readNumber(form.monthlyKwh)
  if (kwh !== null && !(kwh > 0 && kwh <= 1_000_000))
    errors.monthlyKwh = 'Điện tiêu thụ lớn hơn 0 và tối đa 1.000.000 kWh.'
  return errors
}

/** Thân `advisor` gửi kèm câu hỏi; không có ô nào thì null (không gửi) */
export function advisorBody(form: AdvisorForm): SolarAdvisorRequest | null {
  if (!hasAdvisorInput(form)) return null
  return {
    roofAreaM2: readNumber(form.roofArea),
    budgetVnd: readNumber(form.budget),
    monthlyConsumptionKwh: readNumber(form.monthlyKwh),
    wantsBattery: form.wantsBattery || null,
  }
}
