import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Skeleton } from '@/components/common/ui/states'
import { formatFileSize, groupByRound } from '@/features/installations/installationDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useLatest } from '@/hooks/useLatest'
import { errorMessage, isApiError } from '@/services/api/errors'
import type {
  EvidenceDisposition,
  InstallationEvidenceFileView,
  InstallationEvidenceUrlView,
} from '@/types/res/customerInstallationsRes'

// Ảnh thi công, dùng cho mọi vai trò: nơi gọi truyền hàm xin URL của đúng endpoint (khách / kỹ thuật viên / quản lý)
// Kho ảnh riêng tư: mỗi ảnh xin một URL ký sẵn ngay khi sắp hiện, dùng luôn rồi bỏ. URL chỉ nằm trong state của
// component, không đưa vào cache, storage hay log. Ảnh không tải được thì xin URL mới đúng một lần; 410 là ảnh đã mất

export type EvidenceUrlFetcher = (
  evidenceId: string,
  disposition: EvidenceDisposition,
) => Promise<InstallationEvidenceUrlView>

type UrlState =
  { kind: 'idle' | 'loading' | 'gone' } | { kind: 'ready'; url: string } | { kind: 'error'; message: string }

// Kết quả gắn với khoá của lần xin (ảnh + lượt thử): khoá đổi mà chưa có kết quả mới thì là đang tải
function useSignedUrl(evidenceId: string, getUrl: EvidenceUrlFetcher, enabled: boolean) {
  // Nơi gọi thường truyền hàm mới mỗi lần render nên không đưa vào deps
  const fetcher = useLatest(getUrl)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; state: UrlState } | null>(null)
  const key = `${evidenceId}:${attempt}`

  useEffect(() => {
    if (!enabled) return
    let alive = true
    fetcher.current(evidenceId, 'inline').then(
      (view) => {
        if (alive) setResult({ key, state: { kind: 'ready', url: view.url } })
      },
      (error: unknown) => {
        if (!alive) return
        const gone = isApiError(error) && error.status === 410
        setResult({ key, state: gone ? { kind: 'gone' } : { kind: 'error', message: errorMessage(error) } })
      },
    )
    return () => {
      alive = false
    }
  }, [key, evidenceId, enabled, fetcher])

  const state: UrlState = result?.key === key ? result.state : { kind: enabled ? 'loading' : 'idle' }
  return { state, reload: () => setAttempt((n) => n + 1) }
}

/**
 * Ảnh từ URL ký sẵn. S3 từ chối (hết hạn) hoặc ảnh lỗi thì xin URL mới một lần, lần nữa vẫn lỗi thì dừng.
 * Có `onOpen` thì ảnh đã tải là nút mở ảnh lớn (ô lỗi có nút "Thử lại" riêng nên không bọc cả ô)
 */
