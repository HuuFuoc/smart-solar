import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { KeyValueList } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { CustomerProductDetail } from '@/features/products/CustomerProductDetail'
import { CustomerProductDetailSkeleton } from '@/features/products/CustomerProductDetailSkeleton'
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
import { formatMoney } from '@/utils/format'

// Chi tiết sản phẩm trong các portal quản trị / kỹ thuật (giữ nguyên bảng thông số chuẩn cho staff)
function CatalogProductPage({ action }: { action?: ReactNode }) {
  const { id } = useParams()
  const query = useProductQuery(id)
  usePageCrumb(query.data?.name)

  return (
    <QueryBoundary query={query}>
      {(p) => {
        const facts = [
          { k: 'Hãng', v: p.brand },
          { k: 'Model', v: p.model },
          { k: 'Loại', v: productTypeLabel(p.productType) ?? '—' },
          { k: 'Nhóm hàng', v: p.category },
          { k: 'SKU', v: p.sku },
          { k: 'Công suất định mức', v: formatPower(p.ratedPowerW) },
          { k: 'Kích thước', v: formatSize(p) },
          { k: 'Bảo hành', v: formatWarranty(p.warrantyMonth) },
        ].filter((f) => f.v)
        const specs = specDisplayEntries(p.spec)
        return (
          <>
            <PageHeader
              meta={
                <>
                  <span>{[p.brand, productTypeLabel(p.productType)].filter(Boolean).join(', ')}</span>
                  {!isProductActive(p.status) && <Badge tone="warn">Đã ngừng bán</Badge>}
                </>
              }
              title={p.name}
              description={
                <>
                  <span className="tnum font-semibold text-fg">{formatMoney(p.unitPrice, p.currency)}</span>
                  {p.unit && <span> / {p.unit}</span>}. Giá tham khảo, chưa gồm lắp đặt.
                </>
              }
              actions={action}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <ProductGallery product={p} />
              <div className="space-y-4">
                <Panel>
                  <PanelHeader title="Thông tin" />
                  <PanelBody>
                    <KeyValueList items={facts} />
                  </PanelBody>
                </Panel>
                {specs.length > 0 && (
                  <Panel>
                    <PanelHeader title="Thông số kỹ thuật" />
                    <PanelBody>
                      <KeyValueList items={specs.map((s, i) => ({ k: s.label || `Thông số ${i + 1}`, v: s.value }))} />
                    </PanelBody>
                  </Panel>
                )}
              </div>
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}

/* Trang chi tiết sản phẩm tối ưu UI/UX cho Cổng khách hàng */
export function CustomerCatalogProductPage() {
  const { id } = useParams()
  const query = useProductQuery(id)
  usePageCrumb(query.data?.name)

  if (query.isPending) {
    return <CustomerProductDetailSkeleton />
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-container border border-dashed border-line-2 px-6 py-12 text-center">
        <p className="text-body font-semibold text-fg">Không tìm thấy sản phẩm</p>
        <p className="mt-1 text-meta text-fg-2">
          {query.error?.message || 'Sản phẩm này có thể đã bị gỡ hoặc đường dẫn không chính xác.'}
        </p>
        <div className="mt-4 flex justify-center">
          <ButtonLink to={ROUTES.customer.products} variant="secondary">
            Quay lại danh sách sản phẩm
          </ButtonLink>
        </div>
      </div>
    )
  }

  return <CustomerProductDetail product={query.data} />
}

export function OpsCatalogProductPage() {
  return <CatalogProductPage />
}

export function TechCatalogProductPage() {
  return <CatalogProductPage />
}

export function ManageCatalogProductPage() {
  return <CatalogProductPage />
}
