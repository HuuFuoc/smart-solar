import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { ButtonLink } from '@/components/common/ui/button'
import { EmptyState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { CustomerProductDetail } from '@/features/products/CustomerProductDetail'
import { CustomerProductDetailSkeleton } from '@/features/products/CustomerProductDetailSkeleton'
import { useProductQuery } from '@/hooks/useProducts'
import { ROUTES } from '@/routes/paths'

// Chi tiết sản phẩm dùng chung cho các cổng
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
      <EmptyState
        title="Không tìm thấy sản phẩm"
        action={
          <ButtonLink to={listPath} variant="secondary" icon="arrow_back">
            Về danh sách sản phẩm
          </ButtonLink>
        }
      />
    )
  }

  return (
    <CustomerProductDetail product={query.data} listPath={listPath} detailPattern={detailPattern} action={action} />
  )
}

export function CustomerCatalogProductPage() {
  return (
    <CatalogProductDetailPage
      listPath={ROUTES.customer.products}
      detailPattern={ROUTES.customer.product}
      action={
        <ButtonLink to={ROUTES.customer.assessment} variant="primary" icon="send">
          Gửi đánh giá sơ bộ
        </ButtonLink>
      }
    />
  )
}

export function OpsCatalogProductPage() {
  return <CatalogProductDetailPage listPath={ROUTES.ops.products} detailPattern={ROUTES.ops.product} />
}

export function TechCatalogProductPage() {
  return <CatalogProductDetailPage listPath={ROUTES.tech.products} detailPattern={ROUTES.tech.product} />
}

export function ManageCatalogProductPage() {
  return <CatalogProductDetailPage listPath={ROUTES.manage.products} detailPattern={ROUTES.manage.product} />
}
