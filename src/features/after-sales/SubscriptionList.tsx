import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import {
  bySubscriptionRank,
  cancelMode,
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  subscriptionStatusMeta,
} from '@/features/after-sales/afterSalesDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { SubscriptionView } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'

const vnd = (amount: number | null) => <span className="tnum">{formatMoney(amount, 'VND')}</span>

const range = (s: SubscriptionView) => `${formatMoment(s.startsAt)} đến ${formatMoment(s.endsAt)}`

// Một câu về kỳ của gói, chỉ dùng ngày backend đã ghi; chưa có ngày thì nói điều kiện còn thiếu
function termText(s: SubscriptionView) {
  switch (s.status) {
    case 'AWAITING_PAYMENT':
      return `Thanh toán trước ${formatMoment(s.checkoutExpiresAt)}.`
    case 'CHECKOUT_EXPIRED':
      return 'Link thanh toán đã hết hạn. Mua lại nếu bạn vẫn cần gói.'
    case 'PAID':
      return s.startsAt
        ? `Kỳ ${range(s)}, nối tiếp kỳ đang hiệu lực.`
        : 'Kỳ bảo vệ bắt đầu khi công trình được bàn giao.'
    case 'ACTIVE':
      return `Kỳ ${range(s)}. Bảo vệ từ ${formatMoment(s.coverageStartsAt)}.`
    case 'CANCELLATION_REQUESTED':
      return `Đã gửi yêu cầu huỷ lúc ${formatMoment(s.cancellationRequestedAt)}, chờ quản lý duyệt.`
    case 'EXPIRED':
      return `Kỳ ${range(s)}.`
    default:
      return null
  }
}

/** Quyền lợi đã chụp lúc mua */
function benefitText(s: SubscriptionView) {
  const parts = [`Hỗ trợ ${formatPercent(s.coveragePercent)} chi phí sửa chữa được duyệt`]
  if (s.perIncidentLimit != null) parts.push(`tối đa ${formatMoney(s.perIncidentLimit, 'VND')} mỗi sự cố`)
  if (s.termLimit != null) parts.push(`${formatMoney(s.termLimit, 'VND')} mỗi kỳ`)
  return `${parts.join(', ')}. ${disasterTypesLabel(s.coveredDisasterTypes)}.`
}

export function SubscriptionList({
  items,
  contractNumbers,
  onPay,
  onCancel,
}: {
  items: SubscriptionView[]
  /** contractId → số hợp đồng; thiếu thì in mã ngắn */
  contractNumbers: Map<string, string>
  onPay: (attemptId: string) => void
  onCancel: (subscription: SubscriptionView) => void
}) {
  return (
    <ul className="divide-y divide-line">
      {[...items].sort(bySubscriptionRank).map((s) => {
        const status = subscriptionStatusMeta(s.status)
        const mode = cancelMode(s.status)
        const term = termText(s)
        const payAttempt = s.status === 'AWAITING_PAYMENT' ? s.currentPaymentAttemptId : null
        return (
          <ListRow key={s.subscriptionId}>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <h3 className="text-title font-semibold">{s.packageName}</h3>
                <p className="mt-1 text-body text-fg-2">
                  Hợp đồng <span className="tnum">{contractNumbers.get(s.contractId) ?? shortCode(s.contractId)}</span>,{' '}
                  {vnd(s.price)}, {formatDurationMonths(s.durationMonths)}
                </p>
                {term && <p className="mt-2 text-body text-fg">{term}</p>}
                {s.status === 'ACTIVE' && s.supportAvailable != null && (
                  <p className="mt-1 text-body text-fg">
                    Hạn mức kỳ còn {vnd(s.supportAvailable)}
                    {s.supportReserved > 0 && (
                      <span className="text-fg-2">, đang giữ {vnd(s.supportReserved)} cho báo giá sửa chữa</span>
                    )}
                  </p>
                )}
                <p className="mt-1 text-body text-fg-2">{benefitText(s)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                <Badge tone={status.tone}>{status.label}</Badge>
                {(payAttempt || mode) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {mode && (
                      <Button size="sm" variant="danger-quiet" onClick={() => onCancel(s)}>
                        {mode === 'paid' ? 'Yêu cầu huỷ' : 'Huỷ đơn'}
                      </Button>
                    )}
                    {payAttempt && (
                      <Button size="sm" variant="soft" onClick={() => onPay(payAttempt)}>
                        Thanh toán
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ListRow>
        )
      })}
    </ul>
  )
}
