import { z } from 'zod'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import type { ApiError } from '@/services/api/errors'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'
import { capitalize, formatNumber, parseDecimal } from '@/utils/number'

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
  /** Mã của phường, xã đã chọn trong danh sách, rỗng khi chưa chọn */
  communeCode: string
  streetLine: string
  latitude: string
  longitude: string
  installationSurfaceType: string
  surfaceMaterial: string
  note: string
}

export const EMPTY_PROFILE: ProfileForm = {
  customerType: '2',
  companyName: '',
  taxCode: '',
  note: '',
}

export const EMPTY_SITE: SiteForm = {
  name: '',
  province: HCM_PROVINCE.name,
  district: '',
  ward: '',
  communeCode: '',
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
    communeCode: site.communeCode ?? '',
    streetLine: site.streetLine ?? '',
    latitude: site.latitude == null ? '' : String(site.latitude),
    longitude: site.longitude == null ? '' : String(site.longitude),
    installationSurfaceType: String(site.installationSurfaceType ?? 1),
    surfaceMaterial: site.surfaceMaterial ?? '',
    note: site.note ?? '',
  }
}

/** Chuỗi rỗng thành null, để backend hiểu là "không khai" */
function textOrNull(value: string) {
  return value.trim() || null
}

/** Câu lỗi khi toạ độ trống, gõ sai hoặc nằm ngoài khoảng [min, max] */
function coordinateIssue(text: string, label: string, min: number, max: number) {
  const value = parseDecimal(text)
  if (value === null) return `Nhập ${label}.`
  if (!Number.isFinite(value)) return `Nhập ${label} bằng số.`
  if (value < min) return `${capitalize(label)} từ ${min} đến ${max}.`
  if (value > max) return `Kiểm tra lại ${label}; tối đa ${formatNumber(max)}.`
  return null
}

function addIssue(ctx: z.RefinementCtx, field: keyof SiteForm, message: string | null) {
  if (message) ctx.addIssue({ code: 'custom', path: [field], message })
}

// Luật kiểm tra lấy theo validator của backend.
// Riêng toạ độ và mã phường, xã thì bắt buộc thêm: toạ độ để ước tính sản lượng, mã phường để xếp kỹ thuật viên.

export const profileSchema = z
  .object({
    customerType: z.enum(['1', '2']),
    companyName: z.string(),
    taxCode: z.string(),
    note: z.string(),
  })
  .transform((form): CreateCustomerProfileRequest => {
    const isBusiness = form.customerType === '2'
    return {
      customerType: isBusiness ? 2 : 1,
      companyName: isBusiness ? textOrNull(form.companyName) : null,
      taxCode: textOrNull(form.taxCode),
      note: textOrNull(form.note),
    }
  })

export const siteSchema = z
  .object({
    name: z.string().trim().min(1, 'Đặt tên cho địa điểm, ví dụ "Nhà xưởng Bình Dương".'),
    province: z.string(),
    district: z.string(),
    ward: z.string().trim().min(1, 'Chọn phường, xã.'),
    communeCode: z.string(),
    streetLine: z.string(),
    latitude: z.string(),
    longitude: z.string(),
    installationSurfaceType: z.enum(['1', '2', '3', '4', '5'], {
      error: 'Chọn bề mặt lắp đặt.',
    }),
    surfaceMaterial: z.string(),
    note: z.string(),
  })
  .superRefine((form, ctx) => {
    // Gõ tay thì không có mã phường, xã mà backend cần để xếp kỹ thuật viên theo khu vực
    if (form.ward.trim() && !form.communeCode) addIssue(ctx, 'ward', 'Chọn phường, xã trong danh sách.')
    addIssue(ctx, 'latitude', coordinateIssue(form.latitude, 'vĩ độ', -90, 90))
    addIssue(ctx, 'longitude', coordinateIssue(form.longitude, 'kinh độ', -180, 180))
    // (0, 0) là giá trị mặc định khi bỏ trống, không phải vị trí thật
    if (parseDecimal(form.latitude) === 0 && parseDecimal(form.longitude) === 0) {
      addIssue(ctx, 'latitude', 'Toạ độ (0, 0) không phải vị trí công trình. Lấy toạ độ trên Google Maps.')
    }
  })
  .transform((form): CreatePropertySiteRequest => ({
    name: textOrNull(form.name),
    province: HCM_PROVINCE.name,
    provinceCode: HCM_PROVINCE.code,
    district: null,
    ward: textOrNull(form.ward),
    communeCode: form.communeCode,
    streetLine: textOrNull(form.streetLine),
    latitude: parseDecimal(form.latitude),
    longitude: parseDecimal(form.longitude),
    installationSurfaceType: Number(
      form.installationSurfaceType,
    ) as CreatePropertySiteRequest['installationSurfaceType'],
    surfaceMaterial: textOrNull(form.surfaceMaterial),
    note: textOrNull(form.note),
  }))

/** Kết quả kiểm tra form: hoặc có `data` (đã đổi sang request), hoặc có `errors` theo từng ô */
type CheckResult<F, Out> = { data: Out; errors?: undefined } | { data?: undefined; errors: FormErrors<F> }

/** Chạy schema trên form, mỗi ô chỉ giữ lỗi đầu tiên */
export function check<F, Out>(schema: z.ZodType<Out>, form: F): CheckResult<F, Out> {
  const result = schema.safeParse(form)
  if (result.success) return { data: result.data }
  const errors: FormErrors<F> = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof F | undefined
    if (field !== undefined && !errors[field]) errors[field] = issue.message
  }
  return { errors }
}

/** Đổi lỗi theo field của server (PascalCase, có thể kèm tiền tố "request.") sang lỗi theo ô của form */
export function serverFieldErrors<F extends object>(error: ApiError, form: F): FormErrors<F> {
  const errors: FormErrors<F> = {}
  for (const [serverField, message] of Object.entries(error.fieldErrors)) {
    const lastPart = serverField.split('.').pop() ?? serverField
    const field = (lastPart.charAt(0).toLowerCase() + lastPart.slice(1)) as keyof F
    if (field in form && !errors[field]) errors[field] = message
  }
  return errors
}
