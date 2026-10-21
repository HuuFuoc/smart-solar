import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import {
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  packageSaleMeta,
  visitMonthsLabel,
  isMaintenance,
} from '@/features/after-sales/afterSalesDisplay'
import type { PackageView } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'

const vnd = (amount: number | null) => formatMoney(amount, 'VND')

function Benefits({ p }: { p: PackageView }) {
  if (isMaintenance(p.kind))
    return (
      <>
        {p.visitMonths.length} lượt bảo trì
        <p className="tnum text-meta text-fg-3">Vào {visitMonthsLabel(p.visitMonths)}</p>
      </>
    )
  return (
    <>
      {disasterTypesLabel(p.coveredDisasterTypes)}
      <p className="tnum text-meta text-fg-3">
        Hỗ trợ {formatPercent(p.coveragePercent)}, tối đa {vnd(p.perIncidentLimit)} mỗi sự cố, {vnd(p.termLimit)} mỗi kỳ
      </p>
    </>
  )
}

// Bảng gói của /admin/packages. Thao tác cuối dòng: Sửa, rồi Ngừng bán (hỏi lại) hoặc Mở bán lại
export function PackageTable({
  items,
  busyIds,
  onEdit,
  onStop,
  onReopen,
}: {
  items: PackageView[]
  /** Gói đang chờ đổi trạng thái bán, để khoá đúng những dòng đó */
  busyIds: ReadonlySet<string>
  onEdit: (p: PackageView) => void
  onStop: (p: PackageView) => void
  onReopen: (p: PackageView) => void
}) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Gói</Th>
          <Th className="text-right">Giá</Th>
          <Th>Thời hạn</Th>
          <Th>Quyền lợi</Th>
          <Th>Trạng thái</Th>
          <Th className="text-right">
            <span className="sr-only">Thao tác</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {items.map((p) => {
          const sale = packageSaleMeta(p.isActive)
          const busy = busyIds.has(p.packageId)
          return (
            <Tr key={p.packageId}>
              <Td label="Gói">
                <p className="font-medium text-fg">{p.name}</p>
                {p.description && <p className="line-clamp-2 max-w-[56ch] text-meta text-fg-3">{p.description}</p>}
              </Td>
              <Td label="Giá" className="tnum text-right whitespace-nowrap">
                {vnd(p.price)}
              </Td>
              <Td label="Thời hạn" className="whitespace-nowrap">
                {formatDurationMonths(p.durationMonths)}
              </Td>
              <Td label="Quyền lợi">
                <Benefits p={p} />
              </Td>
              <Td label="Trạng thái" className="whitespace-nowrap">
                <Badge tone={sale.tone}>{sale.label}</Badge>
              </Td>
              <Td label="Thao tác" className="text-right whitespace-nowrap">
                <div className="inline-flex items-center gap-1">
                  <Button
                    variant="soft"
                    size="sm"
                    icon="edit"
                    aria-label={`Sửa ${p.name}`}
                    disabled={busy}
                    onClick={() => onEdit(p)}
                  >
                    Sửa
                  </Button>
                  {p.isActive ? (
                    <Button
                      size="sm"
                      variant="warn"
                      icon="visibility_off"
                      aria-label={`Ngừng bán ${p.name}`}
                      disabled={busy}
                      onClick={() => onStop(p)}
                    >
                      {busy ? 'Đang đổi…' : 'Ngừng bán'}
                    </Button>
                  ) : (
                    <Button
                      icon="play_circle"
                      size="sm"
                      variant="soft"
                      aria-label={`Mở bán lại ${p.name}`}
                      disabled={busy}
                      onClick={() => onReopen(p)}
                    >
                      {busy ? 'Đang mở bán…' : 'Mở bán lại'}
                    </Button>
                  )}
                </div>
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}
