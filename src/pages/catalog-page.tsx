import { PageHeader } from '@/components/common/ui/page-header'
import { ProductCatalogView } from '@/features/products/ProductCatalogView'
import { ROUTES } from '@/routes/paths'

// Danh mục sản phẩm trong các portal. Hiển thị dạng lưới card hiện đại cho mọi role
function CatalogPage({ detailPattern }: { detailPattern: string }) {
  return (
    <>
      <PageHeader title="Sản phẩm" />
      <ProductCatalogView detailPattern={detailPattern} />
    </>
  )
}

export function CustomerCatalogPage() {
  return <CatalogPage detailPattern={ROUTES.customer.product} />
}

export function OpsCatalogPage() {
  return <CatalogPage detailPattern={ROUTES.ops.product} />
}

export function TechCatalogPage() {
  return <CatalogPage detailPattern={ROUTES.tech.product} />
}

export function ManageCatalogPage() {
  return <CatalogPage detailPattern={ROUTES.manage.product} />
}
