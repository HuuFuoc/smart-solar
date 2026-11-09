import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { ButtonLink } from '@/components/common/ui/button'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { CustomerProductDetail } from '@/features/products/CustomerProductDetail'
import { CustomerProductDetailSkeleton } from '@/features/products/CustomerProductDetailSkeleton'
import { useProductQuery } from '@/hooks/useProducts'
import { ROUTES } from '@/routes/paths'

// Chi tiết sản phẩm hiển thị chuẩn UI/UX hiện đại cho mọi role trong portal
function CatalogProductDetailPage({
  listPath,
  detailPattern,
  action,
}: {
  listPath: string
  detailPattern: string
  action?: ReactNode
}) {
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
          <ButtonLink to={listPath} variant="secondary">
            Quay lại danh sách sản phẩm
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <CustomerProductDetail
      product={query.data}
      listPath={listPath}
      detailPattern={detailPattern}
      action={action}
    />
  )
}

/* 1. Cổng khách hàng (Customer) */
export function CustomerCatalogProductPage() {
  return (
    <CatalogProductDetailPage
      listPath={ROUTES.customer.products}
      detailPattern={ROUTES.customer.product}
      action={
        <ButtonLink
          to={ROUTES.customer.assessment}
          variant="primary"
          icon="send"
          className="h-11 w-full justify-center rounded-lg text-body font-semibold shadow-sm"
        >
          Gửi đánh giá sơ bộ
        </ButtonLink>
      }
    />
  )
}

/* 2. Cổng vận hành (Ops) */
export function OpsCatalogProductPage() {
  return (
    <CatalogProductDetailPage
      listPath={ROUTES.ops.products}
      detailPattern={ROUTES.ops.product}
    />
  )
}

/* 3. Cổng kỹ thuật (Tech) */
export function TechCatalogProductPage() {
  return (
    <CatalogProductDetailPage
      listPath={ROUTES.tech.products}
      detailPattern={ROUTES.tech.product}
    />
  )
}

/* 4. Cổng quản lý (Manage) */
export function ManageCatalogProductPage() {
  return (
    <CatalogProductDetailPage
      listPath={ROUTES.manage.products}
      detailPattern={ROUTES.manage.product}
    />
  )
}
