import { Link } from 'react-router'
import { ROUTES, withId } from '@/routes/paths'
import { formatMoney } from '@/utils/format'
import { formatPower, formatWarranty, productTypeLabel } from '@/features/products/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'

/* Một ô trong lưới /products. Cả thẻ là link tới trang chi tiết. */
export function ProductCard({ product }: { product: ProductResponse }) {
  const facts = [formatPower(product.ratedPowerW), formatWarranty(product.warrantyMonth) && `Bảo hành ${formatWarranty(product.warrantyMonth)}`].filter(
    Boolean,
  )
  return (
    <Link
      to={withId(ROUTES.product, product.id ?? '')}
      className="group flex h-full flex-col overflow-hidden rounded-container border border-line bg-canvas transition-colors hover:border-line-2"
    >
      <div className="aspect-[4/3] overflow-hidden bg-surface-2">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name ?? ''}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full items-center justify-center ld-meta text-fg-3">Chưa có ảnh</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="ld-meta text-fg-2">
          {[product.brand, productTypeLabel(product.productType)].filter(Boolean).join(', ')}
        </p>
        <h2 className="ld-body font-semibold text-fg group-hover:underline">{product.name}</h2>
        {facts.length > 0 && <p className="ld-meta text-fg-2">{facts.join(', ')}</p>}
        <p className="mt-auto pt-3 ld-body font-semibold text-fg">
          {formatMoney(product.unitPrice, product.currency)}
          {product.unit && <span className="font-normal text-fg-2"> / {product.unit}</span>}
        </p>
      </div>
    </Link>
  )
}
