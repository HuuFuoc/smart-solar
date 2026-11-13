import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { formatQuantity } from '@/features/quotations/quotationDisplay'
import type { EquipmentDifference } from '@/types/res/customerInstallationsRes'

// Tấm pin, inverter đã lắp khác hợp đồng (khác sản phẩm hoặc khác số lượng). Quản lý và khách dùng chung

const TYPE_LABELS: Record<string, string> = { SOLAR_PANEL: 'Tấm pin', INVERTER: 'Inverter' }

export function EquipmentDifferences({ items }: { items: EquipmentDifference[] }) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Thiết bị</Th>
          <Th className="text-right">Theo hợp đồng</Th>
          <Th className="text-right">Đã lắp</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((d, i) => (
          <Tr key={`${d.productId}-${i}`}>
            <Td label="Thiết bị">
              <p className="font-medium text-fg">{d.name || 'Sản phẩm ngoài danh mục'}</p>
              <p className="text-meta text-fg-2">{TYPE_LABELS[d.productType] ?? d.productType}</p>
            </Td>
            <Td label="Theo hợp đồng" className="tnum lg:text-right">
              {formatQuantity(d.contractedQuantity)}
            </Td>
            <Td label="Đã lắp" className="tnum lg:text-right">
              {d.installedQuantity}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}
