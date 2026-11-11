import { useEffect, useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { productImages } from '@/features/products/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { cx } from '@/utils/cx'

export function CustomerProductGallery({ product }: { product: ProductResponse }) {
  const images = productImages(product)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [imgError, setImgError] = useState(false)

  const current =
    images.find((image) => image.url === selectedUrl) ??
    images.find((image) => image.isPrimary) ??
    images[0]

  // Đóng lightbox bằng phím ESC
  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen])

  return (
    <div className="space-y-3">
      {/* Khung ảnh chính tỉ lệ 4:3, bo 12px, có padding, object-contain */}
      <div
        className={cx(
          'group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-surface-2 p-4 sm:p-6',
          'flex items-center justify-center transition-colors',
          current?.url && !imgError && 'cursor-zoom-in hover:border-line-2',
        )}
        onClick={() => {
          if (current?.url && !imgError) setLightboxOpen(true)
        }}
      >
        {current?.url && !imgError ? (
          <>
            <img
              key={current.url}
              src={current.url}
              alt={current.altText || product.name || 'Ảnh sản phẩm'}
              loading="lazy"
              onError={() => setImgError(true)}
              className="max-h-full max-w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
            />
            {/* Nút gợi ý phóng to */}
            <span
              aria-hidden="true"
              className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-lg bg-canvas/80 text-fg-2 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100"
            >
              <Icon name="zoom_in" className="text-[18px]" />
            </span>
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-fg-3">
            <Icon name="solar_power" className="text-4xl opacity-35" />
            <span className="text-meta">Chưa có ảnh</span>
          </div>
        )}
      </div>

      {/* Dải thumbnail nếu có nhiều hơn 1 ảnh */}
      {images.length > 1 && (
        <ul aria-label="Danh sách ảnh thu nhỏ" className="flex flex-wrap gap-2 pt-1">
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
                    'press block size-16 sm:size-18 overflow-hidden rounded-lg border-2 bg-surface-2 p-1 transition-all',
                    active ? 'border-accent ring-1 ring-accent' : 'border-line hover:border-line-2',
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

      {/* Lightbox phóng to ảnh thuần React */}
      {lightboxOpen && current?.url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Đóng ảnh phóng to"
          >
            <Icon name="close" className="text-[24px]" />
          </button>
          <img
            src={current.url}
            alt={current.altText || product.name || 'Ảnh phóng to'}
            className="max-h-[88vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

