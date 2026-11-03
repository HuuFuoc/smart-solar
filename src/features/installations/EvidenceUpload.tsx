import { useCallback } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, IconButton } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Progress } from '@/components/common/ui/lists'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { formatFileSize } from '@/features/installations/installationDisplay'
import { useUploadQueue, type UploadItem } from '@/hooks/useFiles'
import { useAddEvidenceMutation } from '@/hooks/useTechnicianInstallations'

const PURPOSE = 'INSTALLATION_EVIDENCE'

/** Backend cắt chú thích quá 300 ký tự */
const CAPTION_MAX = 300

// Ảnh chọn trên máy, xem trước bằng URL tạm của trình duyệt. Ref giữ nguyên theo tệp nên thanh tiến độ chạy không
// tạo lại URL; bỏ ảnh thì cleanup của ref thu hồi URL
function LocalPreview({ file }: { file: File }) {
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return
      const url = URL.createObjectURL(file)
      img.src = url
      return () => URL.revokeObjectURL(url)
    },
    [file],
  )
  return <img ref={attach} alt="" className="size-16 shrink-0 rounded-container bg-surface-2 object-cover" />
}

function RowStatus({ item }: { item: UploadItem }) {
  switch (item.status) {
    case 'uploading': {
      const percent = Math.round(item.progress * 100)
      return (
        <div className="space-y-1">
          <Progress value={percent} label={`Đang tải ${item.file.name}`} />
          <p className="tnum text-meta text-fg-2">Đang tải lên {percent}%</p>
        </div>
      )
    }
    case 'attaching':
      return <p className="text-meta text-fg-2">Đang gắn vào công trình…</p>
    case 'done':
      return <Badge tone="ok">Đã thêm</Badge>
    case 'invalid':
    case 'failed':
      return (
        <p className="flex items-start gap-1.5 text-meta text-danger">
          <Icon name="error" className="mt-px shrink-0 text-[16px]" />
          {item.error}
        </p>
      )
    default:
      return null
  }
}

/** Chọn ảnh trên máy, ghi chú thích, tải lên kho rồi gắn vào lượt hiện tại của công trình */
export function EvidenceUpload({ projectId, round }: { projectId: string; round: number }) {
  const addEvidence = useAddEvidenceMutation()
  const queue = useUploadQueue({
    purpose: PURPOSE,
    check: (file) => fileProblem(file, PURPOSE),
    attach: (fileId, caption) => addEvidence.mutateAsync({ id: projectId, fileId, caption }),
    onComplete: ({ added, failed }) => {
      if (added > 0)
        toast.success(failed > 0 ? `Đã thêm ${added} ảnh, còn ${failed} ảnh chưa thêm được.` : `Đã thêm ${added} ảnh.`)
    },
  })
  const pending = queue.items.filter((i) => i.status === 'queued' || i.status === 'failed').length
  const accept = acceptFor(PURPOSE)
  const rule = `${fileTypesText(PURPOSE)}, tối đa ${maxSizeText(PURPOSE)} mỗi ảnh.`

  if (queue.items.length === 0)
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FileButton variant="soft" icon="add_photo_alternate" accept={accept} multiple onFiles={queue.add}>
          Chọn ảnh
        </FileButton>
        <p className="text-meta text-fg-2">
          {rule} Ảnh vào lượt {round}.
        </p>
      </div>
    )

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {queue.items.map((item, i) => {
          const locked = item.status === 'uploading' || item.status === 'attaching' || item.status === 'done'
          const captionId = `evidence-caption-${item.key}`
          return (
            <li key={item.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <LocalPreview file={item.file} />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate font-medium text-fg">{item.file.name}</span>
                  <span className="tnum shrink-0 text-meta text-fg-3">{formatFileSize(item.file.size)}</span>
                </p>
                {item.status !== 'invalid' && (
                  <div className="flex flex-col gap-1">
                    <label htmlFor={captionId} className="text-meta text-fg-2">
                      Chú thích (không bắt buộc)
                    </label>
                    <Input
                      id={captionId}
                      size="sm"
                      value={item.caption}
                      maxLength={CAPTION_MAX}
                      disabled={locked}
                      onChange={(e) => queue.setCaption(item.key, e.target.value)}
                    />
                  </div>
                )}
                <RowStatus item={item} />
              </div>
              {!locked && (
                <IconButton
                  icon="close"
                  label={`Bỏ ảnh ${i + 1}: ${item.file.name}`}
                  tooltip="Bỏ ảnh"
                  disabled={queue.busy}
                  onClick={() => queue.remove(item.key)}
                />
              )}
            </li>
          )
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <FileButton
          variant="soft"
          size="sm"
          icon="add_photo_alternate"
          accept={accept}
          multiple
          disabled={queue.busy}
          onFiles={queue.add}
        >
          Chọn thêm ảnh
        </FileButton>
        <span className="ml-auto flex flex-wrap items-center gap-3">
          <Button icon="delete" size="sm" variant="danger" disabled={queue.busy} onClick={queue.clear}>
            Bỏ hết
          </Button>
          <Button icon="upload" size="sm" variant="soft" disabled={queue.busy || pending === 0} onClick={queue.start}>
            {queue.busy ? 'Đang tải…' : `Tải lên ${pending} ảnh`}
          </Button>
        </span>
      </div>
      {/* Ảnh mới chọn chưa có trên hệ thống: người dùng dễ tưởng chọn xong là đã thêm */}
      <p className={`tnum text-meta ${pending > 0 && !queue.busy ? 'font-medium text-fg' : 'text-fg-2'}`} role="status">
        {queue.waitSeconds > 0
          ? `Đã tải nhiều ảnh trong một phút. Tự tải tiếp sau ${queue.waitSeconds} giây.`
          : pending > 0 && !queue.busy
            ? `${pending} ảnh mới chọn, chưa lên hệ thống. Bấm "Tải lên ${pending} ảnh" để thêm vào lượt ${round}.`
            : `${rule} Ảnh vào lượt ${round}.`}
      </p>
    </div>
  )
}
