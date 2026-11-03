import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { FileButton } from '@/components/common/ui/file-button'
import { Progress } from '@/components/common/ui/lists'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { FileInfo } from '@/features/files/FileInfo'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { canAttachQuotationDocument } from '@/features/quotations/quotationRules'
import { useFileUpload } from '@/hooks/useFiles'
import { useAttachQuotationDocumentMutation } from '@/hooks/useSalesQuotations'
import { errorMessage } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Tệp PDF của báo giá (tạo ngoài hệ thống). Tải lên (QUOTATION_DOCUMENT) xong và đã xác minh mới gắn vào báo giá;
// tải lỗi thì không gắn. Gắn lỗi thì lần sau chỉ gắn lại tệp đã tải

const PURPOSE = 'QUOTATION_DOCUMENT'

export function QuotationDocument({ quotation: q }: { quotation: QuotationView }) {
  const [chosen, setChosen] = useState<File | null>(null)
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const upload = useFileUpload(PURPOSE)
  const attach = useAttachQuotationDocumentMutation()
  const busy = upload.uploading || attach.isPending
  const editable = canAttachQuotationDocument(q)
  const uploadPercent = upload.progress === null ? null : Math.round(upload.progress * 100)

  function pick(files: File[]) {
    const file = files[0]!
    setChosen(file)
    setUploadedId(null)
    setError(fileProblem(file, PURPOSE))
  }

  async function submit() {
    if (!chosen || fileProblem(chosen, PURPOSE)) return
    setError(null)
    let fileId = uploadedId
    try {
      if (!fileId) {
        fileId = (await upload.upload(chosen)).fileId
        setUploadedId(fileId)
      }
    } catch (e) {
      return setError(`Chưa tải được tệp lên: ${errorMessage(e)}`)
    }
    try {
      await attach.mutateAsync({ quotationId: q.quotationId, fileId })
      toast.success('Đã gắn PDF báo giá.')
      setChosen(null)
      setUploadedId(null)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (!editable && !q.documentFileId) return null
  return (
    <section className="space-y-2 border-t border-line pt-4" aria-label="Tệp PDF báo giá">
      <h3 className="text-body font-medium text-fg">Tệp PDF báo giá</h3>
      <p className="text-body text-fg-2">
        {chosen ? (
          <>
            Sẽ gắn: <span className="font-medium text-fg">{chosen.name}</span>
            <span className="tnum">, {formatFileSize(chosen.size)}</span>.
          </>
        ) : q.documentFileId ? (
          <>
            Đang gắn: <FileInfo fileId={q.documentFileId} />.
          </>
        ) : (
          'Chưa gắn tệp.'
        )}
      </p>
      {editable && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <FileButton size="sm" icon="upload_file" accept={acceptFor(PURPOSE)} disabled={busy} onFiles={pick}>
              {chosen || q.documentFileId ? 'Chọn tệp khác' : 'Chọn tệp PDF'}
            </FileButton>
            {chosen && (
              <Button
                size="sm"
                variant="soft"
                icon="attach_file"
                disabled={busy || Boolean(fileProblem(chosen, PURPOSE))}
                onClick={() => void submit()}
              >
                {uploadPercent !== null
                  ? `Đang tải ${uploadPercent}%`
                  : attach.isPending
                    ? 'Đang gắn…'
                    : 'Gắn vào báo giá'}
              </Button>
            )}
          </div>
          {uploadPercent !== null && <Progress value={uploadPercent} label="Đang tải PDF báo giá lên" />}
          <p className="text-meta text-fg-3">
            {fileTypesText(PURPOSE)}, tối đa {maxSizeText(PURPOSE)}.
            {q.status === 'ISSUED'
              ? ' Báo giá đã gửi chỉ gắn được một lần.'
              : ' Bản nháp thay tệp được tới lúc gửi khách.'}
          </p>
        </>
      )}
      <ErrorLine message={error} />
    </section>
  )
}
