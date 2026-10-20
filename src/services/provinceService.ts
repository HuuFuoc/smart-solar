import type { ProvinceWithWardsRes } from '@/types/res/provincesRes'

// Danh sách phường, xã TP.HCM lấy từ provinces.open-api.vn vì backend không có API này
// Dùng fetch thay vì client axios, vì client đó tự gắn /api và token

export const HCM_PROVINCE = { code: 79, name: 'Thành phố Hồ Chí Minh' } as const

const PROVINCES_API_URL = (import.meta.env.VITE_PROVINCES_API_URL ?? 'https://provinces.open-api.vn/api/v2').replace(
  /\/+$/,
  '',
)

const ENDPOINT = `${PROVINCES_API_URL}/p/${HCM_PROVINCE.code}?depth=2`

export type Ward = { code: number; name: string }

const collator = new Intl.Collator('vi')

export async function getHcmWards(signal?: AbortSignal): Promise<Ward[]> {
  const response = await fetch(ENDPOINT, { signal })
  if (!response.ok) throw new Error(`Không tải được danh sách phường, xã (HTTP ${response.status}).`)
  const body = (await response.json()) as Partial<ProvinceWithWardsRes>
  if (body.code !== HCM_PROVINCE.code || !Array.isArray(body.wards))
    throw new Error('Danh sách phường, xã trả về không đúng định dạng.')
  return body.wards
    .filter((w) => typeof w?.name === 'string' && w.name.trim() !== '')
    .map((w) => ({ code: w.code, name: w.name.trim() }))
    .sort((a, b) => collator.compare(a.name, b.name))
}
