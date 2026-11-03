import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { formatDateTime } from '@/features/pre-surveys/preSurveyDisplay'
import { DeleteProductDialog } from '@/features/products/DeleteProductDialog'
import { ProductFormDialog } from '@/features/products/ProductFormDialog'
import { ProductGallery } from '@/features/products/ProductGallery'
import { ProductImagesDialog } from '@/features/products/ProductImagesDialog'
import { StopSellingDialog } from '@/features/products/StopSellingDialog'
import {
  formatPower,
  formatSize,
  formatWarranty,
  isProductActive,
  panelSpecGaps,
  productStatusMeta,
  productTypeLabel,
  specDisplayEntries,
} from '@/features/products/productDisplay'
import { useAdminProductQuery, useChangeProductStatusMutation } from '@/hooks/useProducts'
import { ROUTES } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { formatMoney } from '@/utils/format'

// Chi tiết sản phẩm của quản trị (GET /api/admin/products/{id}, mở được cả sản phẩm ngừng bán):
// ảnh, thông tin, thông số; sửa, ngừng bán / mở bán, xoá ở đầu trang. Ảnh sửa trong hộp thoại ảnh dùng chung với danh sách
export function AdminProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useAdminProductQuery(id)
  const statusMutation = useChangeProductStatusMutation()
  const [editing, setEditing] = useState(false)
  const [managingImages, setManagingImages] = useState(false)
  const [hiding, setHiding] = useState<ProductResponse | null>(null)
  const [deleting, setDeleting] = useState<ProductResponse | null>(null)
  usePageCrumb(query.data?.name)

  async function changeStatus(product: ProductResponse, status: 'ACTIVE' | 'INACTIVE') {
    if (!product.id) return
    try {
      await statusMutation.mutateAsync({ id: product.id, body: { status } })
      setHiding(null)
      toast.success(status === 'INACTIVE' ? `Đã ngừng bán ${product.name}` : `Đã mở bán lại ${product.name}`)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <QueryBoundary query={query}>
      {(p) => {
        const active = isProductActive(p.status)
        const status = productStatusMeta(p.status)
        const gaps = panelSpecGaps(p)
        const typeLabel = productTypeLabel(p.productType)
        const facts = [
          { k: 'Loại', v: typeLabel && typeLabel !== p.productType ? `${typeLabel} (${p.productType})` : typeLabel },
          { k: 'Nhóm hàng', v: p.category },
          { k: 'Hãng', v: p.brand },
          { k: 'Model', v: p.model },
          { k: 'Đơn vị tính', v: p.unit },
          { k: 'Công suất định mức', v: formatPower(p.ratedPowerW) },
          { k: 'Kích thước', v: formatSize(p) },
          { k: 'Bảo hành', v: formatWarranty(p.warrantyMonth) },
          { k: 'Sửa lần cuối', v: p.updatedAt ? formatDateTime(p.updatedAt) : null },
        ].filter((f) => f.v)
        const specs = specDisplayEntries(p.spec)
        const missing = [gaps.power && 'công suất', gaps.size && 'kích thước'].filter(Boolean).join(' và ')

        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="tnum">{p.sku}</span>
                </>
              }
              title={p.name || 'Sản phẩm chưa đặt tên'}
              description={
                <>
                  <span className="tnum font-semibold text-fg">{formatMoney(p.unitPrice, p.currency)}</span>
                  {p.unit && <span> / {p.unit}</span>}
                </>
              }
              actions={
                <>
                  <Button variant="info" icon="edit" onClick={() => setEditing(true)}>
                    Sửa
                  </Button>
                  {active ? (
                    <Button variant="warn" icon="pause_circle" onClick={() => setHiding(p)}>
                      Ngừng bán
                    </Button>
                  ) : (
                    <Button
                      variant="soft"
                      icon="play_circle"
                      disabled={statusMutation.isPending}
                      onClick={() => void changeStatus(p, 'ACTIVE')}
                    >
                      {statusMutation.isPending ? 'Đang mở bán…' : 'Mở bán lại'}
                    </Button>
                  )}
                  <Button variant="danger" icon="delete" onClick={() => setDeleting(p)}>
                    Xoá
                  </Button>
                </>
              }
            />

            {missing && (
              <Notice tone="danger" className="mb-6">
                Tấm pin thiếu {missing}, chưa dùng được cho mô phỏng bố trí. Bấm Sửa để bổ sung.
              </Notice>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Ảnh lớn như khách thấy */}
              <Panel>
                <PanelHeader
                  title="Ảnh sản phẩm"
                  action={
                    <Button size="sm" variant="soft" icon="photo_library" onClick={() => setManagingImages(true)}>
                      Quản lý ảnh
                    </Button>
                  }
                />
                <PanelBody>
                  <ProductGallery product={p} />
                </PanelBody>
              </Panel>
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

            <ProductFormDialog open={editing} product={p} onOpenChange={setEditing} />
            <ProductImagesDialog
              productId={managingImages && p.id ? p.id : null}
              productName={p.name ?? ''}
              onOpenChange={setManagingImages}
            />
            <StopSellingDialog
              product={hiding}
              busy={statusMutation.isPending}
              onConfirm={(product) => void changeStatus(product, 'INACTIVE')}
              onOpenChange={(open) => !open && setHiding(null)}
            />
            <DeleteProductDialog
              product={deleting}
              onOpenChange={(open) => !open && setDeleting(null)}
              onDeleted={() => navigate(ROUTES.admin.products, { replace: true })}
            />
          </>
        )
      }}
    </QueryBoundary>
  )
}
