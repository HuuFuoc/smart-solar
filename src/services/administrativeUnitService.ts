import { get } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { Commune } from '@/types/res/administrativeUnitsRes'

// Danh mục địa giới hành chính của backend (2 cấp: tỉnh, phường / xã)
// Hiện chỉ nhận công trình ở TP.HCM nên tỉnh cố định

export const HCM_PROVINCE = { code: '79', name: 'Thành phố Hồ Chí Minh' } as const

const collator = new Intl.Collator('vi')

/** Phường, xã đang hiệu lực của một tỉnh, xếp theo tên */
export async function getCommunes(provinceCode: string) {
  const communes = await get<Commune[]>(ENDPOINTS.administrativeUnits.communes, { params: { provinceCode } })
  return [...communes].sort((a, b) => collator.compare(a.name, b.name))
}
