import { z } from 'zod'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import { wardCenter } from '@/features/pre-surveys/hcmWardCenters'
import type { ApiError } from '@/services/api/errors'
import { SURFACE_TYPES } from '@/common/preSurvey'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'
import type { CustomerSiteListItem } from '@/types/res/customersRes'

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
    installationSurfaceType: surfaceFormValue(site.installationSurfaceType),
    surfaceMaterial: site.surfaceMaterial ?? '',
    note: site.note ?? '',
  }
}

// Bản nháp cũ trên máy còn lưu số (1..5), bản mới lưu tên (ROOFTOP...)
function surfaceFormValue(value: unknown) {
  const text = String(value ?? '').toUpperCase()
  const known = SURFACE_TYPES.find((type) => type.name === text || String(type.value) === text)
  return String(known?.value ?? 1)
}

const surfaceName = (formValue: string) =>
  SURFACE_TYPES.find((type) => String(type.value) === formValue)?.name ?? 'ROOFTOP'

/**
 * Địa điểm trong danh sách của khách thành đúng dạng đã lưu khi tạo, để chọn lại địa điểm cũ
 * mà không tạo địa điểm mới (bước địa điểm so sánh với bản này)
 */
export function siteRequestFromList(item: CustomerSiteListItem): CreatePropertySiteRequest {
  const surface = SURFACE_TYPES.find((type) => type.name === item.installationSurfaceType?.toUpperCase())
  return {
    name: item.name,
    province: item.province,
    provinceCode: item.provinceCode,
    district: item.district,
    ward: item.ward ?? item.communeName,
    communeCode: item.communeCode,
    streetLine: item.streetLine,
    latitude: item.latitude,
    longitude: item.longitude,
    installationSurfaceType: surface?.name ?? 'ROOFTOP',
    surfaceMaterial: item.surfaceMaterial,
    note: null,
  }
}

/** Chuỗi rỗng thành null, để backend hiểu là "không khai" */
function textOrNull(value: string) {
  return value.trim() || null
}

function addIssue(ctx: z.RefinementCtx, field: keyof SiteForm, message: string | null) {
  if (message) ctx.addIssue({ code: 'custom', path: [field], message })
}

// Luật kiểm tra lấy theo validator của backend.
// Riêng mã phường, xã thì bắt buộc thêm: để xếp kỹ thuật viên theo khu vực và để lấy toạ độ ước tính sản lượng.

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
      customerType: isBusiness ? 'BUSINESS' : 'INDIVIDUAL',
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
    installationSurfaceType: z.enum(['1', '2', '3', '4', '5'], {
      error: 'Chọn bề mặt lắp đặt.',
    }),
    surfaceMaterial: z.string(),
    note: z.string(),
  })
  .superRefine((form, ctx) => {
    // Gõ tay thì không có mã phường, xã mà backend cần để xếp kỹ thuật viên theo khu vực
    if (form.ward.trim() && !form.communeCode) addIssue(ctx, 'ward', 'Chọn phường, xã trong danh sách.')
  })
  .transform((form): CreatePropertySiteRequest => {
    // Khách không nhập toạ độ: lấy điểm giữa của phường, xã đã chọn (đủ để ước tính sản lượng)
    const center = wardCenter(form.communeCode)
    return {
      name: textOrNull(form.name),
      province: HCM_PROVINCE.name,
      provinceCode: HCM_PROVINCE.code,
      district: null,
      ward: textOrNull(form.ward),
      communeCode: form.communeCode,
      streetLine: textOrNull(form.streetLine),
      latitude: center?.latitude ?? null,
      longitude: center?.longitude ?? null,
      installationSurfaceType: surfaceName(form.installationSurfaceType),
      surfaceMaterial: textOrNull(form.surfaceMaterial),
      note: textOrNull(form.note),
    }
  })

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
