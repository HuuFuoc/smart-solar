import { useQuery } from '@tanstack/react-query'
import { HCM_PROVINCE, getCommunes } from '@/services/administrativeUnitService'

/** Phường, xã của TP.HCM. Danh sách gần như không đổi nên chỉ tải một lần */
export function useHcmCommunesQuery() {
  return useQuery({
    queryKey: ['administrative-units', 'communes', HCM_PROVINCE.code],
    queryFn: () => getCommunes(HCM_PROVINCE.code),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  })
}
