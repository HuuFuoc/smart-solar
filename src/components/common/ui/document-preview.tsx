import { useState } from 'react'
import { Button, buttonClass } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Skeleton } from '@/components/common/ui/states'
import { errorMessage } from '@/services/api/errors'

// Xem một tệp (ảnh trang hợp đồng, PDF hợp đồng, bản ký…) ngay trong hộp thoại thay vì mở tab mới. Link ký sẵn xin đúng lúc bấm,
// chỉ nằm trong state của hộp thoại (không cache, không lưu, không log) và bỏ khi đóng; link hết hạn hoặc ảnh lỗi thì xin lại

export type DocumentLink = { url: string; contentType: string; fileName: string; expiresAt?: string | null }

type Props = {
  /** Tên tài liệu cho tiêu đề hộp thoại và trình đọc màn hình, vd. "Trang 2", "PDF chính thức" */
  name: string
  request: (disposition: 'inline' | 'attachment') => Promise<DocumentLink>
  /** Câu lỗi theo nghiệp vụ; mặc định là câu lỗi chung */
  errorText?: (error: unknown) => string
  size?: 'sm' | 'md'
}

const kindOf = (link: DocumentLink) =>
  link.contentType.startsWith('image/') ? 'image' : link.contentType === 'application/pdf' ? 'pdf' : 'other'

const expired = (link: DocumentLink) => Boolean(link.expiresAt && Date.parse(link.expiresAt) <= Date.now())

function download(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
}

export function DocumentPreviewButtons({ name, request, errorText = (e) => errorMessage(e), size = 'sm' }: Props) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<DocumentLink | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Ảnh lỗi (thường do link vừa hết hạn) thì xin lại đúng một lần
  const [retried, setRetried] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setLink(await request('inline'))
    } catch (e) {
      setLink(null)
      setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }

  function show() {
    setOpen(true)
    setRetried(false)
    void load()
  }

  function close() {
    setOpen(false)
    setLink(null)
    setError(null)
  }

  async function save() {
    if (downloading) return
    setDownloading(true)
    setError(null)
    try {
      download((await request('attachment')).url)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setDownloading(false)
    }
  }

  function broken() {
    if (retried) return setError('Không hiển thị được tệp. Thử tải về.')
    setRetried(true)
    void load()
  }

  const kind = link ? kindOf(link) : null

  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <Button size={size} variant="info" icon="visibility" aria-label={`Xem ${name}`} onClick={show}>
          Xem
        </Button>
        <Button
          size={size}
          variant="secondary"
          icon="download"
          aria-label={`Tải ${name}`}
          disabled={downloading}
          onClick={() => void save()}
        >
          {downloading ? 'Đang tải…' : 'Tải về'}
        </Button>
        {!open && error && (
          <span role="alert" className="text-meta text-danger">
            {error}
          </span>
        )}
      </span>

      {open && (
        <ModalDialog
          open
          onOpenChange={(o) => !o && close()}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto"
          aria-label={name}
        >
          <DialogTitle>{name}</DialogTitle>
          <div className="mt-4">
            {loading ? (
              <Skeleton className="h-96" />
            ) : error && !link ? (
              <div role="alert" className="space-y-3">
                <p className="text-body text-danger">{error}</p>
                <Button size="sm" variant="secondary" icon="refresh" onClick={() => void load()}>
                  Thử lại
                </Button>
              </div>
            ) : link && kind === 'image' ? (
              <img
                src={link.url}
                alt={name}
                className="mx-auto max-h-[calc(100dvh-14rem)] w-auto max-w-full rounded-control border border-line object-contain"
                onError={broken}
              />
            ) : link && kind === 'pdf' ? (
              <iframe
                src={link.url}
                title={name}
                className="h-[calc(100dvh-14rem)] w-full rounded-control border border-line bg-panel"
              />
            ) : link ? (
              <p className="text-body text-fg-2">Loại tệp này không xem trực tiếp được. Tải về để mở.</p>
            ) : null}
            {link && error && (
              <p role="alert" className="mt-2 text-meta text-danger">
                {error}
              </p>
            )}
          </div>
          <DialogFooter className="flex-wrap">
            {link && !expired(link) && (
              <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
                Mở tab mới
              </a>
            )}
            <Button icon="download" variant="secondary" disabled={downloading} onClick={() => void save()}>
              {downloading ? 'Đang tải…' : 'Tải về'}
            </Button>
            <Button icon="close" variant="secondary" onClick={close}>
              Đóng
            </Button>
          </DialogFooter>
        </ModalDialog>
      )}
    </>
  )
}
