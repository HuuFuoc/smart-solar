import { useState } from 'react'
import { toast } from 'sonner'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice } from '@/components/common/ui/lists'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { useAddPhotoMutation } from '@/hooks/useTechnicianAfterSales'
import { errorMessage } from '@/services/api/errors'

// Kỹ thuật viên chọn ảnh hiện trường; từng ảnh được tải lên S3, đăng ký và gắn vào buổi hẹn, lần lượt từng ảnh

const PURPOSE = 'SERVICE_EVIDENCE'

export function PhotoUpload({ visitId }: { visitId: string }) {
  const add = useAddPhotoMutation()
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload(files: File[]) {
    setError(null)
    const bad = files.find((f) => fileProblem(f, PURPOSE))
    if (bad) return setError(`${bad.name}: ${fileProblem(bad, PURPOSE)}`)
    let done = 0
    for (const file of files) {
      setProgress(`Đang tải ảnh ${done + 1}/${files.length}…`)
      try {
        await add.mutateAsync({ visitId, body: file })
        done++
      } catch (e) {
        setError(`${file.name}: ${errorMessage(e)}`)
        break
      }
    }
    setProgress(null)
    if (done > 0) toast.success(`Đã thêm ${done} ảnh.`)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FileButton
          variant="soft"
          icon="add_a_photo"
          accept={acceptFor(PURPOSE)}
          multiple
          disabled={progress !== null}
          onFiles={(files) => void upload(files)}
        >
          Thêm ảnh
        </FileButton>
        <span className="text-meta text-fg-2">
          {progress ?? `${fileTypesText(PURPOSE)}, tối đa ${maxSizeText(PURPOSE)} mỗi ảnh.`}
        </span>
      </div>
      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </div>
  )
}
