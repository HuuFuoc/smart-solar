import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DocumentPreviewButtons } from '@/components/common/ui/document-preview'
import { DateField, Field, Input, Textarea, TimeSelect, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice, Progress } from '@/components/common/ui/lists'
import { formatVnd } from '@/features/after-sales/serviceDisplay'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { formatFileSize } from '@/features/installations/installationDisplay'
import {
  RECEIPT_NOTE_MAX,
  RECEIPT_NUMBER_MAX,
  cashReceiptBody,
  earlierReceipts,
  nowVn,
  receiptFormErrors,
  receiptStatusMeta,
  receiptStep,
  type ReceiptForm,
  type ReceiptFormErrors,
} from '@/features/payments/cashReceiptRules'
import { formatMoment, todayVn, vnDate } from '@/features/scheduling/schedulingDisplay'
import { useFileUpload } from '@/hooks/useFiles'
import { useSubmitServiceCashReceiptMutation } from '@/hooks/useTechnicianAfterSales'
import { errorMessage, isApiError, messageForCode } from '@/services/api/errors'
import { getCashReceiptEvidenceUrl } from '@/services/technicianAfterSalesService'
import type { CashReceiptView } from '@/types/res/cashReceiptsRes'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type { ServiceQuotationPaymentView } from '@/types/res/technicianAfterSalesRes'

// Khách trả tiền mặt báo giá hậu mãi: kỹ thuật viên nhận tiền, viết phiếu thu giấy, chụp rồi gửi cho quản lý duyệt. Gửi phiếu chưa
// phải đã trả: việc có phí chỉ làm khi quản lý duyệt. Bị yêu cầu bổ sung thì gửi lại cho cùng lần thu, không thu tiền lần hai.
// Ảnh tải lên một lần; gửi lỗi thì lần sau chỉ gửi lại, trừ khi ảnh bị từ chối

const PURPOSE = 'PAYMENT_EVIDENCE'

/** Câu lỗi gửi phiếu, kèm ô bị lỗi và có phải tải lại ảnh không */
function submitProblem(e: unknown): { field: keyof ReceiptFormErrors | null; message: string; dropUpload: boolean } {
  if (isApiError(e)) {
    const code = e.code ?? ''
    if (code.startsWith('FILE_') || code === 'PAYMENT_CASH_RECEIPT_EVIDENCE_REUSED')
      return { field: 'photo', message: messageForCode(code) ?? 'Ảnh này chưa dùng được. Chụp lại.', dropUpload: true }
    if (code === 'PAYMENT_CASH_RECEIPT_DUPLICATE')
      return { field: 'receiptNumber', message: 'Số phiếu này đã dùng cho lần thanh toán khác.', dropUpload: false }
    if (code === 'VALIDATION_FAILED') {
      const f = e.fieldErrors
      if (f.evidenceFileId) return { field: 'photo', message: 'Ảnh chưa dùng được. Chụp lại.', dropUpload: true }
      if (f.receiptNumber)
        return { field: 'receiptNumber', message: 'Số phiếu thu từ 1 đến 100 ký tự.', dropUpload: false }
      if (f.collectedAt)
        return {
          field: 'collectedAt',
          message: 'Giờ thu phải sau lúc khách chọn tiền mặt và không ở tương lai.',
          dropUpload: false,
        }
      if (f.note) return { field: 'note', message: `Tối đa ${RECEIPT_NOTE_MAX} ký tự.`, dropUpload: false }
    }
  }
  return { field: null, message: errorMessage(e), dropUpload: false }
}

