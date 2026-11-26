import type { PackageView } from '@/types/res/customerAfterSalesRes'

// Đơn vị tính giá của gói dịch vụ (backend 763cb0b, ServicePackageHandlers.CreatePackageAsync / UpdatePackageAsync). Tạo gói không
// gửi `pricingUnit` thì là PER_INSTALLATION_LEGACY; sau khi tạo không đổi được (giá cũ không bị hiểu lại). Lượt bảo trì và hạn mức
// thiên tai luôn tính theo kỳ, không nhân với số tấm pin. Không import giá trị qua "@/" để chạy được bằng node --test

export const PER_PANEL = 'PER_PANEL'
export const PER_INSTALLATION_LEGACY = 'PER_INSTALLATION_LEGACY'

/** Gói của máy chủ cũ (không có trường) là gói theo hệ thống như trước */
export const pricingUnitOf = (p: Pick<PackageView, 'pricingUnit'>) => p.pricingUnit ?? PER_INSTALLATION_LEGACY

export const isPerPanelUnit = (unit: string | null | undefined) => unit === PER_PANEL

/** "/tấm pin" hoặc "/hệ thống" sau số tiền */
export const priceSuffix = (unit: string | null | undefined) => (isPerPanelUnit(unit) ? '/tấm pin' : '/hệ thống')

/**
 * Body lưu gói: chỉ gửi `pricingUnit` khi tạo. Sửa gói thì không gửi, backend giữ đơn vị đang có; gửi khác thì 400, và FE không bao
 * giờ tự đổi gói cũ sang theo tấm pin
 */
export function withPricingUnit<T extends object>(
  body: T,
  unit: string,
  mode: 'create' | 'update',
): T & { pricingUnit?: string } {
  return mode === 'create' ? { ...body, pricingUnit: unit } : body
}

/**
 * Gói backend trả về sau khi tạo có đúng đơn vị đã chọn không. Máy chủ chưa nâng cấp bỏ qua `pricingUnit` và tạo gói theo hệ thống:
 * khi đó báo cho quản trị biết thay vì coi như đã tạo gói theo tấm pin
 */
export const createdWithUnit = (created: Pick<PackageView, 'pricingUnit'>, requested: string) =>
  pricingUnitOf(created) === requested
