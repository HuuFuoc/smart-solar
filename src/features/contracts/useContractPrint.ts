import { useState } from 'react'
import { openContractPrint } from '@/features/contracts/contractPrint'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMySitesQuery } from '@/hooks/usePreSurveys'
import type { ContractView } from '@/types/res/customerContractsRes'

/**
 * In bản hợp đồng dựng từ dữ liệu hợp đồng (`contractPrint.ts`) ở thẻ mới; khách chọn máy in hoặc "Lưu thành PDF". Phường
 * (hợp đồng không chụp phường) chỉ để in cho đủ, thiếu thì vẫn in được. Khách không còn đọc được báo giá nên không in ngày đồng ý
 * báo giá. `blocked`: trình duyệt chặn cửa sổ mới
 */
export function useContractPrint(c: ContractView) {
  const [blocked, setBlocked] = useState(false)
  const requests = useMyRequestsQuery()
  const sites = useMySitesQuery()
  const siteId = requests.data?.find((r) => r.surveyRequestId === c.surveyRequestId)?.propertySiteId
  const site = sites.data?.items.find((s) => s.siteId === siteId)

  function print() {
    setBlocked(!openContractPrint({ contract: c, ward: site?.communeName ?? site?.ward }))
  }

  return { print, blocked }
}