function CashReceiptForm({
  quotationId,
  attempt,
  rejected,
  actions,
  onSent,
}: {
  quotationId: string
  attempt: PaymentAttemptView
  /** Gửi lại sau khi bị yêu cầu bổ sung: dùng lại số phiếu và giờ thu của phiếu cũ */
  rejected: CashReceiptView | null
  /** Nút cạnh nút gửi; khoá khi đang tải ảnh / gửi để không bỏ ngang giữa chừng */
  actions: (busy: boolean) => ReactNode
  onSent: () => void
}) {
  const send = useSubmitServiceCashReceiptMutation()
  const upload = useFileUpload(PURPOSE)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const [form, setForm] = useState<ReceiptForm>(() => ({
    hasPhoto: false,
    receiptNumber: rejected?.receiptNumber ?? '',
    ...nowVn(rejected ? new Date(rejected.collectedAt) : undefined),
    timeTouched: false,
    keptAt: rejected?.collectedAt ?? null,
    note: '',
  }))
  const [errors, setErrors] = useState<ReceiptFormErrors>({})
  const [error, setError] = useState<string | null>(null)
  const busy = upload.uploading || send.isPending
  const uploadPercent = upload.progress === null ? null : Math.round(upload.progress * 100)
  const cashChosenAt = attempt.createdAt

  // Link xem trước chỉ sống trong trang này
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  function pick(files: File[]) {
    const chosen = files[0]
    if (!chosen) return
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = chosen.type.startsWith('image/') ? URL.createObjectURL(chosen) : null
    setPreview(previewRef.current)
    setFile(chosen)
    setUploadedId(null)
    setForm((f) => ({ ...f, hasPhoto: true }))
    setErrors((e) => ({ ...e, photo: fileProblem(chosen, PURPOSE) ?? undefined }))
    setError(null)
  }

  const set = (patch: Partial<ReceiptForm>) => setForm((f) => ({ ...f, ...patch }))

  async function submit() {
    setError(null)
    const next = receiptFormErrors(form, cashChosenAt)
    const photoProblem = file ? fileProblem(file, PURPOSE) : null
    if (photoProblem) next.photo = photoProblem
    setErrors(next)
    if (Object.keys(next).length > 0 || !file) return
    let fileId = uploadedId
    try {
      if (!fileId) {
        fileId = (await upload.upload(file)).fileId
        setUploadedId(fileId)
      }
    } catch (e) {
      return setErrors((prev) => ({ ...prev, photo: `Chưa tải được ảnh lên: ${errorMessage(e)}` }))
    }
    try {
      await send.mutateAsync({
        quotationId,
        body: cashReceiptBody(form, attempt.paymentAttemptId, fileId, cashChosenAt),
      })
      toast.success('Đã gửi phiếu thu. Chờ quản lý duyệt.')
      onSent()
    } catch (e) {
      const problem = submitProblem(e)
      if (problem.dropUpload) setUploadedId(null)
      if (problem.field) setErrors((prev) => ({ ...prev, [problem.field!]: problem.message }))
      else setError(problem.message)
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2" aria-label="Ảnh phiếu thu">
        <p className="text-body font-medium text-fg">
          Ảnh phiếu thu
          <span aria-hidden className="text-danger">
            {' *'}
          </span>
        </p>
        {file &&
          (preview ? (
            <img
              src={preview}
              alt="Ảnh phiếu thu vừa chụp"
              className="max-h-72 w-auto max-w-full rounded-control border border-line object-contain"
            />
          ) : (
            <p className="flex items-center gap-2 text-body text-fg">
              <Icon name="picture_as_pdf" className="shrink-0 text-[20px] text-fg-2" />
              <span className="min-w-0 break-all">{file.name}</span>
              <span className="tnum shrink-0 text-fg-2">{formatFileSize(file.size)}</span>
            </p>
          ))}
        <div className="flex flex-wrap gap-3">
          <FileButton
            icon="photo_camera"
            variant={file ? 'secondary' : 'primary'}
            accept="image/*"
            capture="environment"
            disabled={busy}
            onFiles={pick}
          >
            {file ? 'Chụp lại' : 'Chụp phiếu thu'}
          </FileButton>
          <FileButton icon="upload_file" variant="secondary" accept={acceptFor(PURPOSE)} disabled={busy} onFiles={pick}>
            {file ? 'Chọn tệp khác' : 'Chọn ảnh hoặc PDF'}
          </FileButton>
        </div>
        {uploadPercent !== null && <Progress value={uploadPercent} label="Đang tải ảnh phiếu thu lên" />}
        {errors.photo ? (
          <p className="text-meta text-danger" role="alert">
            {errors.photo}
          </p>
        ) : (
          <p className="text-meta text-fg-3">
            {fileTypesText(PURPOSE)}, tối đa {maxSizeText(PURPOSE)}.
          </p>
        )}
      </section>

      <Field label="Số phiếu thu" htmlFor={`receipt-number-${quotationId}`} required error={errors.receiptNumber}>
        <Input
          id={`receipt-number-${quotationId}`}
          maxLength={RECEIPT_NUMBER_MAX}
          autoComplete="off"
          aria-required
          aria-invalid={Boolean(errors.receiptNumber) || undefined}
          aria-describedby={fieldMessageId(`receipt-number-${quotationId}`)}
          value={form.receiptNumber}
          disabled={busy}
          onChange={(e) => set({ receiptNumber: e.target.value })}
        />
      </Field>

      <Field label="Thời điểm thu" htmlFor={`receipt-date-${quotationId}`} optional error={errors.collectedAt}>
        <div className="flex flex-wrap gap-3">
          <DateField
            id={`receipt-date-${quotationId}`}
            className="w-44"
            value={form.date}
            min={vnDate(cashChosenAt)}
            max={todayVn()}
            disabled={busy}
            aria-describedby={fieldMessageId(`receipt-date-${quotationId}`)}
            onChange={(date) => set({ date, timeTouched: true })}
          />
          <TimeSelect
            aria-label="Giờ thu"
            className="w-28"
            step={5}
            value={form.time}
            disabled={busy}
            onChange={(time) => set({ time, timeTouched: true })}
          />
        </div>
      </Field>

      <Field label="Ghi chú" htmlFor={`receipt-note-${quotationId}`} optional error={errors.note}>
        <Textarea
          id={`receipt-note-${quotationId}`}
          rows={2}
          maxLength={RECEIPT_NOTE_MAX}
          aria-describedby={fieldMessageId(`receipt-note-${quotationId}`)}
          value={form.note}
          disabled={busy}
          onChange={(e) => set({ note: e.target.value })}
        />
      </Field>

      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button icon="send" variant="primary" disabled={busy} onClick={() => void submit()}>
          {uploadPercent !== null
            ? `Đang tải ảnh ${uploadPercent}%`
            : send.isPending
              ? 'Đang gửi…'
              : 'Gửi phiếu thu cho quản lý'}
        </Button>
        {actions(busy)}
      </div>
    </div>
  )
}

function ReceiptPhoto({ quotationId, receipt }: { quotationId: string; receipt: CashReceiptView }) {
  return (
    <DocumentPreviewButtons
      name={`Phiếu thu ${receipt.receiptNumber}`}
      request={(disposition) => getCashReceiptEvidenceUrl(quotationId, receipt.cashReceiptId, disposition)}
    />
  )
}

/** Phiếu đã gửi trước phiếu đang hiện (bị yêu cầu bổ sung): số phiếu, lúc thu, lý do, ảnh */
function ReceiptHistory({ quotationId, receipts }: { quotationId: string; receipts: CashReceiptView[] }) {
  if (receipts.length === 0) return null
  return (
    <section aria-label="Phiếu đã gửi trước" className="space-y-2">
      <p className="text-body font-medium text-fg">Phiếu đã gửi trước</p>
      <ul className="divide-y divide-line">
        {receipts.map((r) => {
          const meta = receiptStatusMeta(r.status, 'technician')
          return (
            <li key={r.cashReceiptId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
              <div className="min-w-0 text-body">
                <p className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium text-fg">{r.receiptNumber}</span>
                  <Badge tone={r.status === 'REJECTED' ? 'neutral' : meta.tone}>
                    {r.status === 'REJECTED' ? 'Đã bị trả lại' : meta.label}
                  </Badge>
                </p>
                <p className="tnum text-meta text-fg-2">Thu lúc {formatMoment(r.collectedAt)}</p>
                {r.reviewReason && <p className="text-meta text-fg-2">{r.reviewReason}</p>}
              </div>
              <ReceiptPhoto quotationId={quotationId} receipt={r} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * Bước tiền mặt của một báo giá: chưa gửi phiếu thì chụp và gửi; đang chờ duyệt thì chỉ xem (không bỏ chọn tiền mặt được);
 * bị yêu cầu bổ sung thì xem lý do rồi gửi lại, không thu thêm. `cancelAction`: nút bỏ chọn tiền mặt (backend chặn khi có phiếu
 * chờ duyệt nên không hiện lúc đó), nhận `busy` để khoá khi đang gửi phiếu
 */
export function ServiceCashReceipt({
  quotationId,
  view,
  cancelAction,
}: {
  quotationId: string
  view: ServiceQuotationPaymentView
  cancelAction: (busy: boolean) => ReactNode
}) {
  const [resending, setResending] = useState(false)
  const attempt = view.current
  if (!attempt) return null
  const receipt = view.currentCashReceipt ?? null
  const step = receiptStep(receipt)
  const earlier = earlierReceipts(view.cashReceipts, receipt)

  return (
    <div className="space-y-4">
      {step === 'capture' && (
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-body text-fg-2">Cần thu</span>
          <span className="tnum text-figure font-semibold text-fg">{formatVnd(attempt.amount)}</span>
        </p>
      )}

      {step === 'review' && receipt && (
        <div className="space-y-3">
          <p className="text-body text-fg-2">
            Phiếu <span className="font-medium text-fg">{receipt.receiptNumber}</span>, thu{' '}
            <span className="tnum text-fg">{formatVnd(receipt.amount)}</span> lúc{' '}
            <span className="tnum text-fg">{formatMoment(receipt.collectedAt)}</span>. Việc có phí làm sau khi quản lý
            duyệt.
          </p>
          <ReceiptPhoto quotationId={quotationId} receipt={receipt} />
        </div>
      )}

      {step === 'rejected' && receipt && !resending && (
        <div className="space-y-3">
          <Notice tone="danger" title={`Quản lý yêu cầu bổ sung phiếu ${receipt.receiptNumber}`}>
            {receipt.reviewReason}
          </Notice>
          <div className="flex flex-wrap gap-3">
            <Button icon="photo_camera" variant="primary" onClick={() => setResending(true)}>
              Gửi lại phiếu thu
            </Button>
            {cancelAction(false)}
          </div>
        </div>
      )}

      {(step === 'capture' || (step === 'rejected' && resending)) && (
        <CashReceiptForm
          quotationId={quotationId}
          attempt={attempt}
          rejected={step === 'rejected' ? receipt : null}
          actions={(busy) =>
            step === 'rejected' ? (
              <Button icon="close" variant="secondary" disabled={busy} onClick={() => setResending(false)}>
                Thôi
              </Button>
            ) : (
              cancelAction(busy)
            )
          }
          onSent={() => setResending(false)}
        />
      )}

      <ReceiptHistory quotationId={quotationId} receipts={earlier} />
    </div>
  )
}
