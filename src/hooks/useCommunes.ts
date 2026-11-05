import { useQuery } from '@tanstack/react-query'
import { legacyQueryProblem, legacySearchKey } from '@/features/pre-surveys/legacyLookup'
import { HCM_PROVINCE, getCommunes, getProvinces, lookupLegacyUnits } from '@/services/administrativeUnitService'
import type { ApiError } from '@/services/api/errors'
import type { LegacyLookupView, ProvinceView } from '@/types/res/administrativeUnitsRes'

// Danh mục hành chính, công khai và gần như không đổi (backend cho cache 1 giờ). Mọi cổng dùng chung khoá nên chỉ tải một lần
// mỗi phiên. Danh mục lỗi thì báo lỗi, không thay bằng danh sách viết sẵn

export const administrativeUnitKeys = {
  all: ['administrative-units'] as const,
  provinces: ['administrative-units', 'provinces'] as const,
  communes: (provinceCode: string) => ['administrative-units', 'communes', provinceCode] as const,
  legacy: (provinceCode: string, searchKey: string) =>
    ['administrative-units', 'legacy-lookup', provinceCode, searchKey] as const,
}

// 4xx (kể cả 429 của giới hạn 60 lần / phút) thử lại cũng vậy
const retryServerErrors = (count: number, error: ApiError) => !(error.status >= 400 && error.status < 500) && count < 1

/** Phường, xã của TP.HCM. Danh sách gần như không đổi nên chỉ tải một lần */
export function useHcmCommunesQuery() {
  return useQuery({
    queryKey: administrativeUnitKeys.communes(HCM_PROVINCE.code),
    queryFn: () => getCommunes(HCM_PROVINCE.code),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  })
}

/**
 * Tỉnh đang nhận công trình (mã cố định 79) theo danh mục. `data` null khi danh mục không còn mã này: báo lỗi, không mở rộng
 * phạm vi phục vụ theo các tỉnh khác danh mục trả về
 */
export function useServiceProvinceQuery() {
  return useQuery<ProvinceView[], ApiError, ProvinceView | null>({
    queryKey: administrativeUnitKeys.provinces,
    queryFn: () => getProvinces(),
    select: (list) => list.find((p) => p.code === HCM_PROVINCE.code) ?? null,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: retryServerErrors,
  })
}

/**
 * Tra địa chỉ cũ trong TP.HCM. Chỉ gọi khi từ khoá hợp lệ (nơi gọi đã chờ người dùng ngừng gõ); khoá theo từ khoá đã bỏ dấu.
 * Đổi từ khoá thì lời gọi cũ bị huỷ (signal) và kết quả cũ không hiện cho từ khoá mới
 */
export function useLegacyLookupQuery(q: string) {
  const searchKey = legacySearchKey(q)
  return useQuery<LegacyLookupView, ApiError>({
    queryKey: administrativeUnitKeys.legacy(HCM_PROVINCE.code, searchKey),
    queryFn: ({ signal }) => lookupLegacyUnits(q.trim(), HCM_PROVINCE.code, signal),
    enabled: legacyQueryProblem(q) === null,
    staleTime: 60 * 60_000,
    gcTime: 10 * 60_000,
    retry: retryServerErrors,
  })
}
