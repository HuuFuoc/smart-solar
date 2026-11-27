import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink, buttonClass } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Select, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { ListPager } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { PAYMENT_ITEM_STATUSES, PAYMENT_ITEM_TYPES } from '@/common/paymentDesk'
import { paymentStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import {
  RECEIPT_KIND_FILTERS,
  RECEIPT_NOTE_MAX,
  RECEIPT_STATUS_FILTERS,
  REVIEW_REASON_MAX,
  receiptContextDetail,
  receiptContextLabel,
  receiptStatusMeta,
  reviewReasonError,
  unappliedLines,
} from '@/features/payments/cashReceiptRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useCashReceiptQuery, useCashReceiptsQuery, useReviewCashReceiptMutation } from '@/hooks/usePaymentDesk'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError } from '@/services/api/errors'
import { getCashReceiptEvidenceUrl } from '@/services/paymentDeskService'
import type { StaffCashReceiptDetail, StaffCashReceiptView } from '@/types/res/cashReceiptsRes'
import type { AttachedFileUrlView } from '@/types/res/paymentPlanRes'
import { formatMoney } from '@/utils/format'

// Phiếu thu tiền mặt kỹ thuật viên gửi, một hàng đợi cho khoản 30/70 và báo giá hậu mãi (quản lý, quản trị). Duyệt thì lần thanh
// toán thành đã trả đúng một lần; yêu cầu bổ sung thì kỹ thuật viên gửi lại cho cùng lần thanh toán. Kết quả áp tiền đọc lại ở
// chi tiết sau khi duyệt: dòng "Cần đối soát" là tiền đã ghi nhận mà không áp vào khoản nào (thu sau hạn), không phải đã thanh toán

const PAGE_SIZE = 20

export type Viewer = 'manager' | 'admin'
const CONTRACT = { manager: ROUTES.manage.contract, admin: ROUTES.admin.contract }
const REQUEST = { manager: ROUTES.manage.afterSalesRequest, admin: ROUTES.admin.afterSalesRequest }
const PAYMENTS = { manager: ROUTES.manage.payments, admin: ROUTES.admin.payments }

const pageOf = (raw: string | null) => Math.max(1, Number.parseInt(raw ?? '1', 10) || 1)

/** Lỗi bản đã cũ / đã được người khác duyệt: tải lại và xem lại, không tự gửi lại */
const isStale = (e: unknown) =>
  isApiError(e) && (e.code === 'PAYMENT_CASH_RECEIPT_STALE' || e.code === 'PAYMENT_CASH_RECEIPT_NOT_REVIEWABLE')

function ContextCell({ row }: { row: StaffCashReceiptView }) {
  const detail = receiptContextDetail(row)
  return (
    <>
      <p className="text-fg">{receiptContextLabel(row)}</p>
      {detail && <p className="text-meta text-fg-2">{detail}</p>}
    </>
  )
}

/** Ảnh / PDF phiếu: link ký sẵn xin khi mở, chỉ giữ trong state; ảnh lỗi (link hết hạn) thì xin lại một lần */
function ReceiptEvidence({ receiptId, name }: { receiptId: string; name: string }) {
  const [link, setLink] = useState<AttachedFileUrlView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retried, setRetried] = useState(false)

  const fetchLink = useCallback(
    () =>
      getCashReceiptEvidenceUrl(receiptId, 'inline').then(
        (view) => {
          setLink(view)
          setError(null)
        },
        (e: unknown) => {
          setLink(null)
          setError(errorMessage(e))
        },
      ),
    [receiptId],
  )

  useEffect(() => {
    void fetchLink()
  }, [fetchLink])

  function reload() {
    setError(null)
    void fetchLink()
  }

  function broken() {
    if (retried) return setError('Không hiển thị được ảnh phiếu.')
    setRetried(true)
    reload()
  }

  if (error)
    return (
      <div role="alert" className="space-y-3 rounded-control border border-line p-4">
        <p className="text-body text-danger">{error}</p>
        <Button size="sm" variant="secondary" icon="refresh" onClick={reload}>
          Thử lại
        </Button>
      </div>
    )
  if (!link) return <Skeleton className="h-80 w-full" />
  return (
    <figure className="space-y-2">
      {link.contentType === 'application/pdf' ? (
        <iframe src={link.url} title={name} className="h-[60dvh] w-full rounded-control border border-line" />
      ) : (
        <img
          src={link.url}
          alt={name}
          className="max-h-[60dvh] w-full rounded-control border border-line bg-surface-2 object-contain"
          onError={broken}
        />
      )}
      <figcaption>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className={buttonClass('secondary', 'sm', undefined, false)}
          onClick={(e) => {
            // Link đã hết hạn: xin link mới, bấm lại để mở
            if (Date.parse(link.expiresAt) > Date.now()) return
            e.preventDefault()
            reload()
          }}
        >
          Mở cỡ lớn
          <span className="sr-only"> (mở tab mới)</span>
        </a>
      </figcaption>
    </figure>
  )
}

