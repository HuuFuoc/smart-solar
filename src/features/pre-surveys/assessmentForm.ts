import { z } from 'zod'
import { HCM_PROVINCE } from '@/services/provinceService'
import type { ApiError } from '@/services/api/errors'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'

// Form của bước hồ sơ và bước địa điểm.
// Ô nhập giữ dạng chuỗi, schema vừa kiểm tra vừa đổi form sang đúng kiểu request của backend.

export type ProfileForm = {
  /** '1' cá nhân, '2' doanh nghiệp */
  customerType: '1' | '2'
  companyName: string
  taxCode: string
  note: string
}

// Chỉ nhận công trình ở TP.HCM nên tỉnh cố định.
// `district` (quận / huyện) không còn dùng, chỉ giữ để mở lại địa điểm cũ mà không bị coi là đã sửa.
export type SiteForm = {
  name: string
  province: string
  district: string
  ward: string
  streetLine: string
  latitude: string
  longitude: string
  installationSurfaceType: string
  surfaceMaterial: string
  note: string
}

export const EMPTY_PROFILE: ProfileForm = { customerType: '2', companyName: '', taxCode: '', note: '' }

export const EMPTY_SITE: SiteForm = {
  name: '',
  province: HCM_PROVINCE.name,
  district: '',
  ward: '',
  streetLine: '',
  latitude: '',
  longitude: '',
  installationSurfaceType: '1',
  surfaceMaterial: '',
  note: '',
}

/** Lỗi theo từng ô của form */
export type FormErrors<F> = Partial<Record<keyof F, string>>

/** Địa điểm đã lưu thành form, để mở lại trang không phải nhập lại */
export function siteToForm(site: CreatePropertySiteRequest): SiteForm {
  return {
    name: site.name ?? '',
    province: site.province ?? '',
    district: site.district ?? '',
    ward: site.ward ?? '',
    streetLine: site.streetLine ?? '',
    latitude: site.latitude == null ? '' : String(site.latitude),
    longitude: site.longitude == null ? '' : String(site.longitude),
    installationSurfaceType: String(site.installationSurfaceType ?? 1),
    surfaceMaterial: site.surfaceMaterial ?? '',
    note: site.note ?? '',
  }
}

/** Chuỗi rỗng thành null, để backend hiểu là "không khai" */
const text = (value: string) => value.trim() || null

/** Cho phép dấu phẩy thập phân: "12,5" là 12.5. Ô trống trả về null, gõ sai trả về NaN */
export function toNumber(value: string) {
  const raw = value.trim().replace(',', '.')
  return raw === '' ? null : Number(raw)
}

/** Đọc số có dấu chấm ngăn hàng nghìn: "1.200" là 1200. Không dùng cho toạ độ hay góc */
export function toArea(value: string) {
  const raw = value.trim()
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) return Number(raw.replace(/\./g, '').replace(',', '.'))
  return toNumber(raw)
}

type Range = {
  label: string
  unit?: string
  min: number
  max: number
  minExclusive?: boolean
  parse?: (value: string) => number | null
}

/** Câu lỗi của một ô số, hoặc null nếu hợp lệ */
function numberIssue(value: string, range: Range, required: boolean) {
  const n = (range.parse ?? toNumber)(value)
  if (n === null) return required ? `Nhập ${range.label}.` : null
  // isFinite loại cả NaN lẫn "Infinity" / "1e400"
  if (!Number.isFinite(n)) return `Nhập ${range.label} bằng số.`
  const unit = range.unit ? ` ${range.unit}` : ''
  if (range.minExclusive ? n <= range.min : n < range.min) {
    return range.minExclusive
      ? `${capitalize(range.label)} phải lớn hơn ${range.min}${unit}.`
      : `${capitalize(range.label)} từ ${range.min} đến ${range.max}${unit}.`
  }
  if (n > range.max)
    return `Kiểm tra lại ${range.label}; tối đa ${new Intl.NumberFormat('vi-VN').format(range.max)}${unit}.`
  return null
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function issue<F>(ctx: z.RefinementCtx, path: keyof F, message: string | null) {
  if (message) ctx.addIssue({ code: 'custom', path: [path as string], message })
}

// Luật kiểm tra lấy theo validator của backend.
// Riêng toạ độ thì bắt buộc thêm, vì backend cần toạ độ để xếp lịch khảo sát.

export const profileSchema = z
  .object({ customerType: z.enum(['1', '2']), companyName: z.string(), taxCode: z.string(), note: z.string() })
  .transform((f): CreateCustomerProfileRequest => ({
    customerType: f.customerType === '2' ? 2 : 1,
    companyName: f.customerType === '2' ? text(f.companyName) : null,
    taxCode: text(f.taxCode),
    note: text(f.note),
  }))

export const siteSchema = z
  .object({
    name: z.string().trim().min(1, 'Đặt tên cho địa điểm, ví dụ "Nhà xưởng Bình Dương".'),
    province: z.string(),
    district: z.string(),
    ward: z.string().trim().min(1, 'Chọn phường, xã.'),
    streetLine: z.string(),
    latitude: z.string(),
    longitude: z.string(),
    installationSurfaceType: z.enum(['1', '2', '3', '4', '5'], { error: 'Chọn bề mặt lắp đặt.' }),
    surfaceMaterial: z.string(),
    note: z.string(),
  })
  .superRefine((f, ctx) => {
    issue<SiteForm>(ctx, 'latitude', numberIssue(f.latitude, { label: 'vĩ độ', min: -90, max: 90 }, true))
    issue<SiteForm>(ctx, 'longitude', numberIssue(f.longitude, { label: 'kinh độ', min: -180, max: 180 }, true))
    if (toNumber(f.latitude) === 0 && toNumber(f.longitude) === 0)
      issue<SiteForm>(ctx, 'latitude', 'Toạ độ (0, 0) không phải vị trí công trình. Lấy toạ độ trên Google Maps.')
  })
  .transform((f): CreatePropertySiteRequest => ({
    name: text(f.name),
    province: HCM_PROVINCE.name,
    district: null,
    ward: text(f.ward),
    streetLine: text(f.streetLine),
    latitude: toNumber(f.latitude),
    longitude: toNumber(f.longitude),
    installationSurfaceType: Number(f.installationSurfaceType) as CreatePropertySiteRequest['installationSurfaceType'],
    surfaceMaterial: text(f.surfaceMaterial),
    note: text(f.note),
  }))

export function check<F, Out>(
  schema: z.ZodType<Out>,
  form: F,
): { data: Out; errors?: undefined } | { data?: undefined; errors: FormErrors<F> } {
  const result = schema.safeParse(form)
  if (result.success) return { data: result.data }
  const errors: FormErrors<F> = {}
  for (const i of result.error.issues) {
    const key = i.path[0] as keyof F | undefined
    if (key !== undefined && !errors[key]) errors[key] = i.message
  }
  return { errors }
}

/** Đổi lỗi theo field của server (PascalCase, có thể kèm tiền tố "request.") sang lỗi theo ô của form */
export function serverFieldErrors<F extends object>(error: ApiError, form: F): FormErrors<F> {
  const errors: FormErrors<F> = {}
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    const last = field.split('.').pop() ?? field
    const key = (last.charAt(0).toLowerCase() + last.slice(1)) as keyof F
    if (key in form && !errors[key]) errors[key] = message
  }
  return errors
}
