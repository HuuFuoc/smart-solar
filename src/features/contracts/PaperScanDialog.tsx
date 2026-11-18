import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice, Progress } from '@/components/common/ui/lists'
import { contractErrorMessage, contractTitle } from '@/features/contracts/contractDisplay'
import { PAPER_NOTE_MAX, canUploadPaperScan, paperScanErrors, shortHash } from '@/features/contracts/contractRules'
import { REUPLOAD_ERROR_CODES } from '@/features/contracts/customerContractRules'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { todayVn } from '@/features/scheduling/schedulingDisplay'
import { usePaperSignedDocumentMutation } from '@/hooks/useContracts'
import { useFileUpload } from '@/hooks/useFiles'
import { isApiError } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'

// Khách ký hợp đồng giấy trước mặt nhân viên; nhân viên quét thành PDF rồi tải lên. Gửi SHA-256 của PDF chính thức hiện tại
// (lấy lúc mở hộp thoại, không phải SHA-256 của bản quét). Tải lên chỉ chuyển sang chờ duyệt; quản lý / quản trị vẫn phải
// duyệt bản ký trước khi khách thanh toán

const PURPOSE = 'SIGNED_CONTRACT'

export function PaperScanDialog({ contract, onClose }: { contract: ContractView; onClose: () => void }) {
  // PDF chính thức lúc mở hộp thoại: hợp đồng đổi phiên bản trong lúc đó thì backend từ chối
  const [official] = useState(() => contract.officialDocument?.sha256 ?? null)
  const [chosen, setChosen] = useState<File | null>(null)
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [signedOn, setSignedOn] = useState(todayVn())
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<ReturnType<typeof paperScanErrors>>({})
  const [error, setError] = useState<string | null>(null)
  const upload = useFileUpload(PURPOSE)
  const submit = usePaperSignedDocumentMutation()
  const busy = upload.uploading || submit.isPending
  const percent = upload.progress === null ? null : Math.round(upload.progress * 100)
  const ready = official !== null && canUploadPaperScan(contract) && contract.officialDocument?.sha256 === official
  const today = todayVn()

  function pick(files: File[]) {
    const file = files[0]!
    setChosen(file)
    setUploadedId(null)
    setFileError(fileProblem(file, PURPOSE))
    setError(null)
  }

  async function send() {
    setError(null)
    if (!ready) return
    if (!chosen && !uploadedId) return setFileError('Chọn tệp PDF bản quét hợp đồng đã ký.')
    if (fileError) return
    const next = paperScanErrors(signedOn, note, today)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    let fileId = uploadedId
    try {
      if (!fileId) {
        fileId = (await upload.upload(chosen!)).fileId
        setUploadedId(fileId)
      }
    } catch (e) {
      return setError(`Chưa tải được tệp lên: ${contractErrorMessage(e)}`)
    }
    try {
      await submit.mutateAsync({
        contractId: contract.contractId,
        body: { fileId, officialDocumentSha256: official, signedOn: signedOn || null, note: note.trim() || null },
      })
      toast.success('Đã tải bản ký. Hợp đồng chờ quản lý duyệt bản ký.')
      onClose()
    } catch (e) {
      if (isApiError(e) && e.code && REUPLOAD_ERROR_CODES.includes(e.code)) {
        setUploadedId(null)
        setChosen(null)
      }
      setError(contractErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      dismissible={!busy}
      className="max-w-xl"
      aria-label="Tải bản hợp đồng giấy đã ký"
    >
      <DialogTitle>Tải bản hợp đồng giấy đã ký</DialogTitle>
      <p className="mt-2 text-body text-fg-2">{contractTitle(contract)}</p>
      {!ready ? (
        <Notice tone="warn" className="mt-4">
          Hợp đồng không còn chờ bản ký hoặc PDF chính thức vừa đổi. Đóng hộp thoại để xem trạng thái mới.
        </Notice>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-body text-fg-2">
            Bản quét phải là bản in của PDF chính thức có mã{' '}
            <span className="font-mono text-fg">{shortHash(official)}</span>.
          </p>
          <section className="space-y-2">
            <p className="text-body text-fg-2">
              {chosen ? (
                <>
                  Tải lên khi gửi: <span className="font-medium text-fg">{chosen.name}</span>
                  <span className="tnum">, {formatFileSize(chosen.size)}</span>.
                </>
              ) : uploadedId ? (
                'Đã tải lên, chưa gửi.'
              ) : (
                'Chưa chọn tệp.'
              )}
            </p>
            <FileButton size="sm" icon="upload_file" accept={acceptFor(PURPOSE)} disabled={busy} onFiles={pick}>
              {chosen ? 'Chọn tệp khác' : 'Chọn tệp PDF'}
            </FileButton>
            {percent !== null && <Progress value={percent} label="Đang tải bản quét lên" />}
            {fileError ? (
              <p className="text-meta text-danger" role="alert">
                {fileError}
              </p>
            ) : (
              <p className="text-meta text-fg-3">
                {fileTypesText(PURPOSE)}, tối đa {maxSizeText(PURPOSE)}.
              </p>
            )}
          </section>
          <Field label="Ngày ký trên giấy" htmlFor="paper-signed-on" optional error={errors.signedOn}>
            <DateField id="paper-signed-on" value={signedOn} max={today} disabled={busy} onChange={setSignedOn} />
          </Field>
          <Field label="Ghi chú" htmlFor="paper-note" optional error={errors.note}>
            <Textarea
              id="paper-note"
              rows={2}
              maxLength={PAPER_NOTE_MAX}
              value={note}
              disabled={busy}
              placeholder="Ví dụ: Ký tại văn phòng"
              aria-invalid={Boolean(errors.note) || undefined}
              aria-describedby={fieldMessageId('paper-note')}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      )}
      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Đóng
        </Button>
        {ready && (
          <Button icon="send" variant="primary" disabled={busy || (!chosen && !uploadedId)} onClick={() => void send()}>
            {percent !== null ? `Đang tải ${percent}%` : submit.isPending ? 'Đang gửi…' : 'Gửi bản ký'}
          </Button>
        )}
      </DialogFooter>
    </ModalDialog>
  )
}
