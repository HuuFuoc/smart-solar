import type { PackageRequest, WarrantyOptionRequest } from '@/types/req/adminAfterSalesReq'
import type { DashboardView, WarrantyOptionView } from '@/types/res/adminAfterSalesRes'
import type { PackageView, ServicePackageKind } from '@/types/res/customerAfterSalesRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Sau bán phía quản trị (chỉ ADMIN): gói dịch vụ, thời hạn bảo hành, báo cáo.
// Gói khách đã mua lưu bản chụp tên, giá, thời hạn, quyền lợi lúc mua, nên sửa hay ngừng bán chỉ áp cho lần mua sau.
// Không có API xoá gói: ngừng bán là isActive = false

const { adminAfterSales: api } = ENDPOINTS

/** Mọi gói kể cả gói ngừng bán; không truyền `kind` là mọi loại */
export function listPackages(kind?: ServicePackageKind) {
  return get<PackageView[]>(api.packages, { params: kind ? { kind } : undefined })
}

/** Trả 201 kèm gói vừa tạo. Loại gói không đổi được sau khi tạo */
export function createPackage(body: PackageRequest) {
  return post<PackageView>(api.packages, body)
}

/** Ghi đè cả gói: gửi đủ mọi trường kèm `revision` đang xem; lệch revision thì AFTER_SALES_STALE_REVISION */
export function updatePackage(packageId: string, body: PackageRequest) {
  return put<PackageView>(api.package(packageId), body)
}

/** Mọi thời hạn bảo hành, kể cả đã tắt; không truyền `kind` là cả hai loại */
export function listWarrantyOptions(kind?: string) {
  return get<WarrantyOptionView[]>(api.warrantyOptions, { params: kind ? { kind } : undefined })
}

/**
 * Thêm hoặc sửa một thời hạn: backend nhận diện theo (kind, months), không có revision. Đặt mặc định thì mặc định cũ của
 * cùng loại bị bỏ; mặc định phải đang bật
 */
export function saveWarrantyOption(body: WarrantyOptionRequest) {
  return put<WarrantyOptionView>(api.warrantyOptions, body)
}

/** Query đúng tên tham số của swagger (From, To, CompareFrom, CompareTo, ZoneId, ServiceType, Status) */
export type DashboardParams = Record<string, string>

export function getDashboard(params: DashboardParams) {
  return get<DashboardView>(api.dashboard, { params })
}

/**
 * Bản CSV cùng số liệu với cùng bộ lọc. Để axios tự đọc: thành công là chuỗi CSV (không phải JSON), lỗi là JSON có mã lỗi
 * nên vẫn ra ApiError như mọi lời gọi khác
 */
export async function exportDashboard(params: DashboardParams) {
  const csv = await get<unknown>(api.dashboardExport, { params })
  if (typeof csv !== 'string') throw new Error('Không đọc được tệp CSV.')
  return csv
}
