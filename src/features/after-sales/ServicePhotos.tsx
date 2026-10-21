import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/common/ui/states'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { errorMessage } from '@/services/api/errors'
import type { ServiceEvidenceUrlView, ServiceEvidenceView } from '@/types/res/customerAfterSalesRes'

// Ảnh của yêu cầu / buổi hẹn. Kho ảnh riêng tư nên mỗi ảnh xin một link ký sẵn khi hiện; link chỉ giữ trong state

/** Nơi gọi bọc bằng useCallback, nếu không mỗi lần vẽ lại sẽ xin link mới */
export type PhotoUrlFetcher = (evidenceId: string) => Promise<ServiceEvidenceUrlView>

function Photo({ photo, getUrl }: { photo: ServiceEvidenceView; getUrl: PhotoUrlFetcher }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getUrl(photo.evidenceId).then(
      (view) => alive && setUrl(view.url),
      (e: unknown) => alive && setError(errorMessage(e)),
    )
    return () => {
      alive = false
    }
  }, [photo.evidenceId, getUrl])

  return (
    <figure className="space-y-1">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt={photo.caption ?? 'Ảnh hiện trường'}
            className="aspect-4/3 w-full rounded-container border border-line object-cover"
          />
        </a>
      ) : error ? (
        <p className="flex aspect-4/3 items-center justify-center rounded-container border border-line p-3 text-center text-meta text-fg-2">
          {error}
        </p>
      ) : (
        <Skeleton className="aspect-4/3 w-full" />
      )}
      <figcaption className="tnum text-meta text-fg-2">
        {photo.caption ? `${photo.caption}, ` : ''}
        {formatMoment(photo.addedAt)}
      </figcaption>
    </figure>
  )
}

export function ServicePhotos({
  photos,
  getUrl,
  emptyText,
}: {
  photos: ServiceEvidenceView[]
  getUrl: PhotoUrlFetcher
  emptyText: string
}) {
  if (photos.length === 0) return <p className="text-body text-fg-2">{emptyText}</p>
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {photos.map((photo) => (
        <Photo key={photo.evidenceId} photo={photo} getUrl={getUrl} />
      ))}
    </div>
  )
}
