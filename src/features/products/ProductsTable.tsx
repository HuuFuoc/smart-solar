import { Badge } from '@/components/common/ui/badge'
import { Button, IconButton } from '@/components/common/ui/button'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { WithTooltip } from '@/components/common/ui/tooltip'
import {
  formatPower,
  formatSize,
  isProductActive,
  panelSpecGaps,
  productStatusMeta,
  productTypeLabel,
} from '@/features/products/productDisplay'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { formatMoney } from '@/utils/format'

// Bảng sản phẩm của /admin/products. Tấm pin thiếu công suất / kích thước thì báo ngay trong ô

export type ProductsTableProps = {
  products: ProductResponse[]
  onEdit: (product: ProductResponse) => void
  onToggleStatus: (product: ProductResponse) => void
  onDelete: (product: ProductResponse) => void
  /** Sản phẩm đang chờ đổi trạng thái (theo id), để khoá thao tác của đúng những dòng đó */
  busyIds?: ReadonlySet<string>
}

// Thao tác cuối dòng: Sửa, Ngừng bán, rồi Xoá sau vạch ngăn (chỉ đỏ khi rê chuột để cột không thành dải đỏ)
// Bảng xếp khối đến xl vì ở 1024px tên sản phẩm bị bóp quá hẹp
export function ProductsTable({ products, onEdit, onToggleStatus, onDelete, busyIds }: ProductsTableProps) {
  return (
    <Table stack="xl">
      <thead>
        <tr>
          <Th>Sản phẩm</Th>
          <Th className="hidden md:table-cell">Loại / nhóm</Th>
          {/* Từ xl đến 2xl gộp hãng và kích thước thành dòng phụ để bảng không tràn ngang, từ 2xl mỗi thứ một cột */}
          <Th className="hidden 2xl:table-cell">Hãng / model</Th>
          <Th className="text-right">Công suất</Th>
          <Th className="hidden text-right 2xl:table-cell">Kích thước</Th>
          <Th className="text-right">Đơn giá</Th>
          <Th>Trạng thái</Th>
          <Th className="text-right">
            <span className="sr-only">Thao tác</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => {
          const status = productStatusMeta(p.status)
          const gaps = panelSpecGaps(p)
          const active = isProductActive(p.status)
          const busy = Boolean(p.id && busyIds?.has(p.id))
          return (
            <Tr key={p.id ?? p.sku}>
              <Td label="Sản phẩm">
                <div className="flex items-center gap-3">
                  <div className="size-10 shrink-0 overflow-hidden rounded-control bg-surface-2">
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
                    <p className="font-medium text-fg">{p.name || '—'}</p>
                    <p className="tnum text-meta text-fg-3">{p.sku}</p>
                    {(p.brand || p.model) && (
                      <p className="hidden text-meta text-fg-3 xl:block 2xl:hidden">
                        {[p.brand, p.model].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </Td>
              <Td label="Loại / nhóm" className="hidden md:table-cell">
                {productTypeLabel(p.productType) ?? '—'}
                {/* Admin vẫn thấy mã loại vì bộ lọc và form dùng mã này */}
                <p className="text-meta text-fg-3">
                  {[productTypeLabel(p.productType) !== p.productType ? p.productType : null, p.category]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </Td>
              <Td label="Hãng / model" className="hidden 2xl:table-cell">
                {p.brand || '—'}
                {p.model && <p className="text-meta text-fg-3">{p.model}</p>}
              </Td>
              <Td label="Công suất" className="tnum text-right whitespace-nowrap">
                {gaps.power ? <Badge tone="danger">Thiếu công suất</Badge> : (formatPower(p.ratedPowerW) ?? '—')}
                {(gaps.size || formatSize(p)) && (
                  <div className="mt-1 hidden text-meta text-fg-3 xl:block 2xl:hidden">
                    <span className="sr-only">Kích thước </span>
                    {gaps.size ? <Badge tone="danger">Thiếu kích thước</Badge> : formatSize(p)}
                  </div>
                )}
              </Td>
              <Td label="Kích thước" className="tnum hidden text-right whitespace-nowrap 2xl:table-cell">
                {gaps.size ? <Badge tone="danger">Thiếu kích thước</Badge> : (formatSize(p) ?? '—')}
              </Td>
              <Td label="Đơn giá" className="tnum text-right whitespace-nowrap">
                <span>
                  {formatMoney(p.unitPrice, p.currency)}
                  {p.unit && <span className="text-fg-3"> / {p.unit}</span>}
                </span>
              </Td>
              <Td label="Trạng thái" className="whitespace-nowrap">
                <Badge tone={status.tone}>{status.label}</Badge>
              </Td>
              <Td label="Thao tác" className="text-right whitespace-nowrap">
                {/* Không dùng lề âm vì ô cuối sát mép bảng, lấn ra sẽ sinh thanh cuộn ngang */}
                <div className="inline-flex items-center gap-1">
                  <Button size="sm" icon="edit" aria-label={`Sửa ${p.name ?? ''}`} onClick={() => onEdit(p)}>
                    Sửa
                  </Button>
                  <WithTooltip label={busy ? 'Đang đổi…' : active ? 'Ngừng bán (ẩn khỏi danh mục)' : 'Mở bán lại'}>
                    {(tip) => (
                      <Button
                        size="sm"
                        variant="ghost"
                        bleed={false}
                        icon={active ? 'visibility_off' : 'visibility'}
                        aria-label={`${active ? 'Ngừng bán' : 'Mở bán lại'} ${p.name ?? ''}`}
                        disabled={busy}
                        onClick={() => onToggleStatus(p)}
                        {...tip}
                      >
                        {/* Chỉ ẩn chữ khi bảng chia cột mà còn hẹp (xl đến wide) */}
                        <span className="xl:max-wide:sr-only">
                          {busy ? 'Đang đổi…' : active ? 'Ngừng bán' : 'Mở bán lại'}
                        </span>
                      </Button>
                    )}
                  </WithTooltip>
                  <span aria-hidden className="mx-1 h-5 w-px bg-line" />
                  <IconButton
                    size="sm"
                    variant="danger-quiet"
                    icon="delete"
                    label={`Xoá ${p.name ?? ''}`}
                    tooltip="Xoá sản phẩm"
                    disabled={busy}
                    onClick={() => onDelete(p)}
                  />
                </div>
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}
