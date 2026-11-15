import { normalizeJobSearch } from '../scheduling/techJobFilter.ts'
import type { MySurveyRequestItem, PendingSurveyRequestItem } from '../../types/res/surveyRequestsRes'

// Tìm kiếm trong hàng chờ yêu cầu khảo sát của kinh doanh: lọc ở máy trên danh sách backend đã trả
// (hai API danh sách không nhận từ khoá), không phân biệt hoa thường và dấu

export type SurveyRequestSearchTarget = Pick<
  PendingSurveyRequestItem | MySurveyRequestItem,
  'propertyName' | 'customerName' | 'communeName' | 'ward' | 'district' | 'province'
>

/** Chuỗi từ khoá của một yêu cầu: tên công trình, tên khách, phường, xã, quận cũ và tỉnh */
export function surveyRequestKeywords(row: SurveyRequestSearchTarget): string {
  const parts = [row.propertyName, row.customerName, row.communeName, row.ward, row.district, row.province]
  return normalizeJobSearch(parts.filter(Boolean).join(' '))
}

/** Mọi từ trong ô tìm đều phải có trong từ khoá của yêu cầu; ô trống thì khớp hết */
export function matchesSurveyRequest(row: SurveyRequestSearchTarget, search: string): boolean {
  const tokens = normalizeJobSearch(search).split(' ').filter(Boolean)
  if (tokens.length === 0) return true
  const text = surveyRequestKeywords(row)
  return tokens.every((token) => text.includes(token))
}
