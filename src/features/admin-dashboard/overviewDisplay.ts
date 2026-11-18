import { CONTRACT_STATUSES } from '@/common/contract'
import {
  DISASTER_CLAIM_STATUSES,
  SALES_TASK_TYPES,
  SERVICE_QUOTATION_STATUSES,
  SERVICE_REQUEST_KINDS,
  SERVICE_REQUEST_STATUSES,
  SUBSCRIPTION_STATUSES,
  VISIT_STATUSES,
} from '@/common/afterSales'
import { INSTALLATION_STATUS_LABELS } from '@/common/installation'
import { INSTALLATION_SCHEDULE_STATUSES } from '@/common/installationSchedule'
import { SURVEY_REQUEST_STATUSES } from '@/common/preSurvey'
import { QUOTATION_STATUSES } from '@/common/quotation'
import { ROLE_LABELS } from '@/common/role'
import { UNAPPLIED_STATUSES } from '@/common/paymentDesk'

// Nhãn tiếng Việt cho các khoá của tổng quan quản trị. Khoá lạ in nguyên mã để không giấu số liệu

const upper = (key: string) => key.toUpperCase()

const PACKAGE_KINDS: Record<string, string> = {
  MAINTENANCE: 'Gói bảo trì',
  DISASTER_PROTECTION: 'Gói bảo vệ thiên tai',
}

const METHODS: Record<string, string> = { ONLINE: 'PayOS', CASH: 'Tiền mặt' }

const ISSUERS: Record<string, string> = { SALES: 'Kinh doanh lập', TECHNICIAN: 'Kỹ thuật viên lập' }

const CHANNELS: Record<string, string> = { WITH_INSTALLATION: 'Mua kèm lắp đặt', SEPARATE: 'Mua riêng' }

/** Trạng thái lần thanh toán, viết ngắn để ghép sau cách trả ("Tiền mặt, đã huỷ") */
const ATTEMPT_STATUSES: Record<string, string> = {
  PENDING: 'chờ trả',
  PROCESSING: 'đang xử lý',
  PAID: 'đã trả',
  CANCELLED: 'đã huỷ',
  EXPIRED: 'hết hạn',
  FAILED: 'không tạo được link',
  REVIEW_REQUIRED: 'cần đối soát',
  REFUND_REQUIRED: 'trả trùng',
}

/** "FAULT:COMPLETED" → ["Báo lỗi", "Hoàn thành"] */
const pair = (key: string, first: Record<string, string>, second: (k: string) => string) => {
  const [a = '', b = ''] = key.split(':')
  return `${first[a] ?? a}, ${second(b).toLocaleLowerCase('vi')}`
}

export const OVERVIEW_LABELS = {
  role: (role: string) => ROLE_LABELS[role.toLowerCase() as keyof typeof ROLE_LABELS] ?? role,
  survey: (k: string) => SURVEY_REQUEST_STATUSES[upper(k) as keyof typeof SURVEY_REQUEST_STATUSES]?.label ?? k,
  quotation: (k: string) => QUOTATION_STATUSES[k]?.staff ?? k,
  contract: (k: string) => CONTRACT_STATUSES[k]?.staff ?? k,
  project: (k: string) => INSTALLATION_STATUS_LABELS[k] ?? k,
  schedule: (k: string) => INSTALLATION_SCHEDULE_STATUSES[k]?.staff ?? k,
  serviceRequest: (k: string) => pair(k, SERVICE_REQUEST_KINDS, (s) => SERVICE_REQUEST_STATUSES[s] ?? s),
  serviceQuotation: (k: string) => SERVICE_QUOTATION_STATUSES[k]?.label ?? k,
  issuer: (k: string) => ISSUERS[k] ?? k,
  claim: (k: string) => DISASTER_CLAIM_STATUSES[k]?.label ?? k,
  subscription: (k: string) => pair(k, PACKAGE_KINDS, (s) => SUBSCRIPTION_STATUSES[s]?.label ?? s),
  salesTask: (k: string) => SALES_TASK_TYPES[k] ?? k,
  visit: (k: string) => VISIT_STATUSES[k]?.label ?? k,
  unapplied: (k: string) => UNAPPLIED_STATUSES[k]?.label ?? k,
  method: (k: string) => METHODS[k] ?? k,
  attempt: (k: string) => pair(k, METHODS, (s) => ATTEMPT_STATUSES[s] ?? s),
  channel: (k: string) => CHANNELS[k] ?? k,
}

/** Tổng số của một phân bố, để vẽ tỉ lệ từng dòng */
export const bucketTotal = (buckets: { count: number }[]) => buckets.reduce((s, b) => s + b.count, 0)
