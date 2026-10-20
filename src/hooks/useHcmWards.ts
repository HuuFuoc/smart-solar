import { useQuery } from '@tanstack/react-query'
import { HCM_PROVINCE, getHcmWards } from '@/services/provinceService'

export const provinceKeys = {
  wards: (provinceCode: number) => ['provinces', 'v2', provinceCode, 'wards'] as const,
}

/** Danh sách gần như không đổi nên chỉ tải một lần */
export function useHcmWardsQuery() {
  return useQuery({
    queryKey: provinceKeys.wards(HCM_PROVINCE.code),
    queryFn: ({ signal }) => getHcmWards(signal),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  })
}