type Step = 'view' | 'accept' | 'reject'

function ReviewBody({
  detail,
  viewer,
  onReloaded,
}: {
  detail: StaffCashReceiptDetail
  viewer: Viewer
  onReloaded: () => Promise<unknown>
}) {
  const review = useReviewCashReceiptMutation()
  const [step, setStep] = useState<Step>('view')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const row = detail.current
  const r = row.receipt
  const meta = receiptStatusMeta(r.status, 'staff')
  const unapplied = unappliedLines(detail.lines)
  const lines = detail.lines ?? []
  const reviewable = r.status === 'SUBMITTED'
  const contractId = r.contractId
  const requestId = row.serviceRequestId ?? r.serviceRequestId

  async function send(action: 'accept' | 'reject') {
    setError(null)
    if (action === 'reject') {
      const problem = reviewReasonError(reason)
      setReasonError(problem)
      if (problem) return
    }
    try {
      await review.mutateAsync({
        receiptId: r.cashReceiptId,
        action,
        body:
          action === 'accept'
            ? { revision: r.revision, note: note.trim() || null }
            : { revision: r.revision, reason: reason.trim() },
      })
      // Kết quả áp tiền chỉ biết khi đọc lại chi tiết, không suy từ HTTP 200
      await onReloaded()
      toast.success(action === 'accept' ? 'Đã duyệt phiếu thu.' : 'Đã yêu cầu kỹ thuật viên gửi lại phiếu.')
      setStep('view')
    } catch (e) {
      if (isStale(e)) {
        await onReloaded()
        setStep('view')
      }
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ReceiptEvidence receiptId={r.cashReceiptId} name={`Ảnh phiếu thu ${r.receiptNumber}`} />
        <div className="min-w-0 space-y-4">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="tnum text-figure font-semibold text-fg">{formatMoney(r.amount, 'VND')}</span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </p>
          <KeyValueList
            items={[
              { k: 'Khách hàng', v: row.customerName || '—' },
              { k: 'Khoản', v: <ContextCell row={row} /> },
              { k: 'Người thu', v: row.collectedByName || '—' },
              { k: 'Thu lúc', v: <span className="tnum">{formatMoment(r.collectedAt)}</span> },
              { k: 'Gửi lúc', v: <span className="tnum">{formatMoment(r.submittedAt)}</span> },
              ...(r.note ? [{ k: 'Ghi chú của kỹ thuật viên', v: r.note }] : []),
              { k: 'Lần thanh toán', v: paymentStatusMeta(row.paymentStatus, 'CASH').label },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {contractId && (
              <ButtonLink size="sm" icon="history_edu" variant="info" to={withId(CONTRACT[viewer], contractId)}>
                Mở hợp đồng
              </ButtonLink>
            )}
            {requestId && (
              <ButtonLink size="sm" icon="build" variant="info" to={withId(REQUEST[viewer], requestId)}>
                Mở yêu cầu
              </ButtonLink>
            )}
          </div>
          {detail.history.length > 1 && (
            <section aria-label="Các lần gửi phiếu" className="space-y-1">
              <p className="text-body font-medium text-fg">Các lần gửi</p>
              <ol className="divide-y divide-line">
                {detail.history.map((h) => {
                  const m = receiptStatusMeta(h.status, 'staff')
                  return (
                    <li key={h.cashReceiptId} className="py-2 text-body">
                      <p className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium text-fg">{h.receiptNumber}</span>
                        <Badge tone={h.status === 'SUBMITTED' ? m.tone : 'neutral'}>{m.label}</Badge>
                        <span className="tnum text-meta text-fg-2">{formatMoment(h.submittedAt)}</span>
                      </p>
                      {h.reviewReason && <p className="text-meta text-fg-2">{h.reviewReason}</p>}
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <section aria-label="Khoản được trả" className="mt-6 space-y-2">
          <p className="text-body font-medium text-fg">Khoản được trả</p>
          <ul className="divide-y divide-line">
            {lines.map((l, i) => {
              const s = PAYMENT_ITEM_STATUSES[l.status]
              return (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 text-body">
                  <span className="text-fg">{PAYMENT_ITEM_TYPES[l.itemType] ?? 'Khoản khác'}</span>
                  <span className="flex items-baseline gap-3">
                    <span className="tnum text-fg">{formatMoney(l.amount, 'VND')}</span>
                    {s && <Badge tone={s.tone}>{s.label}</Badge>}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {unapplied.length > 0 && (
        <Notice tone="warn" title="Tiền đã ghi nhận, chưa áp vào khoản nào" className="mt-4">
          <span className="block">Khoản này chưa thành đã trả; không mở việc cho kỹ thuật viên.</span>
          <ButtonLink
            size="sm"
            variant="secondary"
            icon="account_balance_wallet"
            className="mt-2"
            to={`${PAYMENTS[viewer]}?muc=tien-chua-ap`}
          >
            Xem sổ tiền chưa áp
          </ButtonLink>
        </Notice>
      )}

      {reviewable && step === 'accept' && (
        <div className="mt-6 space-y-3 border-t border-line pt-4">
          <p className="text-body text-fg">
            Xác nhận đã nhận <span className="tnum font-semibold">{formatMoney(r.amount, 'VND')}</span> theo phiếu{' '}
            <span className="font-semibold">{r.receiptNumber}</span>? Duyệt xong không đổi lại được.
          </p>
          <Field label="Ghi chú" htmlFor="receipt-accept-note" optional>
            <Textarea
              id="receipt-accept-note"
              rows={2}
              maxLength={RECEIPT_NOTE_MAX}
              aria-describedby={fieldMessageId('receipt-accept-note')}
              value={note}
              disabled={review.isPending}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      )}

      {reviewable && step === 'reject' && (
        <div className="mt-6 border-t border-line pt-4">
          <Field
            label="Kỹ thuật viên cần sửa gì"
            htmlFor="receipt-reject-reason"
            required
            error={reasonError ?? undefined}
          >
            <Textarea
              id="receipt-reject-reason"
              rows={3}
              maxLength={REVIEW_REASON_MAX}
              aria-required
              aria-invalid={Boolean(reasonError) || undefined}
              aria-describedby={fieldMessageId('receipt-reject-reason')}
              placeholder="Ví dụ: Ảnh mờ, chụp lại rõ số phiếu."
              value={reason}
              disabled={review.isPending}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      {reviewable && (
        <DialogFooter>
          {step === 'view' ? (
            <>
              <Button icon="undo" variant="warn" onClick={() => setStep('reject')}>
                Yêu cầu bổ sung
              </Button>
              <Button icon="task_alt" variant="primary" onClick={() => setStep('accept')}>
                Xác nhận
              </Button>
            </>
          ) : (
            <>
              <Button icon="arrow_back" variant="secondary" disabled={review.isPending} onClick={() => setStep('view')}>
                Quay lại
              </Button>
              {step === 'accept' ? (
                <Button
                  icon="task_alt"
                  variant="primary"
                  disabled={review.isPending}
                  onClick={() => void send('accept')}
                >
                  {review.isPending ? 'Đang duyệt…' : 'Xác nhận đã nhận tiền'}
                </Button>
              ) : (
                <Button icon="send" variant="warn" disabled={review.isPending} onClick={() => void send('reject')}>
                  {review.isPending ? 'Đang gửi…' : 'Gửi yêu cầu bổ sung'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      )}
    </>
  )
}

function ReviewDialog({ receiptId, viewer, onClose }: { receiptId: string; viewer: Viewer; onClose: () => void }) {
  const query = useCashReceiptQuery(receiptId)
  const number = query.data?.current.receipt.receiptNumber
  return (
    <ModalDialog
      open
      onOpenChange={(o) => !o && onClose()}
      className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto"
      aria-label={number ? `Phiếu thu ${number}` : 'Phiếu thu'}
    >
      <div className="flex items-start justify-between gap-4">
        <DialogTitle>{number ? `Phiếu thu ${number}` : 'Phiếu thu'}</DialogTitle>
        <Button size="sm" variant="secondary" icon="close" onClick={onClose}>
          Đóng
        </Button>
      </div>
      {query.isPending ? (
        <Skeleton className="mt-4 h-96" />
      ) : query.data ? (
        <ReviewBody detail={query.data} viewer={viewer} onReloaded={() => query.refetch()} />
      ) : (
        <ErrorState
          title="Không tải được phiếu thu."
          message={errorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      )}
    </ModalDialog>
  )
}

/** Mục "Phiếu thu" của trang Thu tiền. `?phieu=<mã>` mở thẳng một phiếu (từ dòng lần thanh toán đang có phiếu chờ duyệt) */
export function CashReceiptsTab({ viewer }: { viewer: Viewer }) {
  const [params, setParams] = useSearchParams()
  const status = params.get('trang-thai') ?? 'SUBMITTED'
  const kind = params.get('loai') ?? ''
  const page = pageOf(params.get('trang'))
  const openId = params.get('phieu')
  const query = useCashReceiptsQuery({ status: status || null, kind: kind || null, page, pageSize: PAGE_SIZE })

  const update = (patch: Record<string, string | null>, resetPage = true) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) p.delete(key)
          else p.set(key, value)
        }
        if (resetPage) p.delete('trang')
        return p
      },
      { replace: true },
    )

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Trạng thái" htmlFor="receipt-status">
          <Select
            id="receipt-status"
            value={status}
            active={status !== 'SUBMITTED'}
            onChange={(e) => update({ 'trang-thai': e.target.value })}
          >
            {RECEIPT_STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Loại" htmlFor="receipt-kind">
          <Select
            id="receipt-kind"
            value={kind}
            active={kind !== ''}
            onChange={(e) => update({ loai: e.target.value })}
          >
            {RECEIPT_KIND_FILTERS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <QueryBoundary query={query}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title={status === 'SUBMITTED' ? 'Không có phiếu thu nào chờ duyệt' : 'Không có phiếu thu nào'}
            />
          ) : (
            <>
              <Table stack="xl">
                <thead>
                  <tr>
                    <Th>Phiếu</Th>
                    <Th>Khách hàng</Th>
                    <Th>Khoản</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Số tiền</Th>
                    <Th>
                      <span className="sr-only">Thao tác</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => {
                    const r = row.receipt
                    const meta = receiptStatusMeta(r.status, 'staff')
                    return (
                      <Tr key={r.cashReceiptId}>
                        <Td label="Phiếu">
                          <p className="font-medium break-all text-fg">{r.receiptNumber}</p>
                          <p className="tnum text-meta text-fg-2">Thu lúc {formatMoment(r.collectedAt)}</p>
                        </Td>
                        <Td label="Khách hàng">
                          <p className="text-fg">{row.customerName || '—'}</p>
                          <p className="text-meta text-fg-2">Người thu: {row.collectedByName || '—'}</p>
                        </Td>
                        <Td label="Khoản">
                          <ContextCell row={row} />
                        </Td>
                        <Td label="Trạng thái">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </Td>
                        <Td label="Số tiền" className="tnum xl:text-right">
                          {formatMoney(r.amount, 'VND')}
                        </Td>
                        <Td>
                          <div className="flex xl:justify-end">
                            <Button
                              size="sm"
                              icon={r.status === 'SUBMITTED' ? 'task_alt' : 'visibility'}
                              variant={r.status === 'SUBMITTED' ? 'soft' : 'info'}
                              onClick={() => update({ phieu: r.cashReceiptId }, false)}
                            >
                              {r.status === 'SUBMITTED' ? 'Duyệt' : 'Xem'}
                            </Button>
                          </div>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
              <ListPager
                page={data.page}
                pages={data.totalPages}
                from={(data.page - 1) * data.pageSize + 1}
                to={(data.page - 1) * data.pageSize + data.items.length}
                total={data.totalItems}
                noun="phiếu thu"
                onChange={(next) => update({ trang: String(next) }, false)}
              />
            </>
          )
        }
      </QueryBoundary>

      {openId && <ReviewDialog receiptId={openId} viewer={viewer} onClose={() => update({ phieu: null }, false)} />}
    </>
  )
}
