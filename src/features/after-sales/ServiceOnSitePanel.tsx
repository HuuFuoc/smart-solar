import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { paymentStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { formatVnd, quotationStatusMeta } from '@/features/after-sales/serviceDisplay'
import {
  COMPLETION_PHOTOS_MAX,
  ON_SITE_NOTE_MAX,
  canConfirmCompletionOnSite,
  confirmedOnSite,
  onSiteNoteError,
  serviceQuoteStage,
  visitQuotationIds,
} from '@/features/after-sales/technicianVisitRules'
import { acceptFor, fileProblem } from '@/features/files/fileDisplay'
import { PaymentQr } from '@/features/payments/PaymentQr'
import { isCheckoutUrl } from '@/features/payments/payosReturn'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useCancelServicePaymentMutation,
  useConfirmCompletionOnSiteMutation,
  useServiceQuotationDecisionMutation,
  useServiceQuotationPaymentQuery,
  useStartServicePaymentMutation,
} from '@/hooks/useTechnicianAfterSales'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

// Hậu mãi tại công trình: kỹ thuật viên trình bày báo giá sửa chữa / bảo trì mình lập, ghi khách đồng ý / không (khách không vào
// ứng dụng), mở QR PayOS hoặc tiền mặt (quản lý xác nhận). Việc có phí chỉ làm sau khi tiền được xác minh; báo giá được bảo hiểm
// hết thì đồng ý là làm được ngay. Làm xong, khách kiểm tra cùng thì kỹ thuật viên ghi khách đã xác nhận hoàn thành

function serviceError(error: unknown) {
  if (isApiError(error)) {
    if (error.code === 'AFTER_SALES_INVALID_STATE')
      return 'Trạng thái vừa đổi (khách có thể đã tự xác nhận, hoặc báo giá đã đóng). Trang đã tải lại.'
    if (error.code === 'PAYMENT_CASH_SELECTED')
      return 'Đã ghi trả tiền mặt. Bỏ chọn tiền mặt trước nếu khách muốn quét QR.'
    if (error.code === 'PAYMENT_CHECKOUT_IN_PROGRESS')
      return 'Đang có mã QR chờ khách quét. Huỷ mã QR trước nếu khách trả tiền mặt.'
  }
  return errorMessage(error)
}

