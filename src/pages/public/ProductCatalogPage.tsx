import { ButtonLink } from '@/components/common/ui/button'
import { useAuth } from '@/context/AuthProvider'
import { PUBLIC_WIDE_CONTAINER } from '@/features/landing/classes'
import { surveyPath } from '@/features/landing/survey-link'
import { CatalogError } from '@/features/products/CatalogError'
import { ProductCatalogView } from '@/features/products/ProductCatalogView'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

// /products, danh mục công khai. Dùng chung lưới card hiện đại, hỗ trợ cả giao diện sáng và tối
export function ProductCatalogPage() {
  const { user } = useAuth()

  return (
    <div className={cx('pt-6 pb-8', PUBLIC_WIDE_CONTAINER)}>
      <header className="max-w-[60ch]">
        <h1 className="ld-h2 text-fg">Sản phẩm</h1>
        <p className="mt-1 ld-body text-fg-2">Tấm pin, inverter, pin lưu trữ và phụ kiện chúng tôi dùng cho công trình.</p>
      </header>

      <ProductCatalogView
        className="mt-5"
        detailPattern={ROUTES.product}
        renderError={(error, onRetry) => <CatalogError error={error} onRetry={onRetry} />}
        emptyTitle="Chưa có sản phẩm nào"
        emptyDescription="Kỹ thuật viên tư vấn thiết bị phù hợp khi đến khảo sát mái nhà của bạn."
        emptyAction={
          <ButtonLink to={surveyPath(user)} variant="primary" icon="assignment" className="mt-2">
            Đăng ký khảo sát
          </ButtonLink>
        }
      />
    </div>
  )
}
