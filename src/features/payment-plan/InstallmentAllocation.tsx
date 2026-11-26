import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { installmentAllocations } from '@/features/payment-plan/bundledContractRules'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import type { ContractPaymentPlanView, InstallmentAllocation } from '@/types/res/paymentPlanRes'

// Phần chia của hai đợt 30/70 cho chi phí lắp đặt và gói dịch vụ đi kèm (backend 763cb0b, `allocation` chốt lúc lập hợp đồng). Chỉ
// để đọc: số tiền thanh toán của mỗi đợt là `amount` của đợt đó, đã gồm gói, không có khoản thu riêng cho gói. Hợp đồng không có gói
// thì không vẽ gì

/** Bảng hai đợt của trang hợp đồng */
export function InstallmentAllocationTable({
  plan,
  variant = 'plain',
}: {
  plan: Pick<ContractPaymentPlanView, 'installments'>
  variant?: 'plain' | 'card'
}) {
  const rows = installmentAllocations(plan)
  if (!rows) return null
  const maintenance = rows.some((r) => r.maintenance > 0)
  const disaster = rows.some((r) => r.disaster > 0)
  const table = (
    <Table stack>
      <thead>
        <tr>
          <Th>Đợt</Th>
          <Th className="text-right">Chi phí lắp đặt</Th>
          {maintenance && <Th className="text-right">Gói bảo trì</Th>}
          {disaster && <Th className="text-right">Gói bảo vệ thiên tai</Th>}
          <Th className="text-right">Số tiền thanh toán</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.sequence}>
            <Td label="Đợt" className="font-medium text-fg">
              Thanh toán đợt {r.sequence} ({r.percent.toLocaleString('vi-VN')}%)
            </Td>
            <Td label="Chi phí lắp đặt" className="tnum lg:text-right">
              {formatVnd(r.installation)}
            </Td>
            {maintenance && (
              <Td label="Gói bảo trì" className="tnum lg:text-right">
                {formatVnd(r.maintenance)}
              </Td>
            )}
            {disaster && (
              <Td label="Gói bảo vệ thiên tai" className="tnum lg:text-right">
                {formatVnd(r.disaster)}
              </Td>
            )}
            <Td label="Số tiền thanh toán" className="tnum font-semibold text-fg lg:text-right">
              {formatVnd(r.amount)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
  return (
    <section aria-labelledby="installment-allocation" className="space-y-2">
      <h3 id="installment-allocation" className="text-body font-semibold text-fg">
        Phân bổ theo đợt
      </h3>
      {variant === 'card' ? <div className="ct-table">{table}</div> : table}
      <p className="text-meta text-fg-2">
        Số tiền thanh toán của mỗi đợt đã gồm gói dịch vụ đi kèm; không có khoản thu riêng cho gói.
      </p>
    </section>
  )
}

/** Một dòng dưới số tiền của đợt đang thanh toán: đợt này gồm những gì (chỉ đọc, số phải trả vẫn là số của đợt) */
export function AllocationNote({ allocation }: { allocation: InstallmentAllocation | null | undefined }) {
  if (!allocation) return null
  const parts = [
    `chi phí lắp đặt ${formatVnd(allocation.installation)}`,
    allocation.maintenancePackages > 0 && `gói bảo trì ${formatVnd(allocation.maintenancePackages)}`,
    allocation.disasterPackages > 0 && `gói bảo vệ thiên tai ${formatVnd(allocation.disasterPackages)}`,
  ].filter(Boolean)
  return <p className="tnum text-meta text-fg-2">Gồm {parts.join(', ')}.</p>
}
