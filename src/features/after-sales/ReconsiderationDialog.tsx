import { useState } from 'react'
import { toast } from 'sonner'
import { Button, IconButton } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { FileButton } from '@/components/common/ui/file-button'
import { Notice } from '@/components/common/ui/lists'
import {
  RECONSIDERATION_NOTE_MAX,
  RECONSIDERATION_PHOTOS_MAX,
  reconsiderationNoteError,
} from '@/features/after-sales/customerServiceRules'
import { acceptFor, fileProblem, fileTypesText, maxSizeText } from '@/features/files/fileDisplay'
import { useReconsiderationMutation } from '@/hooks/useCustomerServiceRequests'
import { useFileUpload } from '@/hooks/useFiles'
import { errorMessage, isApiError } from '@/services/api/errors'

// Xin xét lại hỗ trợ thiên tai bị từ chối, một lần mỗi yêu cầu (backend: DISASTER_RECONSIDERATION_USED). Ảnh bổ sung là
// SERVICE_EVIDENCE do chính khách tải lên, tải lần lượt rồi mới gửi; ảnh đã tải xong thì lần gửi lại không tải lại

const PURPOSE = 'SERVICE_EVIDENCE'

type Photo = { key: number; file: File; fileId: string | null }

let lastKey = 0

export function ReconsiderationDialog({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const upload = useFileUpload(PURPOSE)
  const send = useReconsiderationMutation()
  const busy = progress !== null || send.isPending

  function add(files: File[]) {
    setError(null)
    const bad = files.find((f) => fileProblem(f, PURPOSE))
    if (bad) return setError(`${bad.name}: ${fileProblem(bad, PURPOSE)}`)
    const next = [...photos, ...files.map((file) => ({ key: ++lastKey, file, fileId: null }))]
    if (next.length > RECONSIDERATION_PHOTOS_MAX) return setError(`Tối đa ${RECONSIDERATION_PHOTOS_MAX} ảnh.`)
    setPhotos(next)
  }

  async function submit() {
    setError(null)
    const problem = reconsiderationNoteError(note)
    setNoteError(problem)
    if (problem) return
    const ids: string[] = []
    let current = photos
    for (const [i, photo] of current.entries()) {
      if (photo.fileId) {
        ids.push(photo.fileId)
        continue
      }
      setProgress(`Đang tải ảnh ${i + 1}/${current.length}…`)
      try {
        const { fileId } = await upload.upload(photo.file)
        ids.push(fileId)
        current = current.map((p) => (p.key === photo.key ? { ...p, fileId } : p))
        setPhotos(current)
      } catch (e) {
        setProgress(null)
        return setError(`${photo.file.name}: ${errorMessage(e)}`)
      }
    }
    setProgress(null)
    try {
      await send.mutateAsync({ requestId, body: { note: note.trim(), evidenceFileIds: ids } })
      toast.success('Đã gửi yêu cầu xét lại. Quản lý sẽ xem và báo kết quả.')
      onClose()
    } catch (e) {
      // Ảnh không hợp lệ (đã gắn ở yêu cầu khác, quá số ảnh): bỏ hết để khách chọn lại
      if (isApiError(e) && e.code === 'AFTER_SALES_VALIDATION_FAILED') setPhotos([])
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      aria-label="Xin xét lại hỗ trợ thiên tai"
      className="max-w-lg"
    >
      <DialogTitle>Xin xét lại hỗ trợ thiên tai</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Mỗi yêu cầu chỉ xin xét lại được một lần. Ghi rõ điều bạn bổ sung và gửi kèm ảnh nếu có.
      </p>
      <div className="mt-4 space-y-4">
        <Field
          label="Thông tin bổ sung"
          htmlFor="reconsideration-note"
          error={noteError ?? undefined}
          hint={`Tối đa ${RECONSIDERATION_NOTE_MAX} ký tự.`}
          required
        >
          <Textarea
            id="reconsideration-note"
            rows={4}
            maxLength={RECONSIDERATION_NOTE_MAX}
            aria-required
            aria-invalid={noteError ? true : undefined}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <section className="space-y-2">
          <h3 className="text-body font-medium text-fg">Ảnh bổ sung</h3>
          {photos.length > 0 && (
            <ul className="space-y-1">
              {photos.map((p) => (
                <li key={p.key} className="flex items-center justify-between gap-3 text-body text-fg">
                  <span className="min-w-0 truncate">
                    {p.file.name}
                    {p.fileId && <span className="text-fg-2"> (đã tải lên)</span>}
                  </span>
                  <IconButton
                    icon="delete"
                    label={`Bỏ ${p.file.name}`}
                    size="sm"
                    disabled={busy}
                    onClick={() => setPhotos(photos.filter((x) => x.key !== p.key))}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <FileButton
              size="sm"
              variant="soft"
              icon="add_a_photo"
              accept={acceptFor(PURPOSE)}
              multiple
              disabled={busy || photos.length >= RECONSIDERATION_PHOTOS_MAX}
              onFiles={add}
            >
              Thêm ảnh
            </FileButton>
            <span className="text-meta text-fg-2">
              {progress ??
                `Không bắt buộc. ${fileTypesText(PURPOSE)}, tối đa ${maxSizeText(PURPOSE)} mỗi ảnh, ${RECONSIDERATION_PHOTOS_MAX} ảnh.`}
            </span>
          </div>
        </section>
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
        <Button icon="send" variant="primary" disabled={busy} onClick={() => void submit()}>
          {send.isPending ? 'Đang gửi…' : 'Gửi yêu cầu xét lại'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
