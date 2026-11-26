import { ENTITLEMENT_STATUSES } from '@/common/afterSales'
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
import { mayRenew } from '@/features/after-sales/panelCoverageRules'
import { coveredPanelLabel, formatUnitPrice } from '@/features/after-sales/servicePackageDisplay'
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
    // Danh sách gói không cho biết cách trả; đơn tiền mặt không hết hạn khi còn chờ Smart Solar xác nhận đã thu
    case 'AWAITING_PAYMENT':
      return `Trả qua PayOS trước ${formatMoment(s.checkoutExpiresAt)}. Đã chọn tiền mặt thì chờ Smart Solar xác nhận đã thu.`
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

/** Gói đến từ đâu: đi kèm hợp đồng lắp đặt (trả trong 30/70), gia hạn kỳ trước, hay mua riêng */
function originText(s: SubscriptionView) {
  if (s.contractServicePackageId) return 'đi kèm hợp đồng lắp đặt'
  if (s.renewsSubscriptionId) return 'gia hạn kỳ trước'
  return 'mua riêng'
}

/** Kỳ PANEL chỉ bảo vệ các tấm được phân bổ; kỳ cũ bảo vệ cả công trình */
function scopeText(s: SubscriptionView) {
  if (s.coverageScope !== 'PANEL') return 'Áp dụng cho toàn bộ công trình.'
  const units = s.coveredUnits ?? (s.coveredPanels ?? []).reduce((sum, a) => sum + a.unitCount, 0)
  return `Bảo vệ ${units} tấm pin, đơn giá ${formatUnitPrice(s.unitPrice, 'PER_PANEL')}.`
}

/** Tấm pin được kỳ PANEL bảo vệ; tấm đã thay vẫn hiện làm lịch sử, ghi rõ không còn hoạt động */
function CoveredPanels({ subscription: s }: { subscription: SubscriptionView }) {
  const panels = s.coveredPanels ?? []
  if (s.coverageScope !== 'PANEL' || panels.length === 0) return null
  return (
    <details className="mt-2">
      <summary className="tap cursor-pointer text-meta font-medium text-fg">
        Tấm pin được bảo vệ ({panels.reduce((sum, a) => sum + a.unitCount, 0)} tấm)
      </summary>
      <ul className="mt-1 space-y-1 text-meta text-fg">
        {panels.map((a) => (
          <li key={a.allocationId}>
            {coveredPanelLabel(a)}
            {a.assetStatus !== 'ACTIVE' && <span className="text-fg-2">, không còn hoạt động</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}

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
  onRenew,
}: {
  items: SubscriptionView[]
  /** contractId → số hợp đồng; thiếu thì in mã ngắn */
  contractNumbers: Map<string, string>
  onPay: (attemptId: string) => void
  onCancel: (subscription: SubscriptionView) => void
  /** Đặt lịch một lượt bảo trì của gói đang hiệu lực */
  onBook: (entitlement: EntitlementView, subscription: SubscriptionView) => void
  /** Gia hạn một kỳ gói theo tấm pin (hộp gia hạn hỏi backend kỳ đó gia hạn được không) */
  onRenew?: (subscription: SubscriptionView) => void
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {[...items].sort(bySubscriptionRank).map((s) => {
        const status = subscriptionStatusMeta(s.status)
        const mode = cancelMode(s.status)
        const term = termText(s)
        const payAttempt = s.status === 'AWAITING_PAYMENT' ? s.currentPaymentAttemptId : null
        const renewable = Boolean(onRenew) && mayRenew(s)
        return (
          <li key={s.subscriptionId} className="py-4">
            <div className="grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_auto] lg:items-center">
              <div className="min-w-0">
                <h3 className="text-body font-semibold text-fg">{s.packageName}</h3>
                <p className="mt-0.5 text-meta text-fg-2">
                  Hợp đồng <span className="tnum">{contractNumbers.get(s.contractId) ?? shortCode(s.contractId)}</span>,{' '}
                  {vnd(s.price)}, {formatDurationMonths(s.durationMonths)}, {originText(s)}
                </p>
                <p className="mt-0.5 text-meta text-fg-2">{scopeText(s)}</p>
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
              <div className="min-w-0">
                <p className="text-meta text-fg">{benefitText(s)}</p>
                <CoveredPanels subscription={s} />
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                <Badge tone={status.tone}>{status.label}</Badge>
                {(payAttempt || mode || renewable) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {renewable && (
                      <Button icon="autorenew" size="sm" variant="soft" onClick={() => onRenew?.(s)}>
                        Gia hạn
                      </Button>
                    )}
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
            {isMaintenance(s.kind) && s.entitlements.length > 0 && <EntitlementList subscription={s} onBook={onBook} />}
          </li>
        )
      })}
    </ul>
  )
}
