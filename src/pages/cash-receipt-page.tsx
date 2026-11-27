import { useIsMutating } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { PAYMENT_ITEM_STATUSES, PAYMENT_ITEM_TYPES } from '@/common/paymentDesk'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, PageSkeleton, UnavailableState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { paymentStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { CashReceiptEvidenceViewer } from '@/features/cash-receipts/CashReceiptEvidenceViewer'
import { CashReceiptHistory } from '@/features/cash-receipts/CashReceiptHistory'
import {
  AcceptReceiptDialog,
  RejectReceiptDialog,
  type ReviewOutcome,
} from '@/features/cash-receipts/CashReceiptReviewDialogs'
import { CashReceiptStatusBadge } from '@/features/cash-receipts/CashReceiptStatusBadge'
import { readErrorText } from '@/features/cash-receipts/cashReceiptDisplay'
import { receiptContractPath, receiptQueuePath, type ReceiptPortal } from '@/features/cash-receipts/cashReceiptRoutes'
import { canReview, receiptContextLabel } from '@/features/cash-receipts/cashReceiptRules'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { REVIEW_MUTATION_KEY, useCashReceiptDetailQuery } from '@/hooks/useCashReceipts'
import { isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import * as service from '@/services/cashReceiptService'
import { formatMoney } from '@/utils/format'

// Xét duyệt một phiếu thu tiền mặt (quản lý và quản trị dùng chung): ảnh phiếu thu kỹ thuật viên đã gửi đặt trước tiên để đối
// chiếu, cạnh đó là hợp đồng, khoản, số tiền, người thu, các mốc giờ; dưới là các dòng của lần thanh toán và mọi lần gửi phiếu của
// cùng lần thanh toán. Xác nhận / yêu cầu bổ sung gửi kèm revision của phiếu; phiếu đổi ở nơi khác thì tải lại và xem lại

type Dialog = 'accept' | 'reject' | null

function CashReceiptPage({ portal }: { portal: ReceiptPortal }) {
  const { id } = useParams()
  const location = useLocation()
  const queueSearch = (location.state as { queueSearch?: string } | null)?.queueSearch ?? ''
  const query = useCashReceiptDetailQuery(id)
  usePageCrumb(query.data ? `Phiếu thu ${query.data.current.receipt.receiptNumber}` : null)
  const reviewing = useIsMutating({ mutationKey: REVIEW_MUTATION_KEY }) > 0
  const [dialog, setDialog] = useState<Dialog>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const back = { to: `${receiptQueuePath(portal)}${queueSearch}`, label: 'Phiếu thu tiền mặt' }

  function closeDialog(outcome?: ReviewOutcome) {
    setDialog(null)
    if (outcome?.kind === 'reload') {
      setNotice(outcome.message)
      void query.refetch()
    } else if (outcome?.kind === 'done') setNotice(null)
  }

  if (query.isPending) return <PageSkeleton />
  const data = query.data
  if (!data)
    return (
      <>
        <PageHeader title="Phiếu thu tiền mặt" back={back} />
        {isFeatureUnavailable(query.error) ? (
          <UnavailableState
            title="Phiếu thu tiền mặt tạm thời chưa dùng được."
            message={readErrorText(query.error)}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : (
          <ErrorState
            title={
              isApiError(query.error) && query.error.status === 404
                ? 'Không tìm thấy phiếu thu này.'
                : 'Không tải được phiếu thu.'
            }
            message={readErrorText(query.error)}
            onRetry={
              isApiError(query.error) && query.error.status >= 400 && query.error.status < 500
                ? undefined
                : () => void query.refetch()
            }
          />
        )}
      </>
    )

  const row = data.current
  const r = row.receipt
  const reviewable = canReview(row)
  const payment = paymentStatusMeta(row.paymentStatus, 'CASH')
  const history = [...data.history].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
  const lines = data.lines ?? []
  const unapplied = lines.some((l) => l.status === 'REVIEW_REQUIRED')

  return (
    <>
      <PageHeader
        title={`Phiếu thu ${r.receiptNumber}`}
        back={back}
        meta={
          <>
            <CashReceiptStatusBadge status={r.status} />
            <span>{receiptContextLabel(row)}</span>
          </>
        }
        actions={
          reviewable && (
            <>
              <Button icon="assignment_return" variant="warn" disabled={reviewing} onClick={() => setDialog('reject')}>
                Yêu cầu bổ sung
              </Button>
              <Button icon="task_alt" variant="primary" disabled={reviewing} onClick={() => setDialog('accept')}>
                Xác nhận phiếu thu
              </Button>
            </>
          )
        }
      />

      <div className="space-y-6">
        {notice && (
          <div role="status">
            <Notice tone="warn">{notice}</Notice>
          </div>
        )}
        {query.isError && (
          <Notice tone="warn">
            Không làm mới được phiếu thu, đang hiện bản tải lúc trước.{' '}
            <button type="button" className="tap ui-link font-medium" onClick={() => void query.refetch()}>
              Thử lại
            </button>
          </Notice>
        )}
        {r.status === 'ACCEPTED' && (
          <Notice tone="ok" title={`Đã xác nhận phiếu thu lúc ${formatMoment(r.reviewedAt)}`}>
            Lần thanh toán: {payment.label.toLowerCase()}.{r.reviewReason ? ` Ghi chú: ${r.reviewReason}` : ''}
          </Notice>
        )}
        {r.status === 'REJECTED' && (
          <Notice tone="warn" title={`Đã yêu cầu bổ sung lúc ${formatMoment(r.reviewedAt)}`}>
            {r.reviewReason}
          </Notice>
        )}
        {unapplied && (
          <Notice tone="warn" title="Tiền đã ghi nhận nhưng chưa áp vào khoản">
            Xem ở mục Thu tiền, tab Tiền chưa áp.
          </Notice>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel aria-labelledby="receipt-evidence">
            <PanelHeader title={<span id="receipt-evidence">Ảnh phiếu thu</span>} />
            <CashReceiptEvidenceViewer
              key={r.cashReceiptId}
              name={`Ảnh phiếu thu ${r.receiptNumber}`}
              request={(disposition) => service.getCashReceiptEvidenceUrl(r.cashReceiptId, disposition)}
            />
          </Panel>

          <Panel aria-labelledby="receipt-info" className="lg:border-t-0 lg:pt-0">
            <PanelHeader title={<span id="receipt-info">Thông tin</span>} />
            <Facts
              column
              items={[
                {
                  k: 'Số tiền',
                  v: <span className="text-title font-semibold">{formatVnd(r.amount)}</span>,
                },
                {
                  k: 'Hợp đồng',
                  v: r.contractId ? (
                    <Link to={receiptContractPath(portal, r.contractId)} className="ui-link">
                      {row.contractNumber || 'Mở hợp đồng'}
                    </Link>
                  ) : (
                    row.contractNumber || '—'
                  ),
                },
                { k: 'Khoản thu', v: receiptContextLabel(row) },
                { k: 'Khách hàng', v: row.customerName },
                { k: 'Kỹ thuật viên thu tiền', v: row.collectedByName },
                { k: 'Thu tiền lúc', v: formatMoment(r.collectedAt) },
                { k: 'Gửi phiếu lúc', v: formatMoment(r.submittedAt) },
                { k: 'Ghi chú của kỹ thuật viên', v: r.note || '—' },
                { k: 'Lần thanh toán', v: <Badge tone={payment.tone}>{payment.label}</Badge> },
              ]}
            />
          </Panel>
        </div>

        {lines.length > 0 && (
          <Panel aria-labelledby="receipt-lines">
            <PanelHeader title={<span id="receipt-lines">Khoản của lần thanh toán</span>} />
            <ul className="space-y-1">
              {lines.map((l, i) => {
                const status = PAYMENT_ITEM_STATUSES[l.status]
                return (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-3 text-body">
                    <span className="text-fg">{PAYMENT_ITEM_TYPES[l.itemType] ?? l.itemType}</span>
                    <span className="tnum text-fg-2">{formatMoney(l.amount, 'VND')}</span>
                    {status && <Badge tone={status.tone}>{status.label}</Badge>}
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}

        <Panel aria-labelledby="receipt-history">
          <PanelHeader title={<span id="receipt-history">Các lần gửi phiếu thu ({history.length})</span>} />
          <CashReceiptHistory
            receipts={history}
            highlightId={r.cashReceiptId}
            evidence={(receiptId, disposition) => service.getCashReceiptEvidenceUrl(receiptId, disposition)}
          />
        </Panel>
      </div>

      {dialog === 'accept' && reviewable && <AcceptReceiptDialog row={row} onClose={closeDialog} />}
      {dialog === 'reject' && reviewable && <RejectReceiptDialog row={row} onClose={closeDialog} />}
    </>
  )
}

export function ManageCashReceiptPage() {
  return <CashReceiptPage portal="manager" />
}

export function AdminCashReceiptPage() {
  return <CashReceiptPage portal="admin" />
}
