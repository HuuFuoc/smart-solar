import { Link } from 'react-router'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ProductThumb } from '@/features/products/ProductGallery'
import { formatPower, formatSize, formatWarranty, productTypeLabel } from '@/features/products/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { formatMoney } from '@/utils/format'

// Danh mục sản phẩm dạng bảng để so thông số. Cả dòng bấm được nhờ link tên phủ dòng bằng ::after
export function CatalogTable({
  products,
  detailPath,
}: {
  products: ProductResponse[]
  detailPath: (id: string) => string
}) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Sản phẩm</Th>
          <Th className="hidden md:table-cell">Loại</Th>
          <Th className="text-right">Công suất</Th>
          <Th className="hidden lg:table-cell">Kích thước</Th>
          <Th className="hidden lg:table-cell">Bảo hành</Th>
          <Th className="text-right">Đơn giá</Th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <Tr key={p.id} className="group relative cursor-pointer">
            <Td label="Sản phẩm">
              <div className="flex items-center gap-3">
                <ProductThumb product={p} className="size-12" />
                <div className="min-w-0">
                  <Link
                    to={detailPath(p.id ?? '')}
                    className="font-medium text-fg underline-offset-4 after:absolute after:inset-0 group-hover:text-accent-fg group-hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="text-meta text-fg-3">{[p.brand, p.model].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            </Td>
            <Td label="Loại" className="hidden md:table-cell">
              {productTypeLabel(p.productType) ?? '—'}
              {p.category && <p className="text-meta text-fg-3">{p.category}</p>}
            </Td>
            <Td label="Công suất" className="tnum text-right whitespace-nowrap">
              {formatPower(p.ratedPowerW) ?? '—'}
            </Td>
            <Td label="Kích thước" className="tnum hidden whitespace-nowrap lg:table-cell">
              {formatSize(p) ?? '—'}
            </Td>
            <Td label="Bảo hành" className="hidden whitespace-nowrap lg:table-cell">
              {formatWarranty(p.warrantyMonth) ?? '—'}
            </Td>
            <Td label="Đơn giá" className="tnum text-right whitespace-nowrap">
              {/* Một cụm: ở dạng xếp khối (dưới lg) mỗi phần tử con của ô là một dòng lưới riêng. */}
              <span>
                {formatMoney(p.unitPrice, p.currency)}
                {p.unit && <span className="text-fg-3"> / {p.unit}</span>}
              </span>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}
