import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { KeyValueList } from '@/components/common/ui/lists'
import { CustomerProductCard } from '@/features/products/CustomerProductCard'
import { CustomerProductGallery } from '@/features/products/CustomerProductGallery'
import {
  formatPower,
  formatSize,
  formatWarranty,
  isProductActive,
  productTypeLabel,
  specDisplayEntries,
} from '@/features/products/productDisplay'
import { useProductsQuery } from '@/hooks/useProducts'
import { ROUTES, withId } from '@/routes/paths'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { formatMoney } from '@/utils/format'

export function CustomerProductDetail({
  product,
  listPath = ROUTES.customer.products,
  detailPattern = ROUTES.customer.product,
  action,
  backLink = false,
}: {
  product: ProductResponse
  listPath?: string
  detailPattern?: string
  action?: ReactNode
  /** Trang công khai không có nút quay lại của khung cổng */
  backLink?: boolean
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'specs'>('info')

  const brandModel = [product.brand?.trim(), product.model?.trim()].filter(Boolean).join(', ')
  const typeLabel = productTypeLabel(product.productType)
  const categoryLabel = product.category?.trim()
  const isDuplicateCategory = Boolean(
    categoryLabel && typeLabel && categoryLabel.toLowerCase() === typeLabel.toLowerCase(),
  )
  const unit = product.unit?.trim() || 'tấm'

  const specs = specDisplayEntries(product.spec).filter((s) => Boolean(s.value && s.value.trim() !== ''))

  // Bỏ dòng trống và dòng Nhóm hàng trùng Loại
  const basicFacts = [
    { k: 'Hãng sản xuất', v: product.brand?.trim() },
    { k: 'Model thiết bị', v: product.model?.trim() },
    { k: 'Loại sản phẩm', v: typeLabel },
    !isDuplicateCategory ? { k: 'Nhóm hàng', v: categoryLabel } : null,
    { k: 'Mã SKU', v: product.sku?.trim() },
    { k: 'Công suất định mức', v: formatPower(product.ratedPowerW) },
    { k: 'Kích thước', v: formatSize(product) },
    { k: 'Bảo hành thiết bị', v: formatWarranty(product.warrantyMonth) },
  ].filter((f): f is { k: string; v: string } => Boolean(f && f.v))

  const relatedQuery = useProductsQuery(
    {
      ProductType: product.productType || undefined,
      Page: 1,
      PageSize: 4,
    },
    { enabled: Boolean(product.productType) },
  )
  const relatedProducts = (relatedQuery.data?.items ?? [])
    .filter((p) => p.id !== product.id && isProductActive(p.status))
    .slice(0, 3)

  return (
    <div>
      {backLink && (
        <ButtonLink to={listPath} icon="arrow_back" size="sm" className="mb-4">
          Sản phẩm
        </ButtonLink>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="lg:sticky lg:top-4 lg:col-span-5">
          <CustomerProductGallery product={product} />
        </div>

        <div className="space-y-4 lg:col-span-7">
          <div>
            <p className="text-meta text-fg-2">{brandModel || '—'}</p>
            <h1 className="text-figure font-semibold text-fg">{product.name}</h1>
            {!isProductActive(product.status) && <Badge tone="warn">Đã ngừng bán</Badge>}
          </div>

          <div>
            <p className="tnum">
              <span className="text-figure font-semibold">{formatMoney(product.unitPrice, product.currency)}</span>
              <span className="text-fg-2"> / {unit}</span>
            </p>
            <p className="text-meta text-fg-2">Giá thiết bị, chưa gồm VAT và chi phí lắp đặt.</p>
          </div>

          {action}

          <div>
            <FilterChips
              label="Thông tin sản phẩm"
              className="mb-3"
              value={activeTab}
              onChange={setActiveTab}
              chips={[
                { value: 'info', label: 'Thông tin chung' },
                ...(specs.length > 0 ? [{ value: 'specs' as const, label: 'Thông số kỹ thuật' }] : []),
              ]}
            />
            <KeyValueList
              items={
                activeTab === 'info'
                  ? basicFacts
                  : specs.map((row, i) => ({ k: row.label || `Thông số ${i + 1}`, v: row.value }))
              }
            />
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-6 border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-title font-semibold">Sản phẩm tương tự</h2>
            <Link to={listPath} className="ui-link text-meta">
              Xem tất cả
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((p) => (
              <CustomerProductCard key={p.id} product={p} detailPath={(id) => withId(detailPattern, id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
