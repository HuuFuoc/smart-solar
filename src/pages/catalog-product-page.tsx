import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { KeyValueList } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { formatPower, formatSize, formatWarranty, isProductActive, productTypeLabel, specEntries } from '@/features/products/productDisplay'
import { useProductQuery } from '@/hooks/useProducts'
import { ROUTES } from '@/routes/paths'
import { formatMoney } from '@/utils/format'

/*
  Chi tiết một sản phẩm trong các portal (khách hàng, kinh doanh, kỹ thuật viên, quản lý), đọc GET /api/products/{id}.
  Đường quay lại danh mục nằm ở thanh định vị của shell, nên trang không có link "quay lại" riêng.
*/
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
        const specs = specEntries(p.spec)
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
              <div className="aspect-[4/3] overflow-hidden rounded-container bg-surface-2">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name ?? ''} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-meta text-fg-3">Chưa có ảnh</div>
                )}
              </div>
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
                      <KeyValueList items={specs.map((s, i) => ({ k: s.key || `Thông số ${i + 1}`, v: s.value }))} />
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

/* Khách xem sản phẩm xong thì bước kế tiếp là gửi đánh giá sơ bộ cho công trình của mình. */
export function CustomerCatalogProductPage() {
  return (
    <CatalogProductPage
      action={
        <ButtonLink to={ROUTES.customer.assessment} variant="primary">
          Gửi đánh giá sơ bộ
        </ButtonLink>
      }
    />
  )
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
