import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Input, Textarea, TimeSelect, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice, Progress } from '@/components/common/ui/lists'
import { submitErrorText, uploadErrorText, uploadRejectsFile } from '@/features/cash-receipts/cashReceiptDisplay'
import {
  collectedAtValue,
  currentReceipt,
  EVIDENCE_ACCEPT,
  evidenceKind,
  evidenceProblem,
  RECEIPT_NOTE_MAX,
  RECEIPT_NUMBER_MAX,
  receiptFormErrors,
  submitFailure,
  type ReceiptErrors,
} from '@/features/cash-receipts/cashReceiptRules'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { formatVnd, installmentName } from '@/features/payment-plan/paymentPlanDisplay'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment, todayVn } from '@/features/scheduling/schedulingDisplay'
import { useSubmitCashReceiptMutation } from '@/hooks/useCashReceipts'
import { useFileUpload } from '@/hooks/useFiles'
import { useRetryCountdown } from '@/hooks/useRetryCountdown'
import { isApiError } from '@/services/api/errors'
import type { InstallmentTarget } from '@/services/installmentService'
import type { InstallmentPaymentView } from '@/types/res/paymentPlanRes'

// Kỹ thuật viên chụp phiếu thu giấy sau khi nhận tiền mặt tại công trình, ghi số phiếu rồi gửi quản lý. Trên điện thoại "Chụp phiếu
// thu" mở thẳng camera sau; "Chọn ảnh hoặc PDF" mở thư viện / tệp. Ảnh kiểm loại và cỡ trên máy trước khi tải lên kho
// (PAYMENT_EVIDENCE, không gửi token của hệ thống lên kho), chỉ gửi phiếu khi tệp đã VERIFIED. Tải lên được mà gửi lỗi thì lần sau
// chỉ gửi lại, không tải lại. Lỗi mạng giữa chừng thì đọc lại khoản trước khi cho gửi lại để không gửi hai lần. Không báo "đã trả":
// khoản chỉ thành đã trả khi quản lý xác nhận

const PURPOSE = 'PAYMENT_EVIDENCE'

/** Bước đang chạy để nút gửi ghi đúng việc và chặn bấm hai lần */
type Phase = 'idle' | 'uploading' | 'submitting' | 'checking'

