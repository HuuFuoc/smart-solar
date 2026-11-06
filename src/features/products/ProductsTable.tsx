import { Link } from 'react-router'
import { Button, IconButton } from '@/components/common/ui/button'
import { WithTooltip } from '@/components/common/ui/tooltip'
import { ProductThumb } from '@/features/products/ProductGallery'
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
import { cx } from '@/utils/cx'

// Bảng sản phẩm của /admin/products. Tấm pin thiếu công suất / kích thước thì báo ngay trong ô, bấm tên mở trang chi tiết

export type ProductsTableProps = {
  products: ProductResponse[]
  detailPath: (id: string) => string
  onEdit: (product: ProductResponse) => void
  onToggleStatus: (product: ProductResponse) => void
  onDelete: (product: ProductResponse) => void
  /** Mở hộp thoại ảnh của sản phẩm */
  onImages: (product: ProductResponse) => void
  /** Sản phẩm đang chờ đổi trạng thái (theo id), để khoá thao tác của đúng những dòng đó */
  busyIds?: ReadonlySet<string>
}

export function ProductsTable({
  products,
  detailPath,
  onEdit,
  onToggleStatus,
  onDelete,
  onImages,
  busyIds,
}: ProductsTableProps) {
  return (
    <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-meta border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-fg-2 font-medium">
              <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">Sản phẩm</th>
              <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold hidden md:table-cell">
                Loại / Nhóm
              </th>
              <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold hidden 2xl:table-cell">
                Hãng / Model
              </th>
              <th className="py-3 px-3.5 border-r border-line text-right text-meta font-semibold">Công suất</th>
              <th className="py-3 px-3.5 border-r border-line text-right text-meta font-semibold hidden 2xl:table-cell">
                Kích thước
              </th>
              <th className="py-3 px-3.5 border-r border-line text-right text-meta font-semibold">Đơn giá</th>
              <th className="py-3 px-3.5 border-r border-line text-left text-meta font-semibold">Trạng thái</th>
              <th className="py-3 px-3.5 text-right text-meta font-semibold">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {products.map((p) => {
              const status = productStatusMeta(p.status)
              const gaps = panelSpecGaps(p)
              const active = isProductActive(p.status)
              const busy = Boolean(p.id && busyIds?.has(p.id))
              return (
                <tr key={p.id ?? p.sku} className="group hover:bg-surface-2/60 transition-colors">
                  {/* Cột 1: Sản phẩm */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top">
                    <div className="flex items-center gap-3">
                      <ProductThumb product={p} className="size-10 rounded-control border border-line/60" />
                      <div className="min-w-0">
                        {p.id ? (
                          <Link
                            to={detailPath(p.id)}
                            className="font-semibold text-fg hover:text-primary transition-colors hover:underline"
                          >
                            {p.name || '—'}
                          </Link>
                        ) : (
                          <p className="font-semibold text-fg">{p.name || '—'}</p>
                        )}
                        <p className="tnum text-[11px] text-fg-muted mt-0.5">{p.sku}</p>
                        {(p.brand || p.model) && (
                          <p className="hidden text-[11px] text-fg-muted xl:block 2xl:hidden">
                            {[p.brand, p.model].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cột 2: Loại / nhóm */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top hidden md:table-cell">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-2 border border-line text-fg">
                      {productTypeLabel(p.productType) ?? '—'}
                    </span>
                    <p className="text-[11px] text-fg-muted mt-1">
                      {[productTypeLabel(p.productType) !== p.productType ? p.productType : null, p.category]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </td>

                  {/* Cột 3: Hãng / model */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top hidden 2xl:table-cell">
                    <p className="font-medium text-fg">{p.brand || '—'}</p>
                    {p.model && <p className="text-[11px] text-fg-muted">{p.model}</p>}
                  </td>

                  {/* Cột 4: Công suất */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top tnum text-right whitespace-nowrap">
                    {gaps.power ? (
                      <span className="inline-flex text-xs text-danger font-medium">Thiếu công suất</span>
                    ) : (
                      <span className="font-medium text-fg">{formatPower(p.ratedPowerW) ?? '—'}</span>
                    )}
                    {(gaps.size || formatSize(p)) && (
                      <div className="mt-1 hidden text-[11px] text-fg-muted xl:block 2xl:hidden">
                        {gaps.size ? <span className="text-danger">Thiếu kích thước</span> : formatSize(p)}
                      </div>
                    )}
                  </td>

                  {/* Cột 5: Kích thước */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top tnum hidden text-right whitespace-nowrap 2xl:table-cell">
                    {gaps.size ? (
                      <span className="text-xs text-danger font-medium">Thiếu kích thước</span>
                    ) : (
                      (formatSize(p) ?? '—')
                    )}
                  </td>

                  {/* Cột 6: Đơn giá */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top tnum text-right whitespace-nowrap">
                    <span className="font-semibold text-fg">{formatMoney(p.unitPrice, p.currency)}</span>
                    {p.unit && <span className="text-fg-muted text-[12px]"> / {p.unit}</span>}
                  </td>

                  {/* Cột 7: Trạng thái */}
                  <td className="py-3.5 px-3.5 border-r border-line align-top whitespace-nowrap">
                    <span
                      className={cx(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                        status.tone === 'ok' ? 'bg-ok-soft text-ok border-ok/20' : 'bg-surface-3 text-fg-2 border-line',
                      )}
                    >
                      <span className={cx('size-1.5 rounded-full', status.tone === 'ok' ? 'bg-ok' : 'bg-fg-muted')} />
                      {status.label}
                    </span>
                  </td>

                  {/* Cột 8: Thao tác */}
                  <td className="py-3.5 px-3.5 align-top text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="soft"
                        size="sm"
                        icon="edit"
                        aria-label={`Sửa ${p.name ?? ''}`}
                        onClick={() => onEdit(p)}
                      >
                        Sửa
                      </Button>
                      <IconButton
                        size="sm"
                        icon="photo_library"
                        label={`Ảnh của ${p.name ?? ''}`}
                        tooltip="Ảnh sản phẩm"
                        onClick={() => onImages(p)}
                      />
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
