import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ON_SITE_DECISIONS, ON_SITE_NOTE_MAX, QUOTATION_PAYMENT_STATES, type OnSiteDecision } from '@/common/quotation'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink, buttonClass } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { formatCountdown, secondsLeft } from '@/features/contracts/customerContractRules'
import { PaymentQr } from '@/features/payments/PaymentQr'
import { isCheckoutUrl } from '@/features/payments/payosReturn'
import { Facts } from '@/features/pre-surveys/Facts'
import { QuotationLines, QuotationTerms, QuotationTotals } from '@/features/quotations/QuotationContent'
import {
  formatDateVn,
  formatQuotationMoney,
  quotationErrorMessage,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import {
  canCancelPayment,
  canRecordAgreed,
  canRecordWithdrawal,
  decisionNoteError,
  isVerifiedPaid,
} from '@/features/quotations/quotationRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useCancelQuotationPaymentMutation,
  useOnSiteDecisionMutation,
  useQuotationPaymentQuery,
} from '@/hooks/useTechnicianQuotations'
import { ROUTES, withId } from '@/routes/paths'
import type { QuotationPaymentView, QuotationView } from '@/types/res/quotationsRes'

// Báo giá đã chốt, trình bày và chốt tại công trình trên máy kỹ thuật viên: màn xem to cho khách đọc, ghi điều khách quyết định
// bằng tài khoản kỹ thuật viên (khách không đăng nhập). Từ backend 7d27054 ghi "khách đồng ý" là lập ngay hợp đồng 30/70 (bản nháp,
// khách đọc trước khi trả): thu 30% và tải trang ký ở trang hợp đồng. Thanh toán 100% báo giá theo cách cũ đã bỏ (mở mới trả 410),
// chỉ còn xem / huỷ lần đã mở trước đó

const DECISION_TEXT: Record<OnSiteDecision, { title: string; confirm: string; icon: string; done: string }> = {
  AGREED: {
    title: 'Khách đồng ý báo giá?',
    confirm: 'Khách đồng ý',
    icon: 'check_circle',
    done: 'Đã ghi khách đồng ý. Hợp đồng 30/70 đã lập; thu 30% ở trang hợp đồng.',
  },
  DECLINED: {
    title: 'Khách không đồng ý báo giá?',
    confirm: 'Ghi không đồng ý',
    icon: 'block',
    done: 'Đã ghi khách không đồng ý. Không phát sinh thanh toán.',
  },
  REVISION_NEEDED: {
    title: 'Khách muốn sửa báo giá?',
    confirm: 'Ghi muốn sửa',
    icon: 'edit_note',
    done: 'Đã ghi khách muốn sửa. Lập bản sửa rồi chốt lại.',
  },
}

