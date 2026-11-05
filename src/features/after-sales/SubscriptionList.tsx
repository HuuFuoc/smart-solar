import { ENTITLEMENT_STATUSES } from '@/common/afterSales'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import {
  bySubscriptionRank,
  cancelMode,
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  subscriptionStatusMeta,
  visitMonthsLabel,
  isMaintenance,
} from '@/features/after-sales/afterSalesDisplay'
import { entitlementDeadline, isBookable } from '@/features/after-sales/customerServiceRules'
import { formatDateOnly } from '@/features/installations/installationDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment, vnDate } from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { EntitlementView, SubscriptionView } from '@/types/res/customerAfterSalesRes'
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
        : 'Kỳ của gói bắt đầu khi công trình được bàn giao.'
    case 'ACTIVE':
      // Thời gian chờ trước khi được bảo vệ chỉ có ở gói thiên tai
      return isMaintenance(s.kind)
        ? `Kỳ ${range(s)}.`
        : `Kỳ ${range(s)}. Bảo vệ từ ${formatMoment(s.coverageStartsAt)}.`
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
  if (isMaintenance(s.kind)) {
    const visits = `${s.visitMonths.length} lượt bảo trì, vào ${visitMonthsLabel(s.visitMonths)} tính từ khi gói bắt đầu`
    return s.status === 'ACTIVE' && s.remainingVisits != null
      ? `${visits}. Còn ${s.remainingVisits} lượt.`
      : `${visits}.`
  }
  const parts = [`Hỗ trợ ${formatPercent(s.coveragePercent)} chi phí sửa chữa được duyệt`]
  if (s.perIncidentLimit != null) parts.push(`tối đa ${formatMoney(s.perIncidentLimit, 'VND')} mỗi sự cố`)
  if (s.termLimit != null) parts.push(`${formatMoney(s.termLimit, 'VND')} mỗi kỳ`)
  return `${parts.join(', ')}. ${disasterTypesLabel(s.coveredDisasterTypes)}.`
}

const day = (iso: string | null) => (iso ? formatDateOnly(vnDate(iso)) : '—')

/** Các lượt bảo trì của gói: kỳ của lượt, trạng thái, đặt lịch lượt còn đặt được, mở yêu cầu của lượt đã đặt */
function EntitlementList({
  subscription: s,
  onBook,
}: {
  subscription: SubscriptionView
  onBook: (entitlement: EntitlementView, subscription: SubscriptionView) => void
}) {
  const visits = [...s.entitlements].sort((a, b) => a.planMonth - b.planMonth)
  return (
    <ul className="mt-3 divide-y divide-line border-t border-line">
      {visits.map((e, i) => {
        const status = ENTITLEMENT_STATUSES[e.status] ?? { label: e.status, tone: 'neutral' as const }
        return (
          <li key={e.entitlementId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body">
                <span className="font-medium text-fg">Lượt {i + 1}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
              </p>
              <p className="tnum text-meta text-fg-2">
                Kỳ từ {day(e.periodStartsAt)}, đặt được đến trước {day(entitlementDeadline(e, s))}
                {e.consumedAt ? `, bảo trì xong ${day(e.consumedAt)}` : ''}
              </p>
            </div>
            {isBookable(e, s) ? (
              <Button icon="event" size="sm" variant="soft" onClick={() => onBook(e, s)}>
                Đặt lịch
              </Button>
            ) : (
              e.status === 'BOOKED' &&
              e.currentRequestId && (
                <ButtonLink
                  to={withId(ROUTES.customer.afterSalesRequest, e.currentRequestId)}
                  icon="visibility"
                  size="sm"
                  variant="info"
                >
                  Xem lịch hẹn
                </ButtonLink>
              )
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function SubscriptionList({
  items,
  contractNumbers,
  onPay,
  onCancel,
  onBook,
}: {
  items: SubscriptionView[]
  /** contractId → số hợp đồng; thiếu thì in mã ngắn */
  contractNumbers: Map<string, string>
  onPay: (attemptId: string) => void
  onCancel: (subscription: SubscriptionView) => void
  /** Đặt lịch một lượt bảo trì của gói đang hiệu lực */
  onBook: (entitlement: EntitlementView, subscription: SubscriptionView) => void
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
                {isMaintenance(s.kind) && s.entitlements.length > 0 && (
                  <EntitlementList subscription={s} onBook={onBook} />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                <Badge tone={status.tone}>{status.label}</Badge>
                {(payAttempt || mode) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {mode && (
                      <Button icon="cancel" size="sm" variant="danger" onClick={() => onCancel(s)}>
                        {mode === 'paid' ? 'Yêu cầu huỷ' : 'Huỷ đơn'}
                      </Button>
                    )}
                    {payAttempt && (
                      <Button icon="payments" size="sm" variant="soft" onClick={() => onPay(payAttempt)}>
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
