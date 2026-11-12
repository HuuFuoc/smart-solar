import { useState } from 'react'
import { IconButton } from '@/components/common/ui/button'
import { ModalDialog } from '@/components/common/ui/dialog'
import { productImages } from '@/features/products/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { cx } from '@/utils/cx'

export function CustomerProductGallery({ product }: { product: ProductResponse }) {
  const images = productImages(product)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const [imgError, setImgError] = useState(false)

  const current =
    images.find((image) => image.url === selectedUrl) ?? images.find((image) => image.isPrimary) ?? images[0]
  const alt = current?.altText || product.name || 'Ảnh sản phẩm'
  const canZoom = Boolean(current?.url && !imgError)

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!canZoom}
        aria-label={canZoom ? 'Xem ảnh lớn' : undefined}
        onClick={() => setZoomed(true)}
        className="flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-container border border-line bg-surface-2 p-4 enabled:cursor-zoom-in enabled:hover:border-line-2"
      >
        {canZoom ? (
          <img
            key={current!.url}
            src={current!.url!}
            alt={alt}
            loading="lazy"
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-meta text-fg-2">Chưa có ảnh</span>
        )}
      </button>

      {images.length > 1 && (
        <ul aria-label="Ảnh khác" className="flex flex-wrap gap-2">
          {images.map((image, i) => {
            const active = (image.url ?? '') === (current?.url ?? '')
            return (
              <li key={image.id ?? image.url ?? i}>
                <button
                  type="button"
                  aria-label={`Xem ảnh ${i + 1}${image.altText ? `: ${image.altText}` : ''}`}
                  aria-pressed={active}
                  onClick={() => {
                    setSelectedUrl(image.url ?? null)
                    setImgError(false)
                  }}
                  className={cx(
                    'press block size-16 overflow-hidden rounded-control border bg-surface-2 p-1',
                    active ? 'border-accent-line' : 'border-line hover:border-line-2',
                  )}
                >
                  <img
                    src={image.url ?? ''}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.hidden = true
                    }}
                    className="size-full object-contain"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <ModalDialog open={zoomed} onOpenChange={setZoomed} aria-label="Ảnh sản phẩm" className="max-w-5xl p-4">
        <div className="mb-2 flex justify-end">
          <IconButton icon="close" label="Đóng" onClick={() => setZoomed(false)} />
        </div>
        {current?.url && <img src={current.url} alt={alt} className="mx-auto max-h-[80vh] object-contain" />}
      </ModalDialog>
    </div>
  )
}
