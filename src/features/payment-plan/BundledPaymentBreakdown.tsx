import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import type { BundledPaymentPlan } from '@/features/quotations/bundledPackageRules'
import { cx } from '@/utils/cx'
import { formatMoney } from '@/utils/format'

// Hai khoản trả của hợp đồng có gói đi kèm, cho khách xem trước khi trả: 30/70 chỉ tính trên chi phí lắp đặt, gói trả đủ một lần
// cùng khoản 70%. Chỉ hiển thị; số tiền và trạng thái đã trả của từng khoản vẫn lấy từ khối thanh toán của hợp đồng

export function BundledPaymentBreakdown({
  plan,
  currency = 'VND',
  className,
}: {
  plan: BundledPaymentPlan
  currency?: string
  className?: string
}) {
  const money = (amount: number) => formatMoney(amount, currency)
  const rows = [
    { key: 1, label: 'Khoản 1: 30% chi phí lắp đặt', installation: plan.deposit, packages: 0, due: plan.deposit },
    {
      key: 2,
      label: 'Khoản 2: 70% chi phí lắp đặt và 100% gói dịch vụ',
      installation: plan.balance,
      packages: plan.packages.total,
      due: plan.secondPayment,
    },
  ]
  return (
    <div className={cx('space-y-2', className)}>
      <Table stack>
        <thead>
          <tr>
            <Th>Khoản</Th>
            <Th className="text-right">Lắp đặt</Th>
            <Th className="text-right">Gói dịch vụ</Th>
            <Th className="text-right">Phải trả</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.key}>
              <Td label="Khoản" className="font-medium text-fg">
                {r.label}
              </Td>
              <Td label="Lắp đặt" className="tnum whitespace-nowrap lg:text-right">
                {money(r.installation)}
              </Td>
              <Td label="Gói dịch vụ" className="tnum whitespace-nowrap lg:text-right">
                {money(r.packages)}
              </Td>
              <Td label="Phải trả" className="tnum font-semibold whitespace-nowrap text-fg lg:text-right">
                {money(r.due)}
              </Td>
            </Tr>
          ))}
          <Tr>
            <Td label="Khoản" className="font-semibold text-fg">
              Tổng
            </Td>
            <Td label="Lắp đặt" className="tnum whitespace-nowrap lg:text-right">
              {money(plan.installationTotal)}
            </Td>
            <Td label="Gói dịch vụ" className="tnum whitespace-nowrap lg:text-right">
              {money(plan.packages.total)}
            </Td>
            <Td label="Phải trả" className="tnum font-semibold whitespace-nowrap text-fg lg:text-right">
              {money(plan.grandTotal)}
            </Td>
          </Tr>
        </tbody>
      </Table>
      {plan.preview && <p className="text-meta text-fg-2">Số tạm tính theo báo giá; số phải trả lấy theo hợp đồng.</p>}
    </div>
  )
}
