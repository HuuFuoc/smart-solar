import { useParams } from 'react-router'
import { ButtonLink } from '@/components/common/ui/button'
import { useAuth } from '@/context/AuthProvider'
import { PUBLIC_WIDE_CONTAINER } from '@/features/landing/classes'
import { CatalogError } from '@/features/products/CatalogError'
import { CustomerProductDetail } from '@/features/products/CustomerProductDetail'
import { CustomerProductDetailSkeleton } from '@/features/products/CustomerProductDetailSkeleton'
import { useProductQuery } from '@/hooks/useProducts'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

/* /products/:id, chi tiết một sản phẩm công khai, áp dụng chuẩn giao diện 2 cột hiện đại */
export function ProductDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const query = useProductQuery(id)

  const action = !user ? (
    <ButtonLink
      to={ROUTES.register}
      variant="primary"
      icon="assignment"
    >
      Nhận khảo sát
    </ButtonLink>
  ) : user.role === 'customer' ? (
    <ButtonLink
      to={ROUTES.customer.assessment}
      variant="primary"
      icon="send"
    >
      Gửi đánh giá sơ bộ
    </ButtonLink>
  ) : undefined

  return (
    <div className={cx('pt-6 pb-8', PUBLIC_WIDE_CONTAINER)}>
      {query.isPending ? (
        <CustomerProductDetailSkeleton />
      ) : query.isError || !query.data ? (
        <div className="space-y-4">
          <CatalogError error={query.error} onRetry={() => query.refetch()} />
          <div className="flex justify-center">
            <ButtonLink to={ROUTES.products} variant="secondary" icon="arrow_back">
              Quay lại danh sách sản phẩm
            </ButtonLink>
          </div>
        </div>
      ) : (
        <CustomerProductDetail
          product={query.data}
          listPath={ROUTES.products}
          detailPattern={ROUTES.product}
          action={action}
          backLink
        />
      )}
    </div>
  )
}
