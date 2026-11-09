import { useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { formatPower, formatSize, formatWarranty, primaryImageUrl } from '@/features/products/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { formatMoney } from '@/utils/format'
import { cx } from '@/utils/cx'

export function CustomerProductCard({
  product,
  detailPath,
}: {
  product: ProductResponse
  detailPath: (id: string) => string
}) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = primaryImageUrl(product)

  const brandModel = [product.brand?.trim(), product.model?.trim()].filter(Boolean).join(' · ')
  const power = formatPower(product.ratedPowerW)
  const warranty = formatWarranty(product.warrantyMonth)
  const size = formatSize(product)
  const unit = product.unit?.trim() || 'tấm'

  return (
    <Link
      to={detailPath(product.id ?? '')}
      className={cx(
        'group relative flex flex-col h-full rounded-xl border border-line bg-canvas overflow-hidden no-underline transition-all duration-200',
        'hover:-translate-y-1 hover:border-line-2 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      {/* Khung ảnh 4:3 nền xám nhạt */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2 p-3 sm:p-4 flex items-center justify-center">
        {imageUrl && !imgError ? (
          <img
            key={imageUrl}
            src={imageUrl}
            alt={product.name ?? ''}
            loading="lazy"
            onError={() => setImgError(true)}
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-fg-3">
            <Icon name="solar_power" className="text-3xl opacity-35" />
            <span className="text-meta">Chưa có ảnh</span>
          </div>
        )}
      </div>

      {/* Nội dung chi tiết */}
      <div className="flex flex-1 flex-col p-4">
        {/* Hãng · Model */}
        <p className="text-meta text-fg-3 truncate">
          {brandModel || '—'}
        </p>

        {/* Tên sản phẩm tối đa 2 dòng, đậm, không gạch chân */}
        <h3 className="mt-1 line-clamp-2 text-body font-semibold text-fg transition-colors group-hover:text-accent">
          {product.name}
        </h3>

        {/* Hàng chip thông số (Công suất, Bảo hành) */}
        {(power || warranty) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {power && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-meta font-medium text-fg-2">
                <Icon name="bolt" className="text-[14px] text-amber-500" />
                {power}
              </span>
            )}
            {warranty && (
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-meta font-medium text-fg-2">
                <Icon name="verified_user" className="text-[14px] text-accent" />
                {warranty}
              </span>
            )}
          </div>
        )}

        {/* Kích thước ở dòng phụ nhỏ */}
        {size && (
          <p className="mt-2 flex items-center gap-1 text-meta text-fg-3">
            <Icon name="straighten" className="text-[14px] shrink-0 text-fg-3/80" />
            <span>{size}</span>
          </p>
        )}

        {/* Đơn giá cỡ chữ lớn nhất màu xanh thương hiệu */}
        <div className="mt-auto pt-3 border-t border-line/60 flex items-baseline gap-1">
          <span className="text-title font-bold text-accent">
            {formatMoney(product.unitPrice, product.currency)}
          </span>
          <span className="text-meta text-fg-3">/ {unit}</span>
        </div>
      </div>
    </Link>
  )
}

