import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Icon } from '@/components/common/stitch-ui/Icon'
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
import { cx } from '@/utils/cx'
import { formatMoney } from '@/utils/format'

interface SpecHighlight {
  icon: string
  label: string
  value: string
}

export function CustomerProductDetail({
  product,
  listPath = ROUTES.customer.products,
  detailPattern = ROUTES.customer.product,
  action,
}: {
  product: ProductResponse
  listPath?: string
  detailPattern?: string
  action?: ReactNode
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'specs'>('info')

  const brandModel = [product.brand?.trim(), product.model?.trim()].filter(Boolean).join(' · ')
  const typeLabel = productTypeLabel(product.productType)
  const categoryLabel = product.category?.trim()
  const isDuplicateCategory =
    Boolean(categoryLabel && typeLabel && categoryLabel.toLowerCase() === typeLabel.toLowerCase())
  const unit = product.unit?.trim() || 'tấm'

  // Thu thập thông số kỹ thuật chi tiết
  const rawSpecs = specDisplayEntries(product.spec)
  const specs = rawSpecs.filter((s) => Boolean(s.value && s.value.trim() !== ''))

  // Trích xuất các thông số nổi bật (Spec Highlights: công suất, hiệu suất, bảo hành, bảo hành công suất)
  const highlights: SpecHighlight[] = []

  const power = formatPower(product.ratedPowerW)
  if (power) {
    highlights.push({ icon: 'bolt', label: 'Công suất', value: power })
  }

  // Tìm hiệu suất trong spec (efficiency / hiệu suất)
  const efficiencyEntry = specs.find((s) => /hiệu suất|efficiency/i.test(s.label))
  if (efficiencyEntry) {
    let effVal = efficiencyEntry.value.trim()
    if (/^\d+(\.\d+)?$/.test(effVal)) effVal += '%'
    highlights.push({ icon: 'speed', label: 'Hiệu suất', value: effVal })
  }

  const warranty = formatWarranty(product.warrantyMonth)
  if (warranty) {
    highlights.push({ icon: 'verified_user', label: 'BH sản phẩm', value: warranty })
  }

  // Tìm bảo hành công suất / hiệu suất trong spec
  const powerWarrantyEntry = specs.find((s) =>
    /bảo hành.*(công suất|hiệu suất)|power.*warranty|linear.*warranty/i.test(s.label),
  )
  if (powerWarrantyEntry) {
    highlights.push({ icon: 'workspace_premium', label: 'BH công suất', value: powerWarrantyEntry.value.trim() })
  } else if (highlights.length < 3) {
    const size = formatSize(product)
    if (size) {
      highlights.push({ icon: 'straighten', label: 'Kích thước', value: size })
    }
  }

  // Dữ liệu bảng thông tin chung (bỏ dòng trùng lặp Loại = Nhóm hàng, ẩn dòng không có dữ liệu)
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

  // Lấy danh sách sản phẩm tương tự cùng danh mục
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
    <div className={cx('relative', action ? 'pb-24 lg:pb-0' : 'pb-8')}>
      {/* 1. Breadcrumb "Sản phẩm / [Tên]" */}
      <nav aria-label="Đường dẫn trang" className="mb-5 flex items-center gap-1.5 text-meta text-fg-3">
        <Link
          to={listPath}
          className="inline-flex items-center gap-1 font-medium text-fg-2 hover:text-accent transition-colors"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          <span>Sản phẩm</span>
        </Link>
        <span className="text-fg-3/50">/</span>
        <span className="truncate max-w-[220px] sm:max-w-md font-medium text-fg" aria-current="page">
          {product.name}
        </span>
      </nav>

      {/* 2. Bố cục Desktop 2 cột (ảnh 5/12, thông tin 7/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Cột ảnh 5/12 - sticky trên màn hình desktop */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 self-start space-y-3">
          <CustomerProductGallery product={product} />
        </div>

        {/* Cột thông tin 7/12 */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Tên & Hãng Model */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-meta font-medium text-fg-3">
                {brandModel || '—'}
              </p>
              {!isProductActive(product.status) && (
                <Badge tone="warn">Đã ngừng bán</Badge>
              )}
            </div>
            <h1 className="mt-1.5 text-title sm:text-2xl font-bold text-fg leading-snug">
              {product.name}
            </h1>
          </div>

          {/* Khối giá cỡ lớn màu xanh thương hiệu */}
          <div className="rounded-xl border border-line bg-surface-2/40 p-4 sm:p-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-accent">
                {formatMoney(product.unitPrice, product.currency)}
              </span>
              <span className="text-body text-fg-3 font-normal">
                / {unit}
              </span>
            </div>
            <p className="mt-1.5 text-meta text-fg-3">
              Giá tham khảo thiết bị, chưa bao gồm thuế VAT và chi phí thi công lắp đặt thực tế.
            </p>
          </div>

          {/* Nút CTA (nếu có action truyền vào, ví dụ 'Gửi đánh giá sơ bộ' của khách hàng) */}
          {action && <div>{action}</div>}

          {/* Hàng 3-4 ô spec highlight */}
          {highlights.length > 0 && (
            <div className={cx('grid gap-3', highlights.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')}>
              {highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center rounded-xl border border-line bg-canvas p-3 sm:p-3.5 text-center shadow-xs"
                >
                  <Icon name={h.icon} className="text-xl text-accent mb-1" />
                  <span className="text-body font-bold text-fg truncate max-w-full">{h.value}</span>
                  <span className="text-[12px] text-fg-3 mt-0.5">{h.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Khối thông số chi tiết (gộp với tabs và zebra striping) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 border-b border-line pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={cx(
                  'rounded-lg px-3 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  activeTab === 'info'
                    ? 'bg-accent text-on-accent'
                    : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                )}
              >
                Thông tin chung ({basicFacts.length})
              </button>
              {specs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={cx(
                    'rounded-lg px-3 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    activeTab === 'specs'
                      ? 'bg-accent text-on-accent'
                      : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  Thông số kỹ thuật ({specs.length})
                </button>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-canvas">
              <div className="divide-y divide-line">
                {activeTab === 'info' ? (
                  basicFacts.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 text-body odd:bg-surface-2/40"
                    >
                      <span className="text-meta sm:text-body text-fg-3 shrink-0">{row.k}</span>
                      <span className="text-meta sm:text-body font-medium text-fg text-right">{row.v}</span>
                    </div>
                  ))
                ) : (
                  specs.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 px-4 py-2.5 text-body odd:bg-surface-2/40"
                    >
                      <span className="text-meta sm:text-body text-fg-3 shrink-0">{row.label || `Thông số ${idx + 1}`}</span>
                      <span className="text-meta sm:text-body font-medium text-fg text-right">{row.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sản phẩm tương tự ở cuối trang (nếu có dữ liệu) */}
      {relatedProducts.length > 0 && (
        <section className="mt-14 pt-8 border-t border-line">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-title font-bold text-fg">Sản phẩm tương tự</h2>
            <Link
              to={listPath}
              className="text-meta font-medium text-accent hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {relatedProducts.map((p) => (
              <CustomerProductCard
                key={p.id}
                product={p}
                detailPath={(id) => withId(detailPattern, id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. Mobile Sticky Bottom Bar (khi có action như nút đánh giá của khách hàng) */}
      {action && (
        <div className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-canvas/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
          <div className="min-w-0">
            <p className="text-meta text-fg-3 truncate max-w-[160px]">{product.name}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-title font-bold text-accent">
                {formatMoney(product.unitPrice, product.currency)}
              </span>
              <span className="text-[12px] text-fg-3">/ {unit}</span>
            </div>
          </div>
          <div className="shrink-0">{action}</div>
        </div>
      )}
    </div>
  )
}