/** Ghi một quyết định của khách; ghi chú bắt buộc khi không đồng ý / muốn sửa. 409 thì báo lỗi, danh sách đã tải lại */
export function DecisionDialog({
  quotation: q,
  decision,
  onClose,
  onDone,
}: {
  quotation: QuotationView
  decision: OnSiteDecision
  onClose: () => void
  onDone?: () => void
}) {
  const record = useOnSiteDecisionMutation()
  const navigate = useNavigate()
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const text = DECISION_TEXT[decision]
  const busy = record.isPending

  async function submit() {
    setError(null)
    const problem = decisionNoteError(decision, note)
    setNoteError(problem)
    if (problem) return
    try {
      const view = await record.mutateAsync({
        quotationId: q.quotationId,
        decision,
        revision: q.revision,
        note: note.trim() || null,
      })
      toast.success(text.done)
      onDone?.()
      onClose()
      // Ghi đồng ý lại cũng trả đúng hợp đồng đã lập, không lập bản thứ hai
      if (decision === ON_SITE_DECISIONS.agreed && view.contractId)
        void navigate(withId(ROUTES.tech.contract, view.contractId))
    } catch (e) {
      setError(quotationErrorMessage(e))
    }
  }

  return (
    <ModalDialog open onOpenChange={(o) => !o && !busy && onClose()} dismissible={!busy} aria-label={text.title}>
      <DialogTitle>{text.title}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        {quotationTitle(q)}, tổng {formatQuotationMoney(q.totalAmount, q.currency)}. Ghi bằng tài khoản của bạn, kèm giờ
        và bản báo giá đang trình bày.
      </p>
      <div className="mt-4">
        <Field
          label={decision === ON_SITE_DECISIONS.agreed ? 'Ghi chú' : 'Khách nói gì'}
          htmlFor="decision-note"
          optional={decision === ON_SITE_DECISIONS.agreed}
          required={decision !== ON_SITE_DECISIONS.agreed}
          error={noteError ?? undefined}
        >
          <Textarea
            id="decision-note"
            rows={3}
            maxLength={ON_SITE_NOTE_MAX}
            value={note}
            disabled={busy}
            aria-invalid={Boolean(noteError) || undefined}
            aria-describedby={fieldMessageId('decision-note')}
            placeholder={
              decision === ON_SITE_DECISIONS.agreed
                ? 'Ví dụ: Khách đồng ý tại nhà, có mặt cả hai vợ chồng.'
                : 'Ví dụ: Khách muốn đổi sang inverter 3 pha.'
            }
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        <Button
          icon={text.icon}
          variant={decision === ON_SITE_DECISIONS.agreed ? 'primary' : decision === 'DECLINED' ? 'danger' : 'warn'}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? 'Đang ghi…' : text.confirm}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

/** Màn xem báo giá cỡ chữ to, để khách đọc trên máy kỹ thuật viên; ghi quyết định ngay tại đây */
export function PresentQuotationDialog({
  quotation: q,
  onClose,
  onDecide,
}: {
  quotation: QuotationView
  onClose: () => void
  onDecide: (decision: OnSiteDecision) => void
}) {
  const agreeable = canRecordAgreed(q)
  return (
    <ModalDialog open onOpenChange={(o) => !o && onClose()} className="max-w-5xl" aria-label="Báo giá lắp đặt">
      <DialogTitle>Báo giá lắp đặt {quotationTitle(q)}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Hiệu lực đến hết ngày {formatDateVn(q.validUntil)}. Giá theo danh mục Smart Solar lúc chốt, đã gồm thuế{' '}
        {q.taxRatePercent.toLocaleString('vi-VN')}%.
      </p>
      <p className="tnum mt-3 text-display font-semibold text-fg">{formatQuotationMoney(q.totalAmount, q.currency)}</p>
      <div className="mt-4 space-y-4">
        <QuotationLines quotation={q} />
        <QuotationTotals quotation={q} className="ml-auto" />
        <QuotationTerms quotation={q} />
        {!agreeable && q.status === 'ISSUED' && (
          <Notice tone="warn" title="Không ghi đồng ý được bản này">
            {q.surveyChanged
              ? 'Biên bản khảo sát đã được bổ sung sau khi chốt giá. Lập bản sửa theo biên bản mới.'
              : 'Báo giá đã hết hạn. Lập bản sửa để lấy giá danh mục hiện tại.'}
          </Notice>
        )}
      </div>
      <DialogFooter className="flex-wrap">
        <Button icon="close" variant="secondary" onClick={onClose}>
          Đóng
        </Button>
        {q.status === 'ISSUED' && (
          <>
            <Button icon="block" variant="danger" onClick={() => onDecide(ON_SITE_DECISIONS.declined)}>
              Khách không đồng ý
            </Button>
            <Button icon="edit_note" variant="warn" onClick={() => onDecide(ON_SITE_DECISIONS.revisionNeeded)}>
              Khách muốn sửa
            </Button>
            {agreeable && (
              <Button icon="check_circle" variant="primary" onClick={() => onDecide(ON_SITE_DECISIONS.agreed)}>
                Khách đồng ý
              </Button>
            )}
          </>
        )}
      </DialogFooter>
    </ModalDialog>
  )
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

function QrBlock({ view, onCheck, checking }: { view: QuotationPaymentView; onCheck: () => void; checking: boolean }) {
  const attempt = view.current
  const now = useNow(true)
  if (!attempt) return null
  const left = secondsLeft(attempt.expiresAt, now)
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-start">
      {attempt.qrCode ? (
        <PaymentQr
          value={attempt.qrCode}
          label={`Mã QR thanh toán ${formatQuotationMoney(attempt.amount, attempt.currency)}`}
          className="w-full max-w-64 rounded-control border border-line"
        />
      ) : (
        <p className="text-body text-fg-2">PayOS chưa trả mã QR. Mở trang thanh toán bằng nút bên cạnh.</p>
      )}
      <div className="space-y-3">
        <p className="text-body text-fg">Khách quét mã bằng app ngân hàng, không cần đăng nhập Smart Solar.</p>
        <Facts
          column
          items={[
            { k: 'Số tiền', v: <span className="tnum">{formatQuotationMoney(attempt.amount, attempt.currency)}</span> },
            { k: 'Mã đơn', v: <span className="tnum">{attempt.orderCode}</span> },
            {
              k: 'Hết hạn',
              v: (
                <span className="tnum">
                  {formatMoment(attempt.expiresAt)}
                  {left !== null && left > 0 && `, còn ${formatCountdown(left)}`}
                </span>
              ),
            },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          {isCheckoutUrl(attempt.checkoutUrl) && (
            <a href={attempt.checkoutUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('info')}>
              Mở trang thanh toán
            </a>
          )}
          <Button icon="refresh" variant="secondary" disabled={checking} onClick={onCheck}>
            {checking ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
          </Button>
        </div>
        <p className="text-meta text-fg-2">Trạng thái tự cập nhật 5 giây một lần.</p>
      </div>
    </div>
  )
}

/**
 * Thanh toán 100% của báo giá đồng ý theo cách cũ (trước hợp đồng 30/70): chỉ xem và huỷ lần đã mở, vì mở mới đã bỏ (410). Báo giá
 * có hợp đồng 30/70 không dùng khối này
 */
export function QuotationPaymentPanel({
  quotation: q,
  onWithdraw,
}: {
  quotation: QuotationView
  onWithdraw: (decision: OnSiteDecision) => void
}) {
  const query = useQuotationPaymentQuery(q.quotationId)
  const cancel = useCancelQuotationPaymentMutation()
  const [error, setError] = useState<string | null>(null)
  const busy = cancel.isPending
  const view = query.data
  const state = view?.paymentState
  const meta = state ? (QUOTATION_PAYMENT_STATES[state] ?? { label: state, tone: 'neutral' as const }) : null

  async function stop() {
    setError(null)
    try {
      await cancel.mutateAsync(q.quotationId)
      toast.success('Đã huỷ lần thanh toán đang mở.')
    } catch (e) {
      setError(quotationErrorMessage(e))
      void query.refetch()
    }
  }

  return (
    <Panel id="quotation-payment" className="scroll-mt-6">
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Thanh toán {meta && <Badge tone={meta.tone}>{meta.label}</Badge>}
          </span>
        }
        description="Thanh toán 100% báo giá theo cách cũ, mở trước khi chuyển sang hợp đồng 30/70. Chỉ còn xem và huỷ."
      />
      <PanelBody className="space-y-4">
        {query.isPending ? (
          <Skeleton className="h-40" />
        ) : !view ? (
          <ErrorState
            title="Không tải được trạng thái thanh toán."
            message={quotationErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : isVerifiedPaid(view) ? (
          <Notice tone="ok" title={`Đã nhận ${formatQuotationMoney(view.amount, view.currency)}`}>
            <span className="block">
              {view.current?.method === 'CASH' ? 'Quản lý đã xác nhận tiền mặt' : 'PayOS đã xác nhận'}
              {view.current?.paidAt ? ` lúc ${formatMoment(view.current.paidAt)}` : ''}. Hợp đồng đã được lập; quản lý
              chuẩn bị hồ sơ để khách ký bản giấy.
            </span>
            <span className="mt-3 flex">
              <ButtonLink to={ROUTES.tech.installationSchedules} size="sm" variant="soft" icon="event_available">
                Hẹn ngày thi công
              </ButtonLink>
            </span>
          </Notice>
        ) : state === 'REVIEW_REQUIRED' ? (
          <Notice tone="warn" title="Tiền đã về nhưng chưa áp được vào báo giá">
            Số tiền lệch hoặc báo giá đã thay đổi trong lúc khách trả. Báo quản lý xử lý; chưa có hợp đồng nào được lập.
          </Notice>
        ) : state === 'ONLINE_IN_PROGRESS' ? (
          <QrBlock view={view} checking={query.isFetching} onCheck={() => void query.refetch()} />
        ) : state === 'AWAITING_CASH_CONFIRMATION' ? (
          <Notice tone="info" title="Chờ quản lý xác nhận thu tiền mặt">
            Nộp tiền và phiếu thu cho quản lý. Bạn không tự xác nhận được; hợp đồng lập khi quản lý ghi đã thu đủ.
          </Notice>
        ) : state === 'AWAITING_PAYMENT' ? (
          <p className="text-body text-fg-2">
            Khách đã đồng ý lúc {formatMoment(q.acceptedAt)} theo cách cũ. Thanh toán 100% báo giá không mở mới được
            nữa; ghi khách muốn sửa rồi chốt lại để lập hợp đồng 30/70.
          </p>
        ) : (
          <Notice tone="warn" title="Báo giá không còn thanh toán được">
            {q.isExpired
              ? 'Báo giá đã hết hạn trước khi khách trả. Ghi khách muốn sửa rồi lập bản mới theo giá hiện tại.'
              : 'Báo giá đã đóng hoặc yêu cầu khảo sát đã kết thúc.'}
          </Notice>
        )}

        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}

        {view && !isVerifiedPaid(view) && (
          <div className="flex flex-wrap gap-3">
            {canCancelPayment(state) && (
              <Button icon="cancel" variant="danger" disabled={busy} onClick={() => void stop()}>
                {cancel.isPending
                  ? 'Đang huỷ…'
                  : state === 'AWAITING_CASH_CONFIRMATION'
                    ? 'Bỏ chọn tiền mặt'
                    : 'Huỷ mã QR'}
              </Button>
            )}
            {canRecordWithdrawal(q, state) && (
              <>
                <Button
                  icon="edit_note"
                  variant="warn"
                  disabled={busy}
                  onClick={() => onWithdraw(ON_SITE_DECISIONS.revisionNeeded)}
                >
                  Khách muốn sửa
                </Button>
                <Button
                  icon="block"
                  variant="danger"
                  disabled={busy}
                  onClick={() => onWithdraw(ON_SITE_DECISIONS.declined)}
                >
                  Khách đổi ý
                </Button>
              </>
            )}
          </div>
        )}
        {canCancelPayment(state) && <p className="text-meta text-fg-2">Muốn đổi cách trả thì huỷ lần đang mở trước.</p>}
      </PanelBody>
    </Panel>
  )
}
