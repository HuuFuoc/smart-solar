import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { readContractSnapshot } from '@/features/payment-plan/contractSnapshot'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatQuantity, lineIdentity } from '@/features/quotations/quotationDisplay'
import type { ContractView } from '@/types/res/customerContractsRes'
import { formatMoney } from '@/utils/format'

// Khách, công trình, các dòng báo giá và tổng tiền đã đóng băng trong hợp đồng. Chỉ đọc; số tiền là số backend ghi

export function ContractSnapshotPanel({ contract: c }: { contract: ContractView }) {
  const s = readContractSnapshot(c.pricingSnapshot, c.customerSnapshot)
  const money = (amount: number | null) => (amount === null ? '—' : formatMoney(amount, c.currency))
  const totals = [
    { k: 'Thiết bị', v: s.totals.equipmentSubtotal },
    { k: 'Nhân công', v: s.totals.laborCost },
    { k: 'Vận chuyển', v: s.totals.transportCost },
    { k: 'Dịch vụ khác', v: s.totals.otherServiceCost },
    { k: 'Giảm giá', v: s.totals.discountAmount },
    {
      k: `Thuế${s.totals.taxRatePercent !== null ? ` ${s.totals.taxRatePercent.toLocaleString('vi-VN')}%` : ''}`,
      v: s.totals.taxAmount,
    },
  ].filter((t) => t.v !== null && t.v !== 0)

  return (
    <Panel>
      <PanelHeader
        title="Khách, công trình và báo giá"
        description={
          s.quoteNumber
            ? `Theo báo giá ${s.quoteNumber}${s.quotationVersion ? ` phiên bản ${s.quotationVersion}` : ''}, chụp lúc lập hợp đồng.`
            : undefined
        }
      />
      <PanelBody className="space-y-4">
        <Facts
          items={[
            { k: 'Khách', v: s.customer.name ?? '—' },
            { k: 'Số điện thoại', v: s.customer.phone ? <span className="tnum">{s.customer.phone}</span> : '—' },
            { k: 'Email', v: s.customer.email ? <span className="break-all">{s.customer.email}</span> : '—' },
            { k: 'Công trình', v: s.customer.propertyName ?? '—' },
            { k: 'Địa chỉ', v: s.customer.address ?? '—' },
          ]}
        />
        {s.lines.length === 0 ? (
          <p className="text-body text-fg-2">Hợp đồng không ghi các dòng báo giá.</p>
        ) : (
          <Table stack>
            <thead>
              <tr>
                <Th>Sản phẩm</Th>
                <Th className="text-right">Số lượng</Th>
                <Th className="text-right">Đơn giá</Th>
                <Th className="text-right">Thành tiền</Th>
              </tr>
            </thead>
            <tbody>
              {s.lines.map((l, i) => (
                <Tr key={`${l.lineNumber ?? i}-${l.sku ?? l.name}`}>
                  <Td label="Sản phẩm">
                    <span className="text-fg">{l.name}</span>
                    {lineIdentity(l) && <p className="text-meta text-fg-2">{lineIdentity(l)}</p>}
                  </Td>
                  <Td label="Số lượng" className="tnum lg:text-right">
                    {l.quantity === null ? '—' : formatQuantity(l.quantity)}
                    {l.unit && ` ${l.unit}`}
                  </Td>
                  <Td label="Đơn giá" className="tnum lg:text-right">
                    {money(l.unitPrice)}
                  </Td>
                  <Td label="Thành tiền" className="tnum lg:text-right">
                    {money(l.lineTotal)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Facts
          items={[
            ...totals.map((t) => ({ k: t.k, v: <span className="tnum">{money(t.v)}</span> })),
            {
              k: 'Tổng giá trị hợp đồng',
              v: <span className="tnum font-semibold text-fg">{formatMoney(c.totalAmount, c.currency)}</span>,
            },
          ]}
        />
      </PanelBody>
    </Panel>
  )
}
