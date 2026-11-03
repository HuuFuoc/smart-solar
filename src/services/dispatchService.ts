import type {
  CustomerDispatchView,
  DispatchCandidatesView,
  DispatchQueueItemView,
  DispatchQueuePage,
  DispatchStaffView,
  DispatchStatus,
  PreferredWindowView,
} from '@/types/res/dispatchRes'
import { get, post } from '@/services/api/client'
import { isApiError } from '@/services/api/errors'
import { ENDPOINTS } from '@/services/api/endpoints'

// Điều phối kỹ thuật viên khi công trình chưa có người nhận lịch (khu vực chưa phục vụ, kín lịch...)
// Khách gửi khung giờ tiện, quản lý / quản trị phân công thẳng hoặc gửi đề xuất cho khách đồng ý

const customer = ENDPOINTS.customerDispatch
const staff = ENDPOINTS.adminDispatch

/** 201 tạo mới, 200 khi đã có yêu cầu đang mở (created=false). Tối đa 5 khung giờ, mỗi khung không quá 24 giờ */
export function createDispatchRequest(
  surveyRequestId: string,
  body: { preferredWindows: PreferredWindowView[]; note: string | null },
) {
  return post<CustomerDispatchView>(customer.base(surveyRequestId), body)
}

/** Yêu cầu mới nhất của khách cho yêu cầu khảo sát; chưa từng gửi thì null */
export async function getMyDispatchRequest(surveyRequestId: string) {
  try {
    return await get<CustomerDispatchView>(customer.base(surveyRequestId))
  } catch (e) {
    if (isApiError(e) && e.status === 404) return null
    throw e
  }
}

/** Đặt lịch theo đề xuất; giờ đó không còn nhận được thì 409 và đề xuất thành FAILED */
export function acceptProposal(surveyRequestId: string, proposalId: string, revision: number) {
  return post<CustomerDispatchView>(customer.accept(surveyRequestId, proposalId), { expectedRevision: revision })
}

export function declineProposal(surveyRequestId: string, proposalId: string, revision: number, reason: string | null) {
  return post<CustomerDispatchView>(customer.decline(surveyRequestId, proposalId), {
    reason,
    expectedRevision: revision,
  })
}

export function cancelDispatchRequest(surveyRequestId: string, reason: string | null) {
  return post<CustomerDispatchView>(customer.cancel(surveyRequestId), { reason })
}

/** BE trả tối đa 100 dòng mỗi trang */
const QUEUE_PAGE_SIZE = 100
/** Chặn số trang tải cho một trạng thái, vì BE giới hạn số lần đọc mỗi phút */
const QUEUE_MAX_PAGES = 5

function listDispatchPage(status: DispatchStatus, page: number) {
  return get<DispatchQueuePage>(staff.base, { params: { status, page, pageSize: QUEUE_PAGE_SIZE } })
}

async function allPages(status: DispatchStatus) {
  const first = await listDispatchPage(status, 1)
  const more = Math.min(first.totalPages, QUEUE_MAX_PAGES) - 1
  const rest = await Promise.all(Array.from({ length: more }, (_, i) => listDispatchPage(status, i + 2)))
  return { items: [first, ...rest].flatMap((p) => p.items), totalItems: first.totalItems }
}

/** Hai trang cuối, tức các yêu cầu có hạn phản hồi muộn nhất (gần đây nhất) */
async function latestPages(status: DispatchStatus) {
  const first = await listDispatchPage(status, 1)
  const last = first.totalPages
  const tail = await Promise.all([last - 1, last].filter((p) => p > 1).map((p) => listDispatchPage(status, p)))
  const pages = last <= 2 ? [first, ...tail] : tail
  return { items: pages.flatMap((p) => p.items), totalItems: first.totalItems }
}

export type DispatchQueue = { items: DispatchQueueItemView[]; totalItems: number }

/**
 * Hàng chờ của nhân viên theo trạng thái. BE xếp hạn phản hồi sớm nhất trước và giữ cả yêu cầu đã xong,
 * nên yêu cầu đang mở tải đủ các trang, còn yêu cầu đã xong (`latest`) chỉ tải các trang gần đây nhất
 */
export async function listDispatchRequests(
  statuses: readonly DispatchStatus[],
  { latest = false }: { latest?: boolean } = {},
): Promise<DispatchQueue> {
  const parts = await Promise.all(statuses.map((status) => (latest ? latestPages(status) : allPages(status))))
  return {
    items: parts.flatMap((p) => p.items),
    totalItems: parts.reduce((sum, p) => sum + p.totalItems, 0),
  }
}

export function getDispatchRequest(id: string) {
  return get<DispatchStaffView>(staff.byId(id))
}

/** Kỹ thuật viên nhận được giờ `startsAt`: người trong khu vực trước, người khu khác sau */
export function getDispatchCandidates(id: string, startsAt: string) {
  return get<DispatchCandidatesView>(staff.candidates(id), { params: { startsAt } })
}

export type DispatchTechnicianBody = {
  technicianUserId: string
  startsAt: string
  /** Bắt buộc true kèm `reason` khi chọn người ngoài khu vực của công trình */
  crossZoneAuthorized: boolean
  reason: string | null
  expectedRevision: number
}

/** Phân công thẳng: lý do luôn bắt buộc */
export function assignDispatch(id: string, body: DispatchTechnicianBody) {
  return post<DispatchStaffView>(staff.assign(id), body)
}

/** Gửi đề xuất cho khách, chưa giữ chỗ: khách đồng ý mới đặt lịch */
export function proposeDispatch(id: string, body: DispatchTechnicianBody) {
  return post<DispatchStaffView>(staff.proposals(id), body)
}

export function withdrawProposal(id: string, proposalId: string, reason: string | null) {
  return post<DispatchStaffView>(staff.withdraw(id, proposalId), { reason })
}

export function markUnserviceable(id: string, reason: string, revision: number) {
  return post<DispatchStaffView>(staff.unserviceable(id), { reason, expectedRevision: revision })
}

export function closeDispatchRequest(id: string, reason: string, revision: number) {
  return post<DispatchStaffView>(staff.close(id), { reason, expectedRevision: revision })
}
