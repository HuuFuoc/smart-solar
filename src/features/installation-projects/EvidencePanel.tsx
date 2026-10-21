import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Skeleton } from '@/components/common/ui/states'
import { PanelQuery } from '@/features/installation-projects/formParts'
import { formatFileSize, installationErrorMessage } from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useEvidenceDownloadMutation,
  useEvidenceUrlQuery,
  useInstallationEvidenceQuery,
} from '@/hooks/useManagerInstallations'
import { isApiError } from '@/services/api/errors'
import type { InstallationEvidenceFileView } from '@/types/res/managerInstallationsRes'

// Ảnh nghiệm thu do kỹ thuật viên tải lên, theo từng lượt. Kho ảnh riêng tư: mỗi lần xem / tải xin một link có hạn ngắn
// từ backend và dùng ngay, không lưu link, không ghi log. Ảnh không tải được thì xin link mới đúng một lần

function useDownload(projectId: string) {
  const download = useEvidenceDownloadMutation(projectId)
  return {
    pendingId: download.isPending ? (download.variables ?? null) : null,
    start: async (evidenceId: string) => {
      try {
        const { url } = await download.mutateAsync(evidenceId)
        // Máy chủ đặt Content-Disposition: attachment nên trình duyệt tải tệp, trang không đổi
        window.location.assign(url)
      } catch (e) {
        toast.error(installationErrorMessage(e))
      }
    },
  }
}

function EvidenceViewer({
  projectId,
  item,
  onClose,
  onDownload,
  downloading,
}: {
  projectId: string
  item: InstallationEvidenceFileView
  onClose: () => void
  onDownload: () => void
  downloading: boolean
}) {
  const url = useEvidenceUrlQuery(projectId, item.evidenceId)
  const [retried, setRetried] = useState(false)
  const [broken, setBroken] = useState(false)
  const gone = isApiError(url.error) && url.error.status === 410

  return (
    <ModalDialog open onOpenChange={(open) => !open && onClose()} className="max-w-3xl" aria-label="Xem ảnh nghiệm thu">
      <DialogTitle>{item.caption || item.fileName}</DialogTitle>
      <p className="tnum mt-1 text-meta text-fg-2">
        Lượt {item.round}, thêm lúc {formatMoment(item.addedAt)}
      </p>
      <div className="mt-4">
        {url.isPending ? (
          <Skeleton className="aspect-[4/3] w-full" />
        ) : url.isError ? (
          <Notice tone={gone ? 'warn' : 'danger'} title="Không hiện được ảnh">
            {installationErrorMessage(url.error)}
          </Notice>
        ) : broken ? (
          <Notice tone="warn" title="Không hiện được ảnh">
            Link xem ảnh đã hết hạn hoặc không còn hợp lệ. Đóng rồi mở lại ảnh để thử lần nữa.
          </Notice>
        ) : (
          <img
            src={url.data.url}
            alt={item.caption || item.fileName}
            className="max-h-[65dvh] w-full rounded-container bg-surface-2 object-contain"
            onError={() => {
              if (retried) {
                setBroken(true)
                return
              }
              setRetried(true)
              void url.refetch()
            }}
          />
        )}
      </div>
      <DialogFooter>
        <Button icon="close" variant="secondary" onClick={onClose}>
          Đóng
        </Button>
        <Button variant="secondary" icon="download" disabled={downloading || gone} onClick={onDownload}>
          {downloading ? 'Đang chuẩn bị…' : 'Tải về'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function EvidencePanel({ projectId, currentRound }: { projectId: string; currentRound: number }) {
  const query = useInstallationEvidenceQuery(projectId)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const download = useDownload(projectId)
  const viewing = query.data?.find((item) => item.evidenceId === viewingId) ?? null

  return (
    <Panel>
      <PanelHeader
        title="Ảnh nghiệm thu"
        description={`Kỹ thuật viên tải ảnh theo từng lượt báo cáo hoàn thành. Lượt đang làm: ${currentRound}.`}
      />
      <PanelBody>
        <PanelQuery query={query}>
          {(items) => {
            if (items.length === 0) return <p className="text-body text-fg-2">Kỹ thuật viên chưa tải ảnh nào.</p>
            const rounds = [...new Set(items.map((item) => item.round))].sort((a, b) => b - a)
            return (
              <div className="space-y-5">
                {rounds.map((round) => (
                  <section key={round} aria-label={`Lượt ${round}`}>
                    <h3 className="mb-2 text-body font-semibold text-fg">Lượt {round}</h3>
                    <ul className="divide-y divide-line">
                      {items
                        .filter((item) => item.round === round)
                        .map((item) => (
                          <li
                            key={item.evidenceId}
                            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 first:pt-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium wrap-anywhere text-fg">{item.caption || item.fileName}</p>
                              <p className="tnum text-meta text-fg-2">
                                {[
                                  item.caption ? item.fileName : null,
                                  formatFileSize(item.sizeBytes),
                                  formatMoment(item.addedAt),
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                              {!item.downloadable && (
                                <p className="text-meta text-fg-2">Tệp không còn hợp lệ nên không xem được.</p>
                              )}
                            </div>
                            {item.downloadable && (
                              <div className="flex flex-wrap gap-3">
                                <Button
                                  icon="image"
                                  variant="info"
                                  size="sm"
                                  onClick={() => setViewingId(item.evidenceId)}
                                >
                                  Xem ảnh
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon="download"
                                  disabled={download.pendingId !== null}
                                  onClick={() => void download.start(item.evidenceId)}
                                >
                                  {download.pendingId === item.evidenceId ? 'Đang chuẩn bị…' : 'Tải về'}
                                </Button>
                              </div>
                            )}
                          </li>
                        ))}
                    </ul>
                  </section>
                ))}
              </div>
            )
          }}
        </PanelQuery>
      </PanelBody>
      {viewing && (
        <EvidenceViewer
          key={viewing.evidenceId}
          projectId={projectId}
          item={viewing}
          onClose={() => setViewingId(null)}
          downloading={download.pendingId === viewing.evidenceId}
          onDownload={() => void download.start(viewing.evidenceId)}
        />
      )}
    </Panel>
  )
}