function SignedImage({
  item,
  getUrl,
  enabled,
  className,
  onOpen,
}: {
  item: InstallationEvidenceFileView
  getUrl: EvidenceUrlFetcher
  enabled: boolean
  className: string
  onOpen?: () => void
}) {
  const { state, reload } = useSignedUrl(item.evidenceId, getUrl, enabled && item.downloadable)
  const [retried, setRetried] = useState(false)
  const [broken, setBroken] = useState(false)

  if (!item.downloadable) return <Placeholder className={className} text="Ảnh không còn hợp lệ nên không xem được." />
  if (state.kind === 'gone') return <Placeholder className={className} text="Ảnh này không còn nữa." />
  if (state.kind === 'error' || broken)
    return (
      <Placeholder
        className={className}
        text={state.kind === 'error' ? state.message : 'Không tải được ảnh.'}
        onRetry={() => {
          setBroken(false)
          setRetried(false)
          reload()
        }}
      />
    )
  if (state.kind !== 'ready') return <Skeleton className={className} />
  const image = (
    <img
      src={state.url}
      alt={item.caption || `Ảnh thi công ${item.fileName}`}
      referrerPolicy="no-referrer"
      className={`${className} bg-surface-2`}
      onError={() => {
        if (retried) {
          setBroken(true)
          return
        }
        setRetried(true)
        reload()
      }}
    />
  )
  if (!onOpen) return image
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Xem lớn ảnh ${item.caption || item.fileName}`}
      className="press block w-full rounded-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {image}
    </button>
  )
}

function Placeholder({ text, onRetry, className }: { text: string; onRetry?: () => void; className: string }) {
  return (
    <div
      className={`${className} flex flex-col items-center justify-center gap-2 bg-surface-2 px-3 text-center text-meta text-fg-2`}
    >
      <Icon name="hide_image" className="text-[20px] text-fg-3" />
      <span>{text}</span>
      {onRetry && (
        <Button size="sm" variant="ghost" bleed={false} icon="refresh" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}

// Chỉ xin URL khi ô ảnh sắp vào màn hình, để không tốn lượt đọc (giới hạn theo phút của backend)
function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)
  // Trình duyệt không có IntersectionObserver thì xin ngay
  const supported = typeof IntersectionObserver !== 'undefined'
  useEffect(() => {
    const node = ref.current
    if (!node || near || !supported) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [near, supported])
  return { ref, near: near || !supported }
}

function meta(item: InstallationEvidenceFileView) {
  return [formatMoment(item.addedAt), formatFileSize(item.sizeBytes)].filter(Boolean).join(', ')
}

function Thumb({
  item,
  getUrl,
  onOpen,
}: {
  item: InstallationEvidenceFileView
  getUrl: EvidenceUrlFetcher
  onOpen: () => void
}) {
  const { ref, near } = useNearViewport<HTMLLIElement>()
  const title = item.caption || item.fileName
  return (
    <li ref={ref} className="min-w-0">
      <SignedImage
        item={item}
        getUrl={getUrl}
        enabled={near}
        onOpen={onOpen}
        className="aspect-[4/3] w-full rounded-container object-cover"
      />
      <p className="mt-2 truncate text-body font-medium text-fg">{title}</p>
      <p className="tnum text-meta text-fg-3">{meta(item)}</p>
    </li>
  )
}

function Viewer({
  item,
  getUrl,
  onClose,
}: {
  item: InstallationEvidenceFileView | null
  getUrl: EvidenceUrlFetcher
  onClose: () => void
}) {
  const [downloading, setDownloading] = useState(false)

  // URL tải về xin riêng (disposition=attachment) lúc bấm, trình duyệt lưu tệp theo tên backend đặt
  async function download(target: InstallationEvidenceFileView) {
    if (downloading) return
    setDownloading(true)
    try {
      const view = await getUrl(target.evidenceId, 'attachment')
      window.location.assign(view.url)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ModalDialog
      open={item !== null}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-4xl"
      aria-label="Xem ảnh thi công"
    >
      {item && (
        <>
          <DialogTitle>{item.caption || item.fileName}</DialogTitle>
          <p className="tnum mt-1 text-meta text-fg-2">
            Lần {item.round}, {meta(item)}
          </p>
          <SignedImage
            key={item.evidenceId}
            item={item}
            getUrl={getUrl}
            enabled
            className="mt-4 max-h-[70vh] min-h-48 w-full rounded-container object-contain"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
            <Button icon="download" disabled={downloading} onClick={() => void download(item)}>
              {downloading ? 'Đang tải…' : 'Tải ảnh'}
            </Button>
          </DialogFooter>
        </>
      )}
    </ModalDialog>
  )
}

/** Lưới ảnh thi công, gom theo lần nghiệm thu khi có nhiều lần. `getUrl` gọi endpoint .../evidence/{id}/url của vai trò */
export function EvidenceGallery({
  items,
  getUrl,
  emptyText = 'Chưa có ảnh thi công.',
}: {
  items: InstallationEvidenceFileView[]
  getUrl: EvidenceUrlFetcher
  emptyText?: string
}) {
  const [open, setOpen] = useState<InstallationEvidenceFileView | null>(null)
  if (items.length === 0) return <p className="text-body text-fg-2">{emptyText}</p>
  const rounds = groupByRound(items)
  return (
    <>
      <div className="space-y-6">
        {rounds.map(({ round, items: list }) => (
          <section key={round} aria-label={`Ảnh lần ${round}`}>
            {rounds.length > 1 && <h3 className="mb-3 text-body font-semibold text-fg">Lần {round}</h3>}
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {list.map((item) => (
                <Thumb key={item.evidenceId} item={item} getUrl={getUrl} onOpen={() => setOpen(item)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Viewer item={open} getUrl={getUrl} onClose={() => setOpen(null)} />
    </>
  )
}
