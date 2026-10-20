import { z } from 'zod'
import { HCM_PROVINCE } from '@/services/provinceService'
import type { ApiError } from '@/services/api/errors'
import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'

/*
 * Form hồ sơ và địa điểm của màn đánh giá sơ bộ (mặt lắp ở surfaceForm.ts). Ô nhập giữ dạng chuỗi; schema của từng
 * bước vừa kiểm tra vừa đổi sang body đúng kiểu request trong swagger, nên trang chỉ việc gửi `data`.
 */

export type ProfileForm = {
  customerType: '1' | '2'
  companyName: string
  taxCode: string
  note: string
}

/*
  Địa chỉ 2 cấp theo đơn vị hành chính từ 01/07/2025 (người dùng chốt 10/10/2026): tỉnh cố định là TP.HCM vì dự án chỉ
  nhận công trình ở đó, phường/xã chọn trong danh sách của API provinces.open-api.vn. Không còn ô quận/huyện; `district`
  chỉ giữ để mở lại địa điểm cũ (khai tự do trước ngày đó) mà không bị coi là đã sửa.
*/
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

export type FormErrors<F> = Partial<Record<keyof F, string>>

/** Địa điểm đã lưu (body đã gửi, nhớ trong bản nháp) → form, để mở lại trang không phải nhập lại và không tạo địa điểm trùng. */
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

/* ------------------------------------------------------------------ helpers */

/** Chuỗi rỗng → null để backend nhận đúng "không khai". */
const text = (value: string) => value.trim() || null

/** Người dùng Việt hay gõ dấu phẩy thập phân: "12,5" → 12.5. Rỗng → null, sai → NaN. */
export function toNumber(value: string) {
  const raw = value.trim().replace(',', '.')
  return raw === '' ? null : Number(raw)
}

/**
 * Diện tích hay được gõ theo kiểu Việt: "1.200" là một nghìn hai trăm, không phải 1,2 m². Dấu chấm chia đúng
 * nhóm ba chữ số thì coi là phân cách hàng nghìn (phần lẻ sau dấu phẩy); còn lại đọc như toNumber.
 * Chỉ dùng cho diện tích: toạ độ "10.762" hay góc "12.5" vẫn là số thập phân.
 */
export function toArea(value: string) {
  const raw = value.trim()
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) return Number(raw.replace(/\./g, '').replace(',', '.'))
  return toNumber(raw)
}

type Range = { label: string; unit?: string; min: number; max: number; minExclusive?: boolean; parse?: (value: string) => number | null }

/** Kiểm tra một ô số; trả về câu lỗi hoặc null. */
function numberIssue(value: string, range: Range, required: boolean) {
  const n = (range.parse ?? toNumber)(value)
  if (n === null) return required ? `Nhập ${range.label}.` : null
  // isFinite gạt cả NaN lẫn "Infinity" / "1e400" (Number() đọc được nhưng không phải số đo).
  if (!Number.isFinite(n)) return `Nhập ${range.label} bằng số.`
  const unit = range.unit ? ` ${range.unit}` : ''
  if (range.minExclusive ? n <= range.min : n < range.min) {
    return range.minExclusive ? `${capitalize(range.label)} phải lớn hơn ${range.min}${unit}.` : `${capitalize(range.label)} từ ${range.min} đến ${range.max}${unit}.`
  }
  if (n > range.max) return `Kiểm tra lại ${range.label}; tối đa ${new Intl.NumberFormat('vi-VN').format(range.max)}${unit}.`
  return null
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function issue<F>(ctx: z.RefinementCtx, path: keyof F, message: string | null) {
  if (message) ctx.addIssue({ code: 'custom', path: [path as string], message })
}

/* ------------------------------------------------------------------ schemas */

/*
  Luật kiểm tra bám đúng backend, không thêm luật riêng (dò validator ngày 05/10/2026):
  - địa điểm: Name và Province bắt buộc; Latitude -90..90, Longitude -180..180. Từ 12/10/2026 toạ độ cũng bắt buộc ở
    giao diện: không có toạ độ thì backend không xếp được giờ khảo sát (PROPERTY_SITE_LOCATION_REQUIRED) và không có API
    sửa địa điểm đã tạo, nên khách sẽ làm hết bản đánh giá rồi không đặt được lịch. (0, 0) là giá trị bỏ trống, không nhận.
  - mặt lắp và số liệu khai: xem surfaceForm.ts (bám UpdatePreSurveySurfaceCommandValidator).
  - hồ sơ: swagger cho mọi trường để trống (chưa dò được validator vì tài khoản test đã có hồ sơ).
*/

export const profileSchema = z
  .object({ customerType: z.enum(['1', '2']), companyName: z.string(), taxCode: z.string(), note: z.string() })
  .transform(
    (f): CreateCustomerProfileRequest => ({
      customerType: f.customerType === '2' ? 2 : 1,
      companyName: f.customerType === '2' ? text(f.companyName) : null,
      taxCode: text(f.taxCode),
      note: text(f.note),
    }),
  )

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
  .transform(
    (f): CreatePropertySiteRequest => ({
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
    }),
  )

/* ------------------------------------------------------------------ chạy schema, gắn lỗi */

export function check<F, Out>(schema: z.ZodType<Out>, form: F): { data: Out; errors?: undefined } | { data?: undefined; errors: FormErrors<F> } {
  const result = schema.safeParse(form)
  if (result.success) return { data: result.data }
  const errors: FormErrors<F> = {}
  for (const i of result.error.issues) {
    const key = i.path[0] as keyof F | undefined
    if (key !== undefined && !errors[key]) errors[key] = i.message
  }
  return { errors }
}

/**
 * Lỗi theo field từ server (FluentValidation trả tên PascalCase, có thể kèm tiền tố "request.")
 * → khoá của form. Field không có trong form thì bỏ, message chung vẫn hiện ở thanh thao tác.
 */
export function serverFieldErrors<F extends object>(error: ApiError, form: F): FormErrors<F> {
  const errors: FormErrors<F> = {}
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    const last = field.split('.').pop() ?? field
    const key = (last.charAt(0).toLowerCase() + last.slice(1)) as keyof F
    if (key in form && !errors[key]) errors[key] = message
  }
  return errors
}
