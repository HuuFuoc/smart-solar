import { useState } from 'react'
import { primaryImageUrl, productImages } from '@/features/products/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { cx } from '@/utils/cx'

/** Ảnh chính thu nhỏ trong bảng sản phẩm; chưa có ảnh hoặc link hỏng thì giữ ô xám */
export function ProductThumb({ product, className }: { product: ProductResponse; className?: string }) {
  const image = primaryImageUrl(product)
  return (
    <div className={cx('shrink-0 overflow-hidden rounded-control bg-surface-2', className)}>
      {image && (
        <img
          // key theo link: đổi ảnh chính thì ảnh mới được tải lại dù link cũ từng lỗi
          key={image}
          src={image}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.hidden = true
          }}
          className="size-full object-cover"
        />
      )}
    </div>
  )
}

/** Ảnh lớn và hàng ảnh nhỏ để xem các ảnh khác của sản phẩm. Mở trang thì hiện ảnh chính */
export function ProductGallery({ product }: { product: ProductResponse }) {
  const images = productImages(product)
  const [selected, setSelected] = useState<string | null>(null)
  const current = images.find((image) => image.url === selected) ?? images.find((image) => image.isPrimary) ?? images[0]

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden rounded-container bg-surface-2">
        {current?.url ? (
          <img
            key={current.url}
            src={current.url}
            alt={current.altText || product.name || ''}
            // Link ảnh hỏng: giữ ô xám thay cho biểu tượng ảnh vỡ
            onError={(e) => {
              e.currentTarget.hidden = true
            }}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-meta text-fg-3">Chưa có ảnh</div>
        )}
      </div>
      {images.length > 1 && (
        <ul aria-label="Các ảnh của sản phẩm" className="flex flex-wrap gap-2">
          {images.map((image, i) => {
            const active = image === current
            return (
              <li key={image.id ?? image.url}>
                <button
                  type="button"
                  aria-label={`Xem ảnh ${i + 1}${image.altText ? `: ${image.altText}` : ''}`}
                  aria-pressed={active}
                  onClick={() => setSelected(image.url ?? null)}
                  className={cx(
                    'press block size-16 overflow-hidden rounded-control border-2 bg-surface-2',
                    active ? 'border-accent' : 'border-transparent hover:border-line-2',
                  )}
                >
                  <img
                    src={image.url ?? ''}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.hidden = true
                    }}
                    className="size-full object-cover"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
