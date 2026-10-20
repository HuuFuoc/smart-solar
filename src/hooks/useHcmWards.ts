import { useQuery } from '@tanstack/react-query'
import { HCM_PROVINCE, getHcmWards } from '@/features/pre-surveys/services/provinceService'

export const provinceKeys = {
  wards: (provinceCode: number) => ['provinces', 'v2', provinceCode, 'wards'] as const,
}

/** Danh sách chỉ đổi khi có nghị quyết sắp xếp đơn vị hành chính: tải một lần, giữ suốt phiên. */
export function useHcmWardsQuery() {
  return useQuery({
    queryKey: provinceKeys.wards(HCM_PROVINCE.code),
    queryFn: ({ signal }) => getHcmWards(signal),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  })
}
