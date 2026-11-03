import type { PackageRequest } from '@/types/req/adminAfterSalesReq'
import type { PackageView, ServicePackageKind } from '@/types/res/customerAfterSalesRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Gói dịch vụ sau lắp đặt, phía quản trị (chỉ ADMIN). Gói khách đã mua lưu bản chụp tên, giá, thời hạn, quyền lợi lúc mua,
// nên sửa hay ngừng bán chỉ áp cho lần mua sau. Không có API xoá gói: ngừng bán là isActive = false

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
