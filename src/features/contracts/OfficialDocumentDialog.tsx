import { useState } from 'react'
import { toast } from 'sonner'
import { Button, IconButton } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Progress } from '@/components/common/ui/lists'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { FileInfo } from '@/features/files/FileInfo'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { contractErrorMessage, contractTitle } from '@/features/contracts/contractDisplay'
import { officialDocumentBody, shortHash } from '@/features/contracts/contractRules'
import { useAttachOfficialDocumentMutation } from '@/hooks/useContracts'
import { useFileUpload } from '@/hooks/useFiles'
import type { ContractView } from '@/types/res/customerContractsRes'

// Gắn PDF hợp đồng chính thức. PDF do kinh doanh tạo ngoài hệ thống từ đúng phiên bản đã phát hành; ở đây chỉ tải lên
// (mục đích CONTRACT_DOCUMENT) rồi xác nhận PDF đó thuộc phiên bản có mã nội dung đang hiện. Mã nội dung và revision lấy
// lúc mở hộp thoại: hợp đồng đổi trong lúc đó thì backend từ chối, người dùng mở lại để xác nhận với mã mới

const PURPOSE = 'CONTRACT_DOCUMENT'

function copy(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard)
    void navigator.clipboard.writeText(text).then(() => toast.success('Đã chép mã nội dung.'))
}

export function OfficialDocumentDialog({ contract, onClose }: { contract: ContractView; onClose: () => void }) {
  // Phiên bản người dùng đang xác nhận, không đổi theo cache trong lúc hộp thoại mở
  const [snapshot] = useState(contract)
  const [chosen, setChosen] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  // Tệp đã tải và xác minh: gắn lỗi thì lần sau chỉ gắn, không tải lại
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const upload = useFileUpload(PURPOSE)
  const attach = useAttachOfficialDocumentMutation()
  const busy = upload.uploading || attach.isPending
  const uploadPercent = upload.progress === null ? null : Math.round(upload.progress * 100)

  function pick(files: File[]) {
    const file = files[0]!
    setChosen(file)
    setUploadedId(null)
    setFileError(fileProblem(file, PURPOSE))
    setError(null)
  }

  async function submit() {
    setError(null)
    if (!chosen) return setFileError('Chọn tệp PDF hợp đồng chính thức.')
    if (fileError) return
    if (!confirmed) return setError('Đánh dấu xác nhận PDF được tạo từ đúng phiên bản này.')
    let fileId = uploadedId
    try {
      // Tải lên xong (đã xác minh) mới gắn; tải lỗi thì không gọi lệnh gắn
      if (!fileId) {
        fileId = (await upload.upload(chosen)).fileId
        setUploadedId(fileId)
      }
    } catch (e) {
      return setError(`Chưa tải được tệp lên: ${contractErrorMessage(e)}`)
    }
    const body = officialDocumentBody(snapshot, fileId)
    if (!body) return setError('Hợp đồng chưa phát hành nên chưa có mã nội dung.')
    try {
      await attach.mutateAsync({ contractId: snapshot.contractId, body })
      toast.success('Đã gắn PDF hợp đồng chính thức.')
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
      className="max-w-2xl"
      aria-label="Gắn PDF hợp đồng chính thức"
    >
      <DialogTitle>Gắn PDF hợp đồng chính thức</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Tạo PDF từ đúng nội dung của {contractTitle(snapshot)} và ghi mã nội dung dưới đây trên PDF. Khách sẽ tải đúng
        tệp này để in, ký tay rồi gửi lại.
      </p>

      <div className="mt-4 space-y-5">
        <section className="space-y-2">
          <h3 className="text-body font-medium text-fg">Mã nội dung của phiên bản này</h3>
          <div className="flex items-start gap-2 rounded-control bg-surface-2 px-3 py-2">
            <code className="min-w-0 flex-1 font-mono text-meta break-all text-fg">{snapshot.canonicalHash}</code>
            <IconButton
              icon="content_copy"
              label="Chép mã nội dung"
              size="sm"
              onClick={() => snapshot.canonicalHash && copy(snapshot.canonicalHash)}
            />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-body font-medium text-fg">
            Tệp PDF
            <span aria-hidden className="text-danger">
              {' *'}
            </span>
          </h3>
          <p className="text-body text-fg-2">
            {chosen ? (
              <>
                Tải lên khi gắn: <span className="font-medium text-fg">{chosen.name}</span>
                <span className="tnum">, {formatFileSize(chosen.size)}</span>.
              </>
            ) : snapshot.officialDocument ? (
              <>
                Đang gắn: <FileInfo fileId={snapshot.officialDocument.fileId} />. Chọn tệp khác để thay.
              </>
            ) : (
              'Chưa chọn tệp.'
            )}
          </p>
          <FileButton size="sm" icon="upload_file" accept={acceptFor(PURPOSE)} disabled={busy} onFiles={pick}>
            {chosen ? 'Chọn tệp khác' : 'Chọn tệp PDF'}
          </FileButton>
          {uploadPercent !== null && <Progress value={uploadPercent} label="Đang tải PDF lên" />}
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

        <Checkbox
          checked={confirmed}
          disabled={busy}
          onChange={(e) => setConfirmed(e.target.checked)}
          label={`PDF này được tạo từ ${contractTitle(snapshot)}, mã nội dung ${shortHash(snapshot.canonicalHash)}`}
        />
      </div>

      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Huỷ
        </Button>
        <Button icon="upload_file" variant="primary" disabled={busy || !chosen} onClick={() => void submit()}>
          {uploadPercent !== null ? `Đang tải PDF ${uploadPercent}%` : attach.isPending ? 'Đang gắn…' : 'Gắn PDF'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
