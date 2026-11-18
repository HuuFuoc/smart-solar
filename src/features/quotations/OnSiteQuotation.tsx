import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ON_SITE_DECISIONS,
  ON_SITE_NOTE_MAX,
  ON_SITE_PAYMENT_METHODS,
  QUOTATION_PAYMENT_STATES,
  type OnSiteDecision,
} from '@/common/quotation'
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
  canStartPayment,
  decisionNoteError,
  isVerifiedPaid,
} from '@/features/quotations/quotationRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useCancelQuotationPaymentMutation,
  useOnSiteDecisionMutation,
  useQuotationPaymentQuery,
  useStartQuotationPaymentMutation,
} from '@/hooks/useTechnicianQuotations'
import { ROUTES } from '@/routes/paths'
import { isApiError } from '@/services/api/errors'
import type { QuotationPaymentView, QuotationView } from '@/types/res/quotationsRes'

// Báo giá đã chốt, trình bày và chốt tại công trình trên máy kỹ thuật viên: màn xem to cho khách đọc, ghi điều khách quyết định
// bằng tài khoản kỹ thuật viên (khách không đăng nhập), rồi mở thanh toán QR PayOS hoặc tiền mặt. "Đã thanh toán" chỉ hiện khi
// backend xác minh (PAID kèm hợp đồng); trang PayOS chuyển về hay khách nói đã quét đều không đủ

const DECISION_TEXT: Record<OnSiteDecision, { title: string; confirm: string; icon: string; done: string }> = {
  AGREED: {
    title: 'Khách đồng ý báo giá?',
    confirm: 'Khách đồng ý',
    icon: 'check_circle',
    done: 'Đã ghi khách đồng ý. Mở thanh toán cho khách.',
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
      await record.mutateAsync({
        quotationId: q.quotationId,
        decision,
        revision: q.revision,
        note: note.trim() || null,
      })
      toast.success(text.done)
      onDone?.()
      onClose()
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
 * Thanh toán của báo giá khách đã đồng ý. Mở / huỷ bị giới hạn 5 lần / 10 phút nên chỉ gọi khi bấm. Đổi cách trả phải huỷ lần đang
 * mở trước; khách đổi ý khi chưa mở thanh toán thì ghi "không đồng ý" / "muốn sửa"
 */
export function QuotationPaymentPanel({
  quotation: q,
  onWithdraw,
}: {
  quotation: QuotationView
  onWithdraw: (decision: OnSiteDecision) => void
}) {
  const query = useQuotationPaymentQuery(q.quotationId)
  const start = useStartQuotationPaymentMutation()
  const cancel = useCancelQuotationPaymentMutation()
  const [confirmCash, setConfirmCash] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = start.isPending || cancel.isPending
  const view = query.data
  const state = view?.paymentState
  const meta = state ? (QUOTATION_PAYMENT_STATES[state] ?? { label: state, tone: 'neutral' as const }) : null

  async function open(method: 'ONLINE' | 'CASH') {
    setError(null)
    try {
      await start.mutateAsync({ quotationId: q.quotationId, method })
      toast.success(method === 'CASH' ? 'Đã ghi khách trả tiền mặt. Chờ quản lý xác nhận đã thu.' : 'Đã tạo mã QR.')
      setConfirmCash(false)
    } catch (e) {
      setError(quotationErrorMessage(e))
      if (isApiError(e)) void query.refetch()
    }
  }

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
        description={`Khách trả đúng ${formatQuotationMoney(q.totalAmount, q.currency)}; tiền được xác minh thì hợp đồng tự lập.`}
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
            Khách đã đồng ý lúc {formatMoment(q.acceptedAt)}. Hiện mã QR để khách quét, hoặc ghi khách trả tiền mặt.
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
            {canStartPayment(state) && (
              <>
                <Button
                  icon="qr_code_2"
                  variant="primary"
                  disabled={busy}
                  onClick={() => void open(ON_SITE_PAYMENT_METHODS.online)}
                >
                  {start.isPending ? 'Đang tạo…' : 'Hiện mã QR'}
                </Button>
                <Button icon="payments" variant="soft" disabled={busy} onClick={() => setConfirmCash(true)}>
                  Khách trả tiền mặt
                </Button>
              </>
            )}
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

      {confirmCash && (
        <ModalDialog
          open
          onOpenChange={(o) => !o && !busy && setConfirmCash(false)}
          dismissible={!busy}
          aria-label="Khách trả tiền mặt?"
        >
          <DialogTitle>Khách trả tiền mặt?</DialogTitle>
          <div className="mt-2 space-y-3 text-body text-fg-2">
            <p>
              Thu đúng {formatQuotationMoney(q.totalAmount, q.currency)} và viết phiếu thu. Quản lý / quản trị xác nhận
              đã thu (đúng số tiền, số phiếu thu, ảnh phiếu); chỉ khi đó hợp đồng mới được lập.
            </p>
          </div>
          {error && (
            <div role="alert" className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <DialogFooter>
            <Button icon="close" variant="secondary" disabled={busy} onClick={() => setConfirmCash(false)}>
              Đóng
            </Button>
            <Button
              icon="payments"
              variant="primary"
              disabled={busy}
              onClick={() => void open(ON_SITE_PAYMENT_METHODS.cash)}
            >
              {start.isPending ? 'Đang ghi…' : 'Ghi trả tiền mặt'}
            </Button>
          </DialogFooter>
        </ModalDialog>
      )}
    </Panel>
  )
}
