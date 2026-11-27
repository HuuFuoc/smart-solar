import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, buttonClass } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { readErrorText } from '@/features/cash-receipts/cashReceiptDisplay'
import { useLatest } from '@/hooks/useLatest'
import type { EvidenceDisposition } from '@/services/cashReceiptService'
import type { AttachedFileUrlView } from '@/types/res/paymentPlanRes'

// Ảnh / PDF phiếu thu kỹ thuật viên đã gửi, hiện ngay trên trang xét duyệt (không tải lại tệp, không tải tệp khác lên). Link ký sẵn
// sống vài phút, backend ghi lại mỗi lần xin: chỉ xin khi mở trang, khi ảnh lỗi (thường do link hết hạn, xin lại một lần tự động),
// khi phóng to / mở PDF sau lúc hết hạn và khi bấm tải lại. Link chỉ nằm trong state, không cache, không lưu, không ghi log

const isExpired = (link: AttachedFileUrlView | null) =>
  Boolean(link?.expiresAt && Date.parse(link.expiresAt) <= Date.now())

const kindOf = (link: AttachedFileUrlView) =>
  link.contentType.startsWith('image/') ? 'image' : link.contentType === 'application/pdf' ? 'pdf' : 'other'

function download(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
}

export function CashReceiptEvidenceViewer({
  name,
  request,
}: {
  /** "Ảnh phiếu thu PT-000123" */
  name: string
  request: (disposition: EvidenceDisposition) => Promise<AttachedFileUrlView>
}) {
  const [link, setLink] = useState<AttachedFileUrlView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [downloading, setDownloading] = useState(false)
  // Ảnh lỗi thì xin link mới đúng một lần, tránh vòng lặp khi tệp hỏng thật
  const retried = useRef(false)
  const latest = useLatest(request)
  const alive = useRef(true)

  // Xin link, ghi kết quả khi khung còn mở
  const fetchLink = useCallback(
    () =>
      latest.current('inline').then(
        (next) => {
          if (!alive.current) return
          setLink(next)
          setExpired(isExpired(next))
          setLoading(false)
        },
        (e: unknown) => {
          if (!alive.current) return
          setLink(null)
          setError(readErrorText(e))
          setLoading(false)
        },
      ),
    [latest],
  )

  /** Xin lại link (bấm tải lại, ảnh lỗi, link hết hạn) */
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return fetchLink()
  }, [fetchLink])

  useEffect(() => {
    alive.current = true
    void fetchLink()
    return () => {
      alive.current = false
    }
  }, [fetchLink])

  // Đánh dấu link hết hạn đúng lúc để nút mở tab mới / PDF không trỏ vào link chết
  useEffect(() => {
    if (!link?.expiresAt || expired) return
    const ms = Date.parse(link.expiresAt) - Date.now()
    if (!Number.isFinite(ms)) return
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, ms))
    return () => window.clearTimeout(timer)
  }, [link, expired])

  function broken() {
    if (retried.current) return setError('Không hiển thị được ảnh phiếu thu. Thử tải lại hoặc tải về.')
    retried.current = true
    void load()
  }

  async function openZoom() {
    if (isExpired(link)) await load()
    setZoom(true)
  }

  async function save() {
    if (downloading) return
    setDownloading(true)
    try {
      download((await latest.current('attachment')).url)
    } catch (e) {
      setError(readErrorText(e))
    } finally {
      setDownloading(false)
    }
  }

  if (loading && !link) return <Skeleton className="aspect-[4/3] w-full" />
  if (!link)
    return (
      <ErrorState
        title="Không tải được ảnh phiếu thu."
        message={error ?? undefined}
        onRetry={() => {
          retried.current = false
          void load()
        }}
      />
    )

  const kind = kindOf(link)
  return (
    <div className="space-y-3">
      {kind === 'image' ? (
        <button
          type="button"
          className="tap block w-full rounded-container focus-visible:outline-2 focus-visible:outline-accent"
          aria-label="Phóng to ảnh phiếu thu"
          onClick={() => void openZoom()}
        >
          <img
            src={link.url}
            alt={name}
            className="max-h-[70dvh] w-full rounded-container border border-line bg-surface-2 object-contain"
            onError={broken}
          />
        </button>
      ) : kind === 'pdf' ? (
        expired ? (
          <p className="text-body text-fg-2">Liên kết xem PDF đã hết hạn. Bấm tải lại để xem tiếp.</p>
        ) : (
          <iframe
            src={link.url}
            title={name}
            className="h-[70dvh] w-full rounded-container border border-line bg-panel"
          />
        )
      ) : (
        <p className="text-body text-fg-2">Loại tệp này không xem trực tiếp được. Tải về để mở.</p>
      )}
      {error && (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {kind === 'image' && (
          <Button size="sm" icon="zoom_in" variant="info" onClick={() => void openZoom()}>
            Phóng to
          </Button>
        )}
        {kind === 'pdf' && !expired && (
          <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonClass('info', 'sm')}>
            Mở tab mới
          </a>
        )}
        <Button
          size="sm"
          icon="refresh"
          variant="secondary"
          disabled={loading}
          onClick={() => {
            retried.current = false
            void load()
          }}
        >
          {loading ? 'Đang tải…' : 'Tải lại'}
        </Button>
        <Button size="sm" icon="download" variant="secondary" disabled={downloading} onClick={() => void save()}>
          {downloading ? 'Đang tải…' : 'Tải về'}
        </Button>
      </div>

      {zoom && (
        <ModalDialog
          open
          onOpenChange={(o) => !o && setZoom(false)}
          className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto"
          aria-label={name}
        >
          <DialogTitle>{name}</DialogTitle>
          <img
            src={link.url}
            alt={name}
            className="mx-auto mt-4 max-h-[calc(100dvh-12rem)] w-auto max-w-full rounded-control border border-line object-contain"
            onError={broken}
          />
          <DialogFooter>
            <Button icon="close" variant="secondary" onClick={() => setZoom(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </ModalDialog>
      )}
    </div>
  )
}