function DeclineDialog({ quotationId, onClose }: { quotationId: string; onClose: () => void }) {
  const decide = useServiceQuotationDecisionMutation()
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const problem = onSiteNoteError(note, true)
    setNoteError(problem)
    if (problem) return
    try {
      await decide.mutateAsync({ quotationId, decision: 'DECLINED', note: note.trim() })
      toast.success('Đã ghi khách không đồng ý. Các hạng mục trong báo giá không làm.')
      onClose()
    } catch (e) {
      setError(serviceError(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(o) => !o && !decide.isPending && onClose()}
      dismissible={!decide.isPending}
      aria-label="Khách không đồng ý báo giá?"
    >
      <DialogTitle>Khách không đồng ý báo giá?</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Không tính tiền phần này; hạng mục được bảo hành (nếu có) vẫn làm bình thường.
      </p>
      <div className="mt-4">
        <Field label="Khách nói gì" htmlFor="service-decline-note" required error={noteError ?? undefined}>
          <Textarea
            id="service-decline-note"
            rows={3}
            maxLength={ON_SITE_NOTE_MAX}
            value={note}
            disabled={decide.isPending}
            aria-invalid={Boolean(noteError) || undefined}
            aria-describedby={fieldMessageId('service-decline-note')}
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
        <Button icon="close" variant="secondary" disabled={decide.isPending} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="block" variant="danger" disabled={decide.isPending} onClick={() => void submit()}>
          {decide.isPending ? 'Đang ghi…' : 'Ghi không đồng ý'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

function QuotationBlock({ quotationId }: { quotationId: string }) {
  const query = useServiceQuotationPaymentQuery(quotationId)
  const decide = useServiceQuotationDecisionMutation()
  const start = useStartServicePaymentMutation()
  const cancel = useCancelServicePaymentMutation()
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = decide.isPending || start.isPending || cancel.isPending
  const starting = start.isPending ? start.variables?.method : null
  const q = query.data
  const stage = serviceQuoteStage(q)

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null)
    try {
      await action()
      toast.success(done)
    } catch (e) {
      setError(serviceError(e))
    }
  }

  if (query.isPending) return <Skeleton className="h-24" />
  if (!q)
    return (
      <ErrorState
        title="Không tải được báo giá."
        message={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  const attempt = q.current
  const closed = stage === 'closed' ? quotationStatusMeta(q.quotationStatus) : null

  return (
    <section
      aria-label={`Báo giá bản ${q.version}`}
      className="space-y-3 border-t border-line pt-4 first:border-t-0 first:pt-0"
    >
      <p className="flex flex-wrap items-center gap-2 text-body">
        <span className="font-semibold text-fg">Báo giá bản {q.version}</span>
        <span className="tnum text-fg-2">khách trả {formatVnd(q.customerAmount)}</span>
        {stage === 'authorized' && (
          <Badge tone="ok">{q.nothingToPay ? 'Không phải trả, làm được' : 'Đã thanh toán, làm được'}</Badge>
        )}
        {stage === 'pay' && <Badge tone="info">Khách đã đồng ý, chưa thanh toán</Badge>}
        {closed && <Badge tone={closed.tone}>{closed.label}</Badge>}
        {stage === 'cash' && <Badge tone="info">Chờ quản lý xác nhận tiền mặt</Badge>}
        {stage === 'online' && attempt && (
          <Badge tone={paymentStatusMeta(attempt.status, attempt.method).tone}>
            {paymentStatusMeta(attempt.status, attempt.method).label}
          </Badge>
        )}
      </p>

      {stage === 'decide' && (
        <>
          <p className="text-body text-fg-2">
            Đưa báo giá cho khách xem trên máy này rồi ghi khách đồng ý hay không. Khách không cần vào ứng dụng.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              icon="check_circle"
              variant="primary"
              disabled={busy}
              onClick={() =>
                void run(
                  () => decide.mutateAsync({ quotationId, decision: 'AGREED', note: null }),
                  q.nothingToPay
                    ? 'Đã ghi khách đồng ý. Không phải trả tiền, làm được ngay.'
                    : 'Đã ghi khách đồng ý. Mở thanh toán cho khách.',
                )
              }
            >
              {decide.isPending ? 'Đang ghi…' : 'Khách đồng ý'}
            </Button>
            <Button icon="block" variant="danger" disabled={busy} onClick={() => setDeclining(true)}>
              Khách không đồng ý
            </Button>
          </div>
        </>
      )}

      {stage === 'pay' && (
        <div className="flex flex-wrap gap-3">
          <Button
            icon="qr_code_2"
            variant="primary"
            disabled={busy}
            onClick={() => void run(() => start.mutateAsync({ quotationId, method: 'ONLINE' }), 'Đã tạo mã QR.')}
          >
            {starting === 'ONLINE' ? 'Đang tạo…' : 'Hiện mã QR'}
          </Button>
          <Button
            icon="payments"
            variant="soft"
            disabled={busy}
            onClick={() =>
              void run(
                () => start.mutateAsync({ quotationId, method: 'CASH' }),
                'Đã ghi khách trả tiền mặt. Chờ quản lý xác nhận đã thu.',
              )
            }
          >
            {starting === 'CASH' ? 'Đang ghi…' : 'Khách trả tiền mặt'}
          </Button>
          <Button icon="block" variant="danger" disabled={busy} onClick={() => setDeclining(true)}>
            Khách đổi ý
          </Button>
        </div>
      )}

      {stage === 'online' && attempt && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-start">
          {attempt.qrCode ? (
            <PaymentQr
              value={attempt.qrCode}
              label={`Mã QR thanh toán ${formatVnd(attempt.amount)}`}
              className="w-full max-w-56 rounded-control border border-line"
            />
          ) : (
            <p className="text-body text-fg-2">PayOS chưa trả mã QR. Mở trang thanh toán bằng nút bên cạnh.</p>
          )}
          <div className="space-y-3 text-body text-fg-2">
            <p>
              Mã đơn <span className="tnum text-fg">{attempt.orderCode}</span>, hết hạn{' '}
              <span className="tnum text-fg">{formatMoment(attempt.expiresAt)}</span>. Tự cập nhật 5 giây một lần; việc
              có phí chỉ làm khi Smart Solar xác nhận đã nhận tiền.
            </p>
            <div className="flex flex-wrap gap-3">
              {isCheckoutUrl(attempt.checkoutUrl) && (
                <a href={attempt.checkoutUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('info')}>
                  <Icon name="open_in_new" className="-ml-0.5 text-[20px]" />
                  Mở trang thanh toán
                  <span className="sr-only"> (mở tab mới)</span>
                </a>
              )}
              <Button
                icon="refresh"
                variant="secondary"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                {query.isFetching ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
              </Button>
              <Button
                icon="cancel"
                variant="danger"
                disabled={busy}
                onClick={() => void run(() => cancel.mutateAsync(quotationId), 'Đã huỷ mã QR.')}
              >
                {cancel.isPending ? 'Đang huỷ…' : 'Huỷ mã QR'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {stage === 'cash' && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-body text-fg-2">Nộp tiền và phiếu thu cho quản lý; bạn không tự xác nhận được.</p>
          <Button
            icon="undo"
            variant="warn"
            disabled={busy}
            onClick={() => void run(() => cancel.mutateAsync(quotationId), 'Đã bỏ chọn tiền mặt.')}
          >
            {cancel.isPending ? 'Đang bỏ chọn…' : 'Bỏ chọn tiền mặt'}
          </Button>
        </div>
      )}

      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      {declining && <DeclineDialog quotationId={quotationId} onClose={() => setDeclining(false)} />}
    </section>
  )
}

/** Các báo giá của buổi hẹn (theo mã báo giá trên hạng mục); báo giá đã đóng chỉ còn một dòng trạng thái */
export function ServiceQuotationsOnSite({ visit }: { visit: TechnicianVisitView }) {
  const ids = visitQuotationIds(visit)
  if (ids.length === 0) return null
  return (
    <Panel id="service-quotation" className="scroll-mt-6">
      <PanelHeader title="Báo giá tại công trình" />
      <PanelBody className="space-y-4">
        {ids.map((id) => (
          <QuotationBlock key={id} quotationId={id} />
        ))}
      </PanelBody>
    </Panel>
  )
}

/** Khách kiểm tra kết quả cùng kỹ thuật viên: ghi chú bắt buộc, ảnh biên bản / kết quả không bắt buộc (≤ 10) */
export function CompletionConfirmation({ visit }: { visit: TechnicianVisitView }) {
  const confirm = useConfirmCompletionOnSiteMutation()
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<'done' | 'closed' | null>(null)
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [noteError, setNoteError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!canConfirmCompletionOnSite(visit)) return null
  const state = outcome ?? (confirmedOnSite(visit) ? 'done' : null)

  function pick(list: File[]) {
    const all = [...files, ...list].slice(0, COMPLETION_PHOTOS_MAX)
    const bad = all.map((f) => fileProblem(f, 'SERVICE_EVIDENCE')).find(Boolean)
    setError(bad ?? null)
    setFiles(all.filter((f) => !fileProblem(f, 'SERVICE_EVIDENCE')))
  }

  async function submit() {
    setError(null)
    const problem = onSiteNoteError(note, true)
    setNoteError(problem)
    if (problem) return
    try {
      await confirm.mutateAsync({ requestId: visit.requestId, note: note.trim(), files })
      toast.success('Đã ghi khách xác nhận hoàn thành. Yêu cầu đã đóng.')
      setOutcome('done')
      setOpen(false)
    } catch (e) {
      // View buổi hẹn không có trạng thái yêu cầu: chỉ biết yêu cầu đã thôi chờ xác nhận khi backend từ chối
      if (isApiError(e) && e.code === 'AFTER_SALES_INVALID_STATE') {
        setOutcome('closed')
        setOpen(false)
        return
      }
      setError(serviceError(e))
    }
  }

  return (
    <Panel id="completion-confirmation" className="scroll-mt-6">
      <PanelHeader title="Khách xác nhận hoàn thành" />
      <PanelBody className="space-y-3">
        {state === 'done' ? (
          <Notice tone="ok" title="Đã ghi khách xác nhận">
            Yêu cầu đã hoàn thành; khách xem kết quả trong ứng dụng.
          </Notice>
        ) : state === 'closed' ? (
          <Notice tone="info">
            Yêu cầu không còn chờ khách xác nhận: đã ghi trước đó, khách đã tự nghiệm thu trong ứng dụng hoặc đã báo
            chưa đạt.
          </Notice>
        ) : (
          <>
            <p className="text-body text-fg-2">
              Cùng khách kiểm tra kết quả. Khách đồng ý thì ghi lại ở đây; khách chưa đồng ý thì không ghi, quản lý sẽ
              liên hệ.
            </p>
            <Button icon="task_alt" variant="soft" onClick={() => setOpen(true)}>
              Ghi khách xác nhận
            </Button>
          </>
        )}
      </PanelBody>
      {open && (
        <ModalDialog
          open
          onOpenChange={(o) => !o && !confirm.isPending && setOpen(false)}
          dismissible={!confirm.isPending}
          aria-label="Ghi khách xác nhận hoàn thành"
        >
          <DialogTitle>Ghi khách xác nhận hoàn thành?</DialogTitle>
          <p className="mt-2 text-body text-fg-2">
            Yêu cầu {visit.requestNumber} chuyển sang hoàn thành; lượt bảo trì / hỗ trợ của gói (nếu có) được tính là đã
            dùng.
          </p>
          <div className="mt-4 space-y-4">
            <Field label="Khách đã kiểm tra gì" htmlFor="completion-note" required error={noteError ?? undefined}>
              <Textarea
                id="completion-note"
                rows={3}
                maxLength={ON_SITE_NOTE_MAX}
                value={note}
                disabled={confirm.isPending}
                aria-invalid={Boolean(noteError) || undefined}
                aria-describedby={fieldMessageId('completion-note')}
                placeholder="Ví dụ: Khách cùng kiểm tra inverter chạy lại bình thường, ký biên bản."
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <Field label="Ảnh biên bản, kết quả" htmlFor="completion-photos" optional>
              <div className="flex flex-wrap items-center gap-3">
                <FileButton
                  size="sm"
                  icon="add_a_photo"
                  multiple
                  accept={acceptFor('SERVICE_EVIDENCE')}
                  disabled={confirm.isPending || files.length >= COMPLETION_PHOTOS_MAX}
                  onFiles={pick}
                >
                  Thêm ảnh
                </FileButton>
                {files.length > 0 && (
                  <span className="text-body text-fg-2">
                    {files.length} ảnh
                    <Button
                      size="sm"
                      variant="ghost"
                      bleed={false}
                      icon="close"
                      className="ml-2"
                      disabled={confirm.isPending}
                      onClick={() => setFiles([])}
                    >
                      Bỏ ảnh
                    </Button>
                  </span>
                )}
              </div>
            </Field>
          </div>
          {error && (
            <div role="alert" className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <DialogFooter>
            <Button icon="close" variant="secondary" disabled={confirm.isPending} onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button icon="task_alt" variant="primary" disabled={confirm.isPending} onClick={() => void submit()}>
              {confirm.isPending ? 'Đang ghi…' : 'Ghi xác nhận'}
            </Button>
          </DialogFooter>
        </ModalDialog>
      )}
    </Panel>
  )
}
