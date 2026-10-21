import { isMaintenance } from '@/features/after-sales/afterSalesDisplay'
import type { PackageRequest } from '@/types/req/adminAfterSalesReq'
import type { PackageView, ServicePackageKind } from '@/types/res/customerAfterSalesRes'

// Form thêm / sửa gói dịch vụ. Luật bám ValidatePackage của backend (ServicePackageHandlers); backend vẫn kiểm tra lại.
// Gói bảo trì chỉ dùng các tháng có lượt bảo trì; gói thiên tai dùng loại thiên tai, tỷ lệ hỗ trợ và hai hạn mức

export const PACKAGE_LIMITS = {
  /** Backend cắt tên quá 150 ký tự, mô tả quá 2000 ký tự */
  name: 150,
  description: 2000,
  minMonths: 1,
  maxMonths: 120,
}

export type PackageFormValues = {
  kind: ServicePackageKind
  name: string
  description: string
  price: string
  durationMonths: string
  /** "6, 12": tháng có lượt bảo trì, tính từ khi gói bắt đầu */
  visitMonths: string
  coveredDisasterTypes: string[]
  coveragePercent: string
  perIncidentLimit: string
  termLimit: string
  isActive: boolean
}

export type PackageField = Exclude<keyof PackageFormValues, 'kind' | 'isActive'>
export type PackageErrors = Partial<Record<PackageField, string>>

export function emptyPackage(kind: ServicePackageKind): PackageFormValues {
  return {
    kind,
    name: '',
    description: '',
    price: '',
    durationMonths: '12',
    visitMonths: '',
    coveredDisasterTypes: [],
    coveragePercent: '',
    perIncidentLimit: '',
    termLimit: '',
    isActive: true,
  }
}

const vndText = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const decimalText = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2, useGrouping: false })
const money = (value: number | null) => (value == null ? '' : vndText.format(value))

export function valuesFromPackage(p: PackageView): PackageFormValues {
  return {
    kind: p.kind,
    name: p.name,
    description: p.description ?? '',
    price: money(p.price),
    durationMonths: String(p.durationMonths),
    visitMonths: [...p.visitMonths].sort((a, b) => a - b).join(', '),
    coveredDisasterTypes: [...p.coveredDisasterTypes],
    coveragePercent: p.coveragePercent == null ? '' : decimalText.format(p.coveragePercent),
    perIncidentLimit: money(p.perIncidentLimit),
    termLimit: money(p.termLimit),
    isActive: p.isActive,
  }
}

/** Số tiền nguyên VND: "1500000", "1.500.000" hoặc "1 500 000"; sai dạng thì null */
export function parseVnd(text: string) {
  const value = text.trim()
  if (!/^\d+$/.test(value) && !/^\d{1,3}([.\s]\d{3})+$/.test(value)) return null
  return Number(value.replace(/[.\s]/g, ''))
}

/** "72,5" hoặc "72.5", tối đa 2 chữ số thập phân */
function parsePercent(text: string) {
  const value = text.trim().replace(',', '.')
  return /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : null
}

/** "6, 12" / "6 12" / "6;12" thành [6, 12]; có phần không phải số nguyên dương thì null */
function parseMonths(text: string) {
  const parts = text.split(/[\s,;]+/).filter(Boolean)
  return parts.every((p) => /^\d+$/.test(p)) ? parts.map(Number) : null
}

function wholeMonths(text: string) {
  const value = text.trim()
  return /^\d+$/.test(value) ? Number(value) : null
}

