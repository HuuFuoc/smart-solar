import { Link, useParams } from 'react-router'
import { PUBLIC_WIDE_CONTAINER, TEXT_LINK, ctaClass } from '@/features/landing/classes'
import { CatalogError } from '@/features/products/CatalogError'
import { ProductGallery } from '@/features/products/ProductGallery'
import {
  formatPower,
  formatSize,
  formatWarranty,
  isProductActive,
  productTypeLabel,
  specDisplayEntries,
} from '@/features/products/productDisplay'
import { useProductQuery } from '@/hooks/useProducts'
import { ROUTES } from '@/routes/paths'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { cx } from '@/utils/cx'
import { formatMoney } from '@/utils/format'

/* /products/:id, chi tiết một sản phẩm, đọc GET /api/products/{id}. */
export function ProductDetailPage() {
  const { id } = useParams()
  const query = useProductQuery(id)

  return (
    <div className={cx('pt-4', PUBLIC_WIDE_CONTAINER)}>
      <Link to={ROUTES.products} className={cx(TEXT_LINK, 'inline-block py-2 ld-meta')}>
        Tất cả sản phẩm
      </Link>

      <div className="mt-2">
        {query.isError ? (
          <CatalogError error={query.error} onRetry={() => query.refetch()} />
        ) : query.isPending ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" aria-busy="true" aria-label="Đang tải">
            <div className="aspect-[4/3] animate-pulse rounded-container bg-surface-2 motion-reduce:animate-none" />
            <div className="h-64 animate-pulse rounded-container bg-surface-2 motion-reduce:animate-none" />
          </div>
        ) : (
          <ProductDetail product={query.data} />
        )}
      </div>
    </div>
  )
}

function ProductDetail({ product }: { product: ProductResponse }) {
  const facts = [
    { label: 'Hãng', value: product.brand },
    { label: 'Model', value: product.model },
    { label: 'Loại', value: productTypeLabel(product.productType) },
    { label: 'Nhóm hàng', value: product.category },
    { label: 'SKU', value: product.sku },
    { label: 'Công suất định mức', value: formatPower(product.ratedPowerW) },
    { label: 'Kích thước', value: formatSize(product) },
    { label: 'Bảo hành', value: formatWarranty(product.warrantyMonth) },
  ].filter((fact) => fact.value)
  const specs = specDisplayEntries(product.spec)

  return (
    <article className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <ProductGallery product={product} />

      <div>
        <p className="ld-meta text-fg-2">{[product.brand, productTypeLabel(product.productType)].filter(Boolean).join(', ')}</p>
        <h1 className="mt-1 ld-h2 text-fg">{product.name}</h1>
        {!isProductActive(product.status) && <p className="mt-3 ld-body font-semibold text-warn">Sản phẩm đã ngừng bán</p>}
        <p className="mt-3 ld-h2 text-fg">
          {formatMoney(product.unitPrice, product.currency)}
          {product.unit && <span className="ld-body font-normal text-fg-2"> / {product.unit}</span>}
        </p>
        <p className="mt-1 ld-meta text-fg-2">Giá tham khảo, chưa gồm lắp đặt. Giá chính thức có sau khi khảo sát.</p>
        <Link to={ROUTES.register} className={ctaClass('lg', 'mt-4 inline-flex')}>
          Nhận khảo sát
        </Link>

        <dl className="mt-6 divide-y divide-line border-y border-line">
          {facts.map((fact) => (
            <div key={fact.label} className="flex justify-between gap-6 py-2 ld-body">
              <dt className="text-fg-2">{fact.label}</dt>
              <dd className="text-right text-fg">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {specs.length > 0 && (
          <section className="mt-6">
            <h2 className="ld-sub text-fg">Thông số kỹ thuật</h2>
            <dl className="mt-2 divide-y divide-line border-y border-line">
              {specs.map((spec, i) => (
                <div key={spec.label || i} className="flex justify-between gap-6 py-2 ld-body">
                  {spec.label && <dt className="text-fg-2">{spec.label}</dt>}
                  <dd className="text-right text-fg">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </article>
  )
}
