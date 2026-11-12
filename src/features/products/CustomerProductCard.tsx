import { useState } from 'react'
import { Link } from 'react-router'
import { formatPower, formatSize, formatWarranty, primaryImageUrl } from '@/features/products/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { formatMoney } from '@/utils/format'

export function CustomerProductCard({
  product,
  detailPath,
}: {
  product: ProductResponse
  detailPath: (id: string) => string
}) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = primaryImageUrl(product)

  const brandModel = [product.brand?.trim(), product.model?.trim()].filter(Boolean).join(', ')
  const warranty = formatWarranty(product.warrantyMonth)
  const specs = [formatPower(product.ratedPowerW), warranty && `bảo hành ${warranty}`, formatSize(product)]
    .filter(Boolean)
    .join(', ')
  const unit = product.unit?.trim() || 'tấm'

  return (
    <Link
      to={detailPath(product.id ?? '')}
      className="group flex h-full flex-col overflow-hidden rounded-container border border-line bg-canvas no-underline hover:border-line-2"
    >
      <div className="flex aspect-4/3 w-full items-center justify-center overflow-hidden bg-surface-2 p-4">
        {imageUrl && !imgError ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={product.name ?? ''}
            loading="lazy"
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-meta text-fg-2">Chưa có ảnh</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="truncate text-meta text-fg-2">{brandModel || '—'}</p>
        <h3 className="line-clamp-2 text-body font-semibold text-fg group-hover:text-accent-fg">{product.name}</h3>
        {specs && <p className="tnum text-meta text-fg-2">{specs}</p>}
        <p className="tnum mt-auto border-t border-line pt-3">
          <span className="text-title font-semibold text-fg">{formatMoney(product.unitPrice, product.currency)}</span>
          <span className="text-meta text-fg-2"> / {unit}</span>
        </p>
      </div>
    </Link>
  )
}