export function validatePackage(v: PackageFormValues): PackageErrors {
  const errors: PackageErrors = {}
  if (!v.name.trim()) errors.name = 'Nhập tên gói.'

  const price = parseVnd(v.price)
  if (!v.price.trim()) errors.price = 'Nhập giá gói.'
  else if (price === null) errors.price = 'Giá là số tiền nguyên, ví dụ 1500000 hoặc 1.500.000.'
  else if (price <= 0) errors.price = 'Giá phải lớn hơn 0.'

  const months = wholeMonths(v.durationMonths)
  const monthsOk = months !== null && months >= PACKAGE_LIMITS.minMonths && months <= PACKAGE_LIMITS.maxMonths
  if (!monthsOk)
    errors.durationMonths = `Thời hạn là số tháng nguyên, từ ${PACKAGE_LIMITS.minMonths} đến ${PACKAGE_LIMITS.maxMonths}.`

  if (isMaintenance(v.kind)) {
    const visits = parseMonths(v.visitMonths)
    if (!v.visitMonths.trim()) errors.visitMonths = 'Nhập ít nhất một tháng có lượt bảo trì.'
    else if (visits === null) errors.visitMonths = 'Ghi số tháng, cách nhau bằng dấu phẩy, ví dụ 6, 12.'
    else if (new Set(visits).size !== visits.length) errors.visitMonths = 'Mỗi tháng chỉ ghi một lần.'
    else if (monthsOk && months !== null && visits.some((m) => m < 1 || m > months))
      errors.visitMonths = `Tháng có lượt bảo trì phải từ 1 đến ${months} (thời hạn của gói).`
    return errors
  }

  if (v.coveredDisasterTypes.length === 0) errors.coveredDisasterTypes = 'Chọn ít nhất một loại thiên tai.'

  const percent = parsePercent(v.coveragePercent)
  if (percent === null || percent <= 0 || percent > 100)
    errors.coveragePercent = 'Tỷ lệ hỗ trợ lớn hơn 0 và tối đa 100, nhiều nhất 2 chữ số thập phân.'

  const perIncident = parseVnd(v.perIncidentLimit)
  if (perIncident === null || perIncident <= 0)
    errors.perIncidentLimit = 'Nhập hạn mức mỗi sự cố, là số tiền nguyên lớn hơn 0.'

  const term = parseVnd(v.termLimit)
  if (term === null || term <= 0) errors.termLimit = 'Nhập hạn mức mỗi kỳ, là số tiền nguyên lớn hơn 0.'
  else if (perIncident !== null && term < perIncident)
    errors.termLimit = 'Hạn mức mỗi kỳ phải từ hạn mức mỗi sự cố trở lên.'
  return errors
}

export const hasErrors = (errors: PackageErrors) => Object.keys(errors).length > 0

/** Body của POST / PUT từ form đã qua validatePackage. Trường của loại gói kia gửi null */
export function toPackageRequest(v: PackageFormValues, revision: number): PackageRequest {
  const maintenance = isMaintenance(v.kind)
  return {
    kind: v.kind,
    name: v.name.trim(),
    description: v.description.trim() || null,
    price: parseVnd(v.price)!,
    durationMonths: wholeMonths(v.durationMonths)!,
    visitMonths: maintenance ? parseMonths(v.visitMonths)!.sort((a, b) => a - b) : null,
    coveredDisasterTypes: maintenance ? null : v.coveredDisasterTypes,
    coveragePercent: maintenance ? null : parsePercent(v.coveragePercent),
    perIncidentLimit: maintenance ? null : parseVnd(v.perIncidentLimit),
    termLimit: maintenance ? null : parseVnd(v.termLimit),
    isActive: v.isActive,
    revision,
  }
}

/** Body ghi lại nguyên gói, chỉ đổi những trường trong `change` (ngừng bán / mở bán lại) */
export function requestFromPackage(p: PackageView, change: Partial<PackageRequest>): PackageRequest {
  const maintenance = isMaintenance(p.kind)
  return {
    kind: p.kind,
    name: p.name,
    description: p.description,
    price: p.price,
    durationMonths: p.durationMonths,
    visitMonths: maintenance ? p.visitMonths : null,
    coveredDisasterTypes: maintenance ? null : p.coveredDisasterTypes,
    coveragePercent: p.coveragePercent,
    perIncidentLimit: p.perIncidentLimit,
    termLimit: p.termLimit,
    isActive: p.isActive,
    revision: p.revision,
    ...change,
  }
}
