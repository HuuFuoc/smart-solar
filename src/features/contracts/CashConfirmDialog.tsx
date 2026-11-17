import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Progress } from '@/components/common/ui/lists'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { contractErrorMessage, contractTitle } from '@/features/contracts/contractDisplay'
import {
  CASH_NOTE_MAX,
  CASH_RECEIPT_MAX,
  cashConfirmBody,
  cashConfirmErrors,
  type CashForm,
} from '@/features/contracts/contractRules'
import { useConfirmCashPaymentMutation } from '@/hooks/useContracts'
import { useFileUpload } from '@/hooks/useFiles'
import type { ContractView } from '@/types/res/customerContractsRes'
import { formatMoney } from '@/utils/format'
import { readGroupedNumber } from '@/utils/number'

// Quản lý / quản trị ghi nhận khách đã trả tiền mặt. Số tiền điền sẵn tổng hợp đồng nhưng người xác nhận phải tự kiểm lại;
// tải ảnh / PDF phiếu thu (PAYMENT_EVIDENCE) do chính người xác nhận tải lên, xong mới gửi. Tải lên được mà gửi lỗi thì lần sau
// chỉ gửi lại, không tải lại. Không cập nhật lạc quan: hợp đồng chỉ thành đã thanh toán khi backend trả về

const PURPOSE = 'PAYMENT_EVIDENCE'

export function CashConfirmDialog({ contract, onClose }: { contract: ContractView; onClose: () => void }) {
  const confirm = useConfirmCashPaymentMutation()
  const upload = useFileUpload(PURPOSE)
  const [amountText, setAmountText] = useState(new Intl.NumberFormat('vi-VN').format(contract.totalAmount))
  const [receipt, setReceipt] = useState('')
  const [note, setNote] = useState('')
  const [chosen, setChosen] = useState<File | null>(null)
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof CashForm, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const busy = upload.uploading || confirm.isPending
  const uploadPercent = upload.progress === null ? null : Math.round(upload.progress * 100)
  const amount = amountText.trim() ? readGroupedNumber(amountText) : null

  function pick(files: File[]) {
    const file = files[0]!
    setChosen(file)
    setUploadedId(null)
    setFileError(fileProblem(file, PURPOSE))
    setError(null)
  }

  async function submit() {
    setError(null)
    // Tệp được tính là có khi đã chọn hợp lệ; mã tệp chỉ có sau khi tải lên
    const form: CashForm = { amount, receiptReference: receipt, evidenceFileId: chosen ? 'chosen' : null, note }
    const next = cashConfirmErrors(form, contract.totalAmount)
    setErrors(next)
    if (Object.keys(next).length > 0 || fileError || !chosen) return
    let fileId = uploadedId
    try {
      if (!fileId) {
        fileId = (await upload.upload(chosen)).fileId
        setUploadedId(fileId)
      }
    } catch (e) {
      return setError(`Chưa tải được phiếu thu lên: ${contractErrorMessage(e)}`)
    }
    try {
      await confirm.mutateAsync({
        contractId: contract.contractId,
        body: cashConfirmBody({ ...form, evidenceFileId: fileId }),
      })
      toast.success('Đã ghi nhận khách trả tiền mặt. Hợp đồng đã thanh toán.')
      onClose()
    } catch (e) {
      setError(contractErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-xl"
      aria-label="Xác nhận đã nhận tiền mặt"
    >
      <DialogTitle>Xác nhận đã nhận tiền mặt</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        {contractTitle(contract)}, tổng {formatMoney(contract.totalAmount, contract.currency)}. Chỉ xác nhận khi đã nhận
        đủ tiền và có phiếu thu; xác nhận xong không đổi lại được.
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Số tiền đã nhận (VND)"
          htmlFor="cash-amount"
          required
          error={errors.amount}
          hint="Đúng bằng tổng hợp đồng; không ghi nhận trả thiếu hay trả dư."
        >
          <Input
            id="cash-amount"
            inputMode="numeric"
            className="tnum"
            aria-required
            aria-invalid={Boolean(errors.amount) || undefined}
            aria-describedby={fieldMessageId('cash-amount')}
            value={amountText}
            disabled={busy}
            onChange={(e) => setAmountText(e.target.value)}
          />
        </Field>
        <Field label="Số phiếu thu" htmlFor="cash-receipt" required error={errors.receiptReference}>
          <Input
            id="cash-receipt"
            maxLength={CASH_RECEIPT_MAX}
            aria-required
            aria-invalid={Boolean(errors.receiptReference) || undefined}
            aria-describedby={fieldMessageId('cash-receipt')}
            value={receipt}
            disabled={busy}
            onChange={(e) => setReceipt(e.target.value)}
          />
        </Field>

        <section className="space-y-2">
          <h3 className="text-body font-medium text-fg">
            Ảnh hoặc PDF phiếu thu
            <span aria-hidden className="text-danger">
              {' *'}
            </span>
          </h3>
          <p className="text-body text-fg-2">
            {chosen ? (
              <>
                Tải lên khi xác nhận: <span className="font-medium text-fg">{chosen.name}</span>
                <span className="tnum">, {formatFileSize(chosen.size)}</span>.
              </>
            ) : (
              'Chưa chọn tệp.'
            )}
          </p>
          <FileButton size="sm" icon="upload_file" accept={acceptFor(PURPOSE)} disabled={busy} onFiles={pick}>
            {chosen ? 'Chọn tệp khác' : 'Chọn tệp'}
          </FileButton>
          {uploadPercent !== null && <Progress value={uploadPercent} label="Đang tải phiếu thu lên" />}
          {fileError || errors.evidenceFileId ? (
            <p className="text-meta text-danger" role="alert">
              {fileError ?? errors.evidenceFileId}
            </p>
          ) : (
            <p className="text-meta text-fg-3">
              {fileTypesText(PURPOSE)}, tối đa {maxSizeText(PURPOSE)}.
            </p>
          )}
        </section>

        <Field label="Ghi chú" htmlFor="cash-note" optional error={errors.note}>
          <Textarea
            id="cash-note"
            rows={2}
            maxLength={CASH_NOTE_MAX}
            aria-describedby={fieldMessageId('cash-note')}
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="task_alt" variant="primary" disabled={busy} onClick={() => void submit()}>
          {uploadPercent !== null
            ? `Đang tải phiếu thu ${uploadPercent}%`
            : confirm.isPending
              ? 'Đang xác nhận…'
              : 'Xác nhận đã nhận tiền'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
