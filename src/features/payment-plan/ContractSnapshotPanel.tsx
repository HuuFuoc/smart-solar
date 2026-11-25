import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { contractPackageBreakdown } from '@/features/payment-plan/bundledContractRules'
import { ContractPackagesSection } from '@/features/payment-plan/ContractPackagesSection'
import { readContractSnapshot } from '@/features/payment-plan/contractSnapshot'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatQuantity, lineIdentity } from '@/features/quotations/quotationDisplay'
import type { ContractView } from '@/types/res/customerContractsRes'
import { formatMoney } from '@/utils/format'

// Khách, công trình, các dòng báo giá và tổng tiền đã đóng băng trong hợp đồng. Chỉ đọc; số tiền là số backend ghi.
// `variant="card"`: kiểu thẻ của trang hợp đồng phía khách (khối nền nhạt, bảng có khung, tổng tiền nổi bật; xem contract-detail.css)

export function ContractSnapshotPanel({
  contract: c,
  variant = 'plain',
}: {
  contract: ContractView
  variant?: 'plain' | 'card'
}) {
  const s = readContractSnapshot(c.pricingSnapshot, c.customerSnapshot)
  const card = variant === 'card'
  const money = (amount: number | null) => (amount === null ? '—' : formatMoney(amount, c.currency))
  // Hợp đồng có gói đi kèm: tổng giá trị gồm cả gói, nên ghi hai phần trước tổng (chi tiết gói ở khối gói đi kèm)
  const breakdown = contractPackageBreakdown(c)
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
    ...(breakdown
      ? [
          { k: 'Chi phí lắp đặt', v: breakdown.installation },
          { k: 'Gói dịch vụ đi kèm', v: breakdown.packages },
        ]
      : []),
  ].filter((t) => t.v !== null && t.v !== 0)
  const totalText = formatMoney(c.totalAmount, c.currency)

  const customer = [
    { k: card ? 'Khách hàng' : 'Khách', v: s.customer.name ?? '—' },
    { k: 'Số điện thoại', v: s.customer.phone ? <span className="tnum">{s.customer.phone}</span> : '—' },
    { k: 'Email', v: s.customer.email ? <span className="break-all">{s.customer.email}</span> : '—' },
    { k: 'Công trình', v: s.customer.propertyName ?? '—' },
  ]
  const address = { k: 'Địa chỉ', v: s.customer.address ?? '—' }

  const lines =
    s.lines.length === 0 ? (
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
                <span className={card ? 'font-semibold text-fg' : 'text-fg'}>{l.name}</span>
                {lineIdentity(l) && <p className="text-meta text-fg-2">{lineIdentity(l)}</p>}
              </Td>
              <Td label="Số lượng" className="tnum lg:text-right">
                {l.quantity === null ? '—' : formatQuantity(l.quantity)}
                {l.unit && ` ${l.unit}`}
              </Td>
              <Td label="Đơn giá" className="tnum lg:text-right">
                {money(l.unitPrice)}
              </Td>
              <Td
                label="Thành tiền"
                className={card ? 'tnum font-semibold text-fg lg:text-right' : 'tnum lg:text-right'}
              >
                {money(l.lineTotal)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    )

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
      {card ? (
        <PanelBody className="space-y-4">
          <div className="ct-box ct-well p-4">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              {customer.map((f) => (
                <div key={f.k} className="min-w-0">
                  <dt className="text-meta text-fg-2">{f.k}</dt>
                  <dd className="text-body font-semibold wrap-break-word text-fg">{f.v}</dd>
                </div>
              ))}
            </dl>
            <dl className="mt-3 border-t border-line pt-3">
              <dt className="text-meta text-fg-2">{address.k}</dt>
              <dd className="text-body wrap-break-word text-fg">{address.v}</dd>
            </dl>
          </div>
          {s.lines.length === 0 ? lines : <div className="ct-table">{lines}</div>}
          <ContractPackagesSection contract={c} variant="card" />
          <div className="ct-box ct-well flex flex-wrap items-end justify-between gap-x-8 gap-y-3 p-4">
            {totals.length > 0 && (
              <dl className="flex flex-wrap gap-x-6 gap-y-2">
                {totals.map((t) => (
                  <div key={t.k} className="min-w-0">
                    <dt className="text-meta text-fg-3">{t.k}</dt>
                    <dd className="tnum text-body font-semibold text-fg">{money(t.v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="ml-auto text-right">
              <p className="text-meta text-fg-2">Tổng giá trị hợp đồng:</p>
              <p className="tnum text-figure font-bold text-accent-fg">{totalText}</p>
            </div>
          </div>
        </PanelBody>
      ) : (
        <PanelBody className="space-y-4">
          <Facts items={[...customer, address]} />
          {lines}
          <ContractPackagesSection contract={c} />
          <Facts
            items={[
              ...totals.map((t) => ({ k: t.k, v: <span className="tnum">{money(t.v)}</span> })),
              {
                k: 'Tổng giá trị hợp đồng',
                v: <span className="tnum font-semibold text-fg">{totalText}</span>,
              },
            ]}
          />
        </PanelBody>
      )}
    </Panel>
  )
}
