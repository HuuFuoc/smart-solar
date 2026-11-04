import { get } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { Commune, LegacyLookupView, ProvinceView } from '@/types/res/administrativeUnitsRes'

// Danh mục địa giới hành chính của backend (2 cấp: tỉnh, phường / xã), công khai, không cần đăng nhập
// Hiện chỉ nhận công trình ở TP.HCM nên mã tỉnh cố định; tên hiển thị ở ô tỉnh lấy từ danh mục

export const HCM_PROVINCE = { code: '79', name: 'Thành phố Hồ Chí Minh' } as const

const collator = new Intl.Collator('vi')

/** Tỉnh, thành phố đang hiệu lực */
export function getProvinces() {
  return get<ProvinceView[]>(ENDPOINTS.administrativeUnits.provinces)
}

/** Phường, xã đang hiệu lực của một tỉnh, xếp theo tên */
export async function getCommunes(provinceCode: string) {
  const communes = await get<Commune[]>(ENDPOINTS.administrativeUnits.communes, { params: { provinceCode } })
  return [...communes].sort((a, b) => collator.compare(a.name, b.name))
}

/** Tra phường, xã mới từ tên / mã phường, quận cũ (trước 01/07/2025). Backend không chọn hộ: người dùng phải tự chọn */
export function lookupLegacyUnits(q: string, provinceCode: string, signal?: AbortSignal) {
  return get<LegacyLookupView>(ENDPOINTS.administrativeUnits.legacyLookup, { params: { q, provinceCode }, signal })
}
