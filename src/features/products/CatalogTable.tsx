import { Link } from 'react-router'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { formatPower, formatSize, formatWarranty, productTypeLabel } from '@/features/products/components/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { formatMoney } from '@/utils/format'

/*
  Danh mục sản phẩm trong portal khách hàng và kinh doanh (bộ portal kit). Bảng thay vì lưới thẻ như
  trang công khai: ở đây người dùng so thông số giữa các sản phẩm, không duyệt ảnh.
  Cả dòng bấm được (link tên sản phẩm phủ cả dòng bằng ::after): rê chuột thì dòng tô nền, con trỏ thành bàn tay, tên
  chuyển màu thương hiệu + gạch chân. Lúc nghỉ tên giữ màu chữ chính, không tô xanh cả cột chỉ để báo "đây là link".
  Bàn phím vẫn Tab tới đúng link tên sản phẩm.
*/
export function CatalogTable({ products, detailPath }: { products: ProductResponse[]; detailPath: (id: string) => string }) {
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
                <div className="size-12 shrink-0 overflow-hidden rounded-control bg-surface-2">
                  {p.imageUrl && (
                    <img
                      // key theo link: sửa link ảnh thì ảnh mới được tải lại dù link cũ từng lỗi.
                      key={p.imageUrl}
                      src={p.imageUrl}
                      alt=""
                      loading="lazy"
                      // Link ảnh hỏng: ẩn ảnh, giữ ô xám làm chỗ trống thay cho biểu tượng ảnh vỡ.
                      onError={(e) => {
                        e.currentTarget.hidden = true
                      }}
                      className="size-full object-cover"
                    />
                  )}
                </div>
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
