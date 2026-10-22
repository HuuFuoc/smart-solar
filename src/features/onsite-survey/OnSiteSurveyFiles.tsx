import { useEffect, useState } from 'react'
import { ONSITE_ATTACHMENT_CATEGORIES } from '@/common/onsiteSurvey'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { IconButton } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { errorMessage } from '@/services/api/errors'
import type { OnSiteSurveyAttachmentUrlView, OnSiteSurveyAttachmentView } from '@/types/res/technicianOnSiteSurveyRes'

// Ảnh và tài liệu của biên bản khảo sát, xếp theo loại. Kho tệp riêng tư nên mỗi tệp xin một link ký sẵn khi hiện;
// link chỉ nằm trong state của ô, không vào cache hay storage

/** Nơi gọi bọc bằng useCallback, nếu không mỗi lần vẽ lại sẽ xin link mới */
export type AttachmentUrlFetcher = (attachmentId: string) => Promise<OnSiteSurveyAttachmentUrlView>

function AttachmentTile({
  attachment,
  getUrl,
  onRemove,
  removing,
}: {
  attachment: OnSiteSurveyAttachmentView
  getUrl: AttachmentUrlFetcher
  onRemove?: (attachmentId: string) => void
  removing: boolean
}) {
  const [link, setLink] = useState<OnSiteSurveyAttachmentUrlView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getUrl(attachment.attachmentId).then(
      (view) => alive && setLink(view),
      (e: unknown) => alive && setError(errorMessage(e)),
    )
    return () => {
      alive = false
    }
  }, [attachment.attachmentId, getUrl])

  const isImage = link?.contentType.startsWith('image/') ?? true
  return (
    <figure className="relative space-y-1">
      {link && isImage ? (
        <a href={link.url} target="_blank" rel="noreferrer" className="block">
          <img
            src={link.url}
            alt={attachment.caption ?? 'Ảnh khảo sát'}
            className="aspect-4/3 w-full rounded-container border border-line object-cover"
          />
          <span className="sr-only"> (mở tab mới)</span>
        </a>
      ) : link ? (
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-container border border-line p-3 text-center text-meta text-fg-2 hover:bg-hover"
        >
          <Icon name="description" className="text-[24px] text-fg-3" />
          <span className="line-clamp-2 wrap-anywhere text-fg">{link.fileName}</span>
          <span className="sr-only"> (mở tab mới)</span>
        </a>
      ) : error ? (
        <p className="flex aspect-4/3 items-center justify-center rounded-container border border-line p-3 text-center text-meta text-fg-2">
          {error}
        </p>
      ) : (
        <Skeleton className="aspect-4/3 w-full" />
      )}
      <figcaption className="flex items-start justify-between gap-2">
        <span className="tnum min-w-0 text-meta text-fg-2">
          {attachment.caption ? `${attachment.caption}, ` : ''}
          {formatMoment(attachment.addedAt)}
        </span>
        {onRemove && (
          <IconButton
            icon="delete"
            label="Xoá tệp này"
            size="sm"
            variant="danger-quiet"
            className="-mt-1 -mr-1 shrink-0"
            disabled={removing}
            onClick={() => onRemove(attachment.attachmentId)}
          />
        )}
      </figcaption>
    </figure>
  )
}

export function OnSiteSurveyFiles({
  attachments,
  getUrl,
  onRemove,
  removingId,
  emptyText,
}: {
  attachments: OnSiteSurveyAttachmentView[]
  getUrl: AttachmentUrlFetcher
  /** Có thì mỗi tệp có nút xoá (chỉ khi biên bản chưa hoàn thành) */
  onRemove?: (attachmentId: string) => void
  removingId?: string | null
  emptyText: string
}) {
  if (attachments.length === 0) return <p className="text-body text-fg-2">{emptyText}</p>
  const known = new Set<string>(ONSITE_ATTACHMENT_CATEGORIES.map((c) => c.value))
  const groups: { value: string; label: string; items: OnSiteSurveyAttachmentView[] }[] = [
    ...ONSITE_ATTACHMENT_CATEGORIES.map(({ value, label }) => ({
      value,
      label,
      items: attachments.filter((a) => a.category === value),
    })),
    // Loại lạ (backend thêm sau) vẫn hiện, gom vào một nhóm riêng
    { value: 'OTHER', label: 'Khác', items: attachments.filter((a) => !known.has(a.category)) },
  ].filter((group) => group.items.length > 0)

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.value} aria-label={group.label}>
          <h4 className="mb-2 text-body font-medium text-fg">
            {group.label} <span className="tnum font-normal text-fg-2">({group.items.length})</span>
          </h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {group.items.map((attachment) => (
              <AttachmentTile
                key={attachment.attachmentId}
                attachment={attachment}
                getUrl={getUrl}
                onRemove={onRemove}
                removing={removingId === attachment.attachmentId}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
