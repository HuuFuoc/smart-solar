import { ENTITLEMENT_STATUSES } from '@/common/afterSales'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
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
import { cx } from '@/utils/cx'
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
    <ul className="space-y-3">
      {[...items].sort(bySubscriptionRank).map((s) => {
        const status = subscriptionStatusMeta(s.status)
        const mode = cancelMode(s.status)
        const term = termText(s)
        const payAttempt = s.status === 'AWAITING_PAYMENT' ? s.currentPaymentAttemptId : null
        return (
          <li
            key={s.subscriptionId}
            className="rounded-container border border-line/70 bg-surface-2/30 p-4 transition-colors hover:bg-surface-2/60"
          >
            <div className="grid gap-x-6 gap-y-3 lg:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1.8fr)_auto] lg:items-center">
              {/* Left Icon Box */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-container border border-accent-line/30 bg-accent-soft text-accent-fg">
                <Icon name="bolt" className="text-[20px]" />
              </div>

              {/* Col 1: Package Title and Contract / Price info */}
              <div className="min-w-0">
                <h3 className="text-body font-bold text-fg">{s.packageName}</h3>
                <p className="mt-0.5 text-meta text-fg-2">
                  Hợp đồng <span className="tnum">{contractNumbers.get(s.contractId) ?? shortCode(s.contractId)}</span>,{' '}
                  {vnd(s.price)}, {formatDurationMonths(s.durationMonths)}
                </p>
                {term && <p className="mt-1 text-meta font-medium text-fg">{term}</p>}
                {s.status === 'ACTIVE' && s.supportAvailable != null && (
                  <p className="mt-0.5 text-meta text-fg">
                    Hạn mức kỳ còn {vnd(s.supportAvailable)}
                    {s.supportReserved > 0 && (
                      <span className="text-fg-2">, đang giữ {vnd(s.supportReserved)} cho báo giá sửa chữa</span>
                    )}
                  </p>
                )}
              </div>

              {/* Col 2: Benefits with Checkmark */}
              <div className="min-w-0">
                <div className="flex items-start gap-2">
                  <Icon name="check_circle" className="mt-0.5 shrink-0 text-primary text-[20px]" />
                  <span className="text-meta leading-relaxed text-fg">{benefitText(s)}</span>
                </div>
              </div>

              {/* Col 3: Status Badge & Actions */}
              <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                <span className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface-2 px-3 py-1 text-meta font-medium text-fg-2 select-none">
                  <span
                    className={cx(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      status.tone === 'ok'
                        ? 'bg-ok'
                        : status.tone === 'danger' || status.tone === 'warn'
                          ? 'bg-warn'
                          : 'bg-fg-3',
                    )}
                    aria-hidden="true"
                  />
                  <span>{status.label}</span>
                </span>

                {(payAttempt || mode) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {mode && (
                      <Button icon="cancel" size="sm" variant="danger" onClick={() => onCancel(s)}>
                        Huỷ đơn
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

            {/* Entitlements if active/maintenance */}
            {isMaintenance(s.kind) && s.entitlements.length > 0 && <EntitlementList subscription={s} onBook={onBook} />}
          </li>
        )
      })}
    </ul>
  )
}