export function CashReceiptCaptureDialog({
  view,
  target,
  reload,
  onClose,
}: {
  /** Khoản mới nhất (đổi theo mỗi lần đọc lại): mã lần trả tiền mặt luôn lấy từ đây lúc gửi */
  view: InstallmentPaymentView
  target: InstallmentTarget
  /** Đọc lại khoản từ backend, trả bản mới */
  reload: () => Promise<InstallmentPaymentView | undefined>
  onClose: () => void
}) {
  const rejected = currentReceipt(view)?.status === 'REJECTED' ? currentReceipt(view) : null
  const submit = useSubmitCashReceiptMutation()
  const upload = useFileUpload(PURPOSE)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  // Tệp đã VERIFIED của đúng `file`: gửi lỗi thì lần sau không tải lại
  const [fileId, setFileId] = useState<string | null>(null)
  const [receiptNumber, setReceiptNumber] = useState(rejected?.receiptNumber ?? '')
  const [collectedDate, setCollectedDate] = useState('')
  const [collectedTime, setCollectedTime] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<ReceiptErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const inFlight = useRef(false)
  const countdown = useRetryCountdown(() => setError(null))
  const busy = phase !== 'idle'
  const waiting = countdown.secondsLeft > 0
  const uploadPercent = upload.progress === null ? null : Math.round(upload.progress * 100)
  const today = todayVn()
  const cashChosenAt = view.current?.createdAt ?? null

  // Ảnh xem trước dùng object URL của tệp trên máy; đổi tệp hay đóng hộp thì trả lại bộ nhớ
  const previewUrl = useRef<string | null>(null)
  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    },
    [],
  )
  function choose(next: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = next ? URL.createObjectURL(next) : null
    setFile(next)
    setPreview(previewUrl.current)
    setFileId(null)
  }

  // Đang tải / gửi mà tải lại trang thì trình duyệt hỏi lại: rời trang lúc này chưa biết phiếu đã tới chưa
  useEffect(() => {
    if (!busy) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  function pick(files: File[]) {
    const next = files[0]
    if (!next) return
    const problem = evidenceProblem(next)
    setError(null)
    setErrors((e) => ({ ...e, evidence: problem ?? undefined }))
    if (problem) return
    choose(next)
  }

  async function check(): Promise<boolean> {
    setPhase('checking')
    try {
      const fresh = await reload()
      const receipt = currentReceipt(fresh)
      // Lần gửi trước đã tới backend (vd. mất mạng lúc nhận trả lời): không gửi lần hai
      if (receipt?.status === 'SUBMITTED' && receipt.receiptNumber === receiptNumber.trim()) {
        toast.success('Đã gửi phiếu thu. Chờ quản lý xác nhận.')
        onClose()
        return true
      }
    } catch {
      // Đọc lại cũng lỗi: giữ câu báo, người dùng tự thử lại
    }
    return false
  }

  async function send() {
    if (inFlight.current || busy || waiting) return
    setError(null)
    const form = { receiptNumber, note, collectedDate, collectedTime, hasEvidence: Boolean(file) }
    const found = receiptFormErrors(form, { now: Date.now(), today, cashChosenAt })
    setErrors(found)
    if (Object.keys(found).length > 0 || !file) return
    const attemptId = view.current?.paymentAttemptId
    if (!attemptId) {
      setError('Khoản này không còn chờ tiền mặt. Đã tải lại.')
      void reload()
      return
    }
    inFlight.current = true
    try {
      let evidenceFileId = fileId
      if (!evidenceFileId) {
        setPhase('uploading')
        try {
          evidenceFileId = (await upload.upload(file)).fileId
          setFileId(evidenceFileId)
        } catch (e) {
          if (isApiError(e) && e.status === 429) countdown.start(e.retryAfter ?? 60)
          if (uploadRejectsFile(e)) {
            choose(null)
            setErrors({ evidence: uploadErrorText(e) })
          } else setError(uploadErrorText(e))
          return
        }
      }
      setPhase('submitting')
      try {
        await submit.mutateAsync({
          target,
          body: {
            paymentAttemptId: attemptId,
            receiptNumber: receiptNumber.trim(),
            evidenceFileId,
            collectedAt: collectedAtValue(form, today),
            note: note.trim() || null,
          },
        })
        toast.success(
          rejected ? 'Đã gửi lại phiếu thu. Chờ quản lý xác nhận.' : 'Đã gửi phiếu thu. Chờ quản lý xác nhận.',
        )
        onClose()
      } catch (e) {
        const failure = submitFailure(e)
        const text = submitErrorText(e, failure)
        switch (failure.action) {
          case 'fields':
            setErrors(failure.fields)
            setError(text)
            break
          case 'replace-evidence':
            choose(null)
            setErrors({ evidence: text })
            break
          case 'reupload':
            setFileId(null)
            setError(text)
            break
          case 'reload-retry':
            setError(text)
            await reload().catch(() => undefined)
            break
          case 'reload-close':
            await reload().catch(() => undefined)
            toast.info(text)
            onClose()
            break
          case 'ambiguous':
            setError(text)
            await check()
            break
          case 'rate-limited':
            countdown.start(failure.seconds)
            setError(text)
            break
          default:
            setError(text)
        }
      }
    } finally {
      inFlight.current = false
      setPhase('idle')
    }
  }

  const label =
    phase === 'uploading'
      ? `Đang tải ảnh ${uploadPercent ?? 0}%`
      : phase === 'submitting'
        ? 'Đang gửi phiếu thu…'
        : phase === 'checking'
          ? 'Đang kiểm tra…'
          : waiting
            ? `Thử lại sau ${countdown.secondsLeft} giây`
            : rejected
              ? 'Gửi lại phiếu thu'
              : 'Gửi phiếu thu cho quản lý'

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto"
      aria-label={rejected ? 'Gửi lại phiếu thu' : 'Chụp phiếu thu'}
    >
      <DialogTitle>{rejected ? 'Gửi lại phiếu thu' : 'Chụp phiếu thu'}</DialogTitle>
      <Facts
        className="mt-3"
        items={[
          { k: 'Hợp đồng', v: view.contractNumber },
          { k: 'Khoản thu', v: installmentName(view) },
          { k: 'Số tiền đã thu', v: <span className="font-semibold">{formatVnd(view.amount)}</span> },
        ]}
      />

      <div className="mt-4 space-y-4">
        {rejected?.reviewReason && (
          <Notice tone="danger" title="Quản lý yêu cầu bổ sung">
            {rejected.reviewReason}
          </Notice>
        )}
        <Notice tone="info">Khoản thanh toán chỉ được ghi nhận sau khi quản lý xác nhận phiếu thu.</Notice>

        <section aria-labelledby="receipt-photo" className="space-y-3">
          <h3 id="receipt-photo" className="text-body font-medium text-fg">
            Ảnh phiếu thu
            <span aria-hidden className="text-fg-2">
              {' *'}
            </span>
          </h3>
          {file && preview ? (
            evidenceKind(file) === 'image' ? (
              <img
                src={preview}
                alt="Ảnh phiếu thu vừa chụp"
                className="max-h-80 w-full rounded-container border border-line bg-surface-2 object-contain"
              />
            ) : (
              <div className="space-y-2">
                <iframe
                  src={preview}
                  title="PDF phiếu thu vừa chọn"
                  className="hidden h-72 w-full rounded-container border border-line bg-panel sm:block"
                />
                <a href={preview} target="_blank" rel="noopener noreferrer" className="ui-link text-body">
                  Mở xem PDF
                </a>
              </div>
            )
          ) : null}
          {file && (
            <p className="text-meta text-fg-2">
              <span className="break-all">{file.name}</span>
              <span className="tnum">, {formatFileSize(file.size)}</span>
              {fileId && ', đã tải lên'}
            </p>
          )}
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <FileButton
              accept="image/*"
              capture="environment"
              icon="photo_camera"
              variant="soft"
              disabled={busy}
              onFiles={pick}
            >
              {file ? 'Chụp lại' : 'Chụp phiếu thu'}
            </FileButton>
            <FileButton accept={EVIDENCE_ACCEPT} icon="upload_file" variant="secondary" disabled={busy} onFiles={pick}>
              {file ? 'Chọn tệp khác' : 'Chọn ảnh hoặc PDF'}
            </FileButton>
          </div>
          {uploadPercent !== null && <Progress value={uploadPercent} label="Đang tải ảnh phiếu thu lên" />}
          {errors.evidence ? (
            <p className="text-meta text-danger" role="alert">
              {errors.evidence}
            </p>
          ) : (
            <p className="text-meta text-fg-3">JPEG, PNG, WebP hoặc PDF, tối đa 15 MB.</p>
          )}
        </section>

        <Field label="Số phiếu thu" htmlFor="receipt-number" required error={errors.receiptNumber}>
          <Input
            id="receipt-number"
            autoComplete="off"
            maxLength={RECEIPT_NUMBER_MAX}
            aria-required
            aria-invalid={Boolean(errors.receiptNumber) || undefined}
            aria-describedby={fieldMessageId('receipt-number')}
            value={receiptNumber}
            disabled={busy}
            onChange={(e) => setReceiptNumber(e.target.value)}
          />
        </Field>

        <Field
          label="Thời điểm thu tiền"
          htmlFor="receipt-date"
          optional
          error={errors.collectedAt}
          hint={
            cashChosenAt
              ? `Bỏ trống thì ghi giờ gửi. Chọn tiền mặt lúc ${formatMoment(cashChosenAt)}.`
              : 'Bỏ trống thì ghi giờ gửi.'
          }
        >
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-3">
            <DateField
              id="receipt-date"
              label="Ngày thu tiền"
              value={collectedDate}
              max={today}
              disabled={busy}
              aria-describedby={fieldMessageId('receipt-date')}
              onChange={setCollectedDate}
            />
            <TimeSelect
              aria-label="Giờ thu tiền"
              value={collectedTime}
              step={5}
              to="23:55"
              emptyLabel="Lúc gửi"
              disabled={busy}
              onChange={setCollectedTime}
            />
          </div>
        </Field>

        <Field label="Ghi chú" htmlFor="receipt-note" optional error={errors.note}>
          <Textarea
            id="receipt-note"
            rows={2}
            maxLength={RECEIPT_NOTE_MAX}
            aria-describedby={fieldMessageId('receipt-note')}
            value={note}
            disabled={busy}
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
        <Button icon="send" variant="primary" disabled={busy || waiting} onClick={() => void send()}>
          {label}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
