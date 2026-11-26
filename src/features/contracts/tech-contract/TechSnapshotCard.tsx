import { Icon } from '@/components/common/stitch-ui/Icon'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { CardTitle, Stat, TechCard } from '@/features/contracts/tech-contract/TechCardParts'
import { TONE_TEXT } from '@/features/contracts/tech-contract/techContractDisplay'
import {
  benefitFacts,
  bundledKindLabel,
  bundledStatusMeta,
  formatUnitPrice,
} from '@/features/after-sales/servicePackageDisplay'
import {
  bundledReasonText,
  commitmentPhase,
  contractPackageBreakdown,
} from '@/features/payment-plan/bundledContractRules'
import { readContractSnapshot } from '@/features/payment-plan/contractSnapshot'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { formatQuantity, lineIdentity } from '@/features/quotations/quotationDisplay'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractServicePackageView } from '@/types/res/paymentPlanRes'
import { cx } from '@/utils/cx'
import { formatMoney } from '@/utils/format'

// Thẻ "Khách hàng, công trình, thiết bị" của trang hợp đồng 30/70 phía kỹ thuật viên: bản chụp lúc lập hợp đồng (khách, công trình,
// các dòng báo giá, gói đi kèm, tổng tiền). Chỉ đọc; số tiền là số backend ghi

const PHASE_NOTES: Partial<Record<ReturnType<typeof commitmentPhase>, string>> = {
  committed:
    'Gói thuộc hợp đồng, chưa có hiệu lực. Gói được tạo khi hợp đồng đã thanh toán đủ hai đợt, công trình đã bàn giao và số tấm pin lắp đặt khớp hợp đồng.',
  provisioned: 'Đã tạo gói dịch vụ; gói có hiệu lực theo trạng thái và thời hạn của chính gói đó.',
  reconciliation:
    'Số tấm pin đã lắp khác số trong hợp đồng. Quản lý đối soát lại; chưa cấp quyền lợi và không đổi số tiền nào.',
  discarded: 'Hợp đồng đã huỷ trước khi thanh toán đợt 1 nên gói không còn hiệu lực.',
}

function PackageBlock({ p }: { p: ContractServicePackageView }) {
  const status = bundledStatusMeta(p.status, 'staff')
  const note = PHASE_NOTES[commitmentPhase(p.status)]
  const reason = p.status === 'RECONCILIATION_REQUIRED' || p.status === 'DISCARDED' ? p.statusReason : null
  const reasonText = bundledReasonText(reason) ?? reason
  return (
    <div className="ct-box ct-well space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
        <p className="flex min-w-0 items-start gap-2 text-body font-bold text-fg">
          <Icon name="verified_user" className="mt-px shrink-0 text-[20px] text-accent-fg" />
          <span className="min-w-0">
            {p.packageName} <span className="font-semibold text-fg-2">({bundledKindLabel(p.kind)})</span>
          </span>
        </p>
        <span className={cx('text-meta font-semibold', TONE_TEXT[status.tone])}>{status.label}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
        <Stat label="Đơn giá" value={formatUnitPrice(p.unitPrice, p.pricingUnit)} />
        <Stat label="Số tấm pin bảo vệ" value={`${p.quantity.toLocaleString('vi-VN')} tấm`} />
        <Stat label="Thành tiền gói" value={formatVnd(p.totalAmount)} />
        {benefitFacts(p).map((f, i) => (
          <Stat key={i} label={f.k} value={f.v} />
        ))}
        <Stat
          label="Thu theo đợt"
          value={`Đợt 1: ${formatVnd(p.depositAllocation)}, đợt 2: ${formatVnd(p.balanceAllocation)}`}
        />
      </dl>
      {note && <p className="text-meta text-fg-2">{note}</p>}
      {reasonText && <p className="text-meta text-fg">{reasonText}</p>}
    </div>
  )
}

export function TechSnapshotCard({ contract: c }: { contract: ContractView }) {
  const s = readContractSnapshot(c.pricingSnapshot, c.customerSnapshot)
  const money = (amount: number | null) => (amount === null ? '—' : formatMoney(amount, c.currency))
  const breakdown = contractPackageBreakdown(c)
  const totals = [
    { k: 'Thiết bị', v: s.totals.equipmentSubtotal },
    { k: 'Nhân công', v: s.totals.laborCost },
    { k: 'Vận chuyển', v: s.totals.transportCost },
    { k: 'Dịch vụ khác', v: s.totals.otherServiceCost },
    { k: 'Giảm giá', v: s.totals.discountAmount },
    {
      k: `Thuế${s.totals.taxRatePercent !== null ? ` (${s.totals.taxRatePercent.toLocaleString('vi-VN')}%)` : ''}`,
      v: s.totals.taxAmount,
    },
    ...(breakdown
      ? [
          { k: 'Chi phí lắp đặt', v: breakdown.installation },
          { k: 'Gói đi kèm', v: breakdown.packages },
        ]
      : []),
  ].filter((t) => t.v !== null && t.v !== 0)

  return (
    <TechCard aria-labelledby="tech-snapshot">
      <CardTitle
        id="tech-snapshot"
        icon="inventory_2"
        aside={
          s.quoteNumber && (
            <span>
              Theo báo giá <span className="tnum font-medium text-fg">{s.quoteNumber}</span>
              {s.quotationVersion ? ` (bản ${s.quotationVersion})` : ''}
            </span>
          )
        }
      >
        Khách hàng, công trình, thiết bị
      </CardTitle>
      <div className="space-y-5">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-0.5">
            <dt className="text-meta text-fg-2">Khách hàng</dt>
            <dd className="text-body font-bold text-fg">{s.customer.name ?? '—'}</dd>
            {s.customer.phone && (
              <dd className="text-meta text-fg-2">
                SĐT:{' '}
                <a className="tnum ui-link" href={`tel:${s.customer.phone.replace(/\s+/g, '')}`}>
                  {s.customer.phone}
                </a>
              </dd>
            )}
            {s.customer.email && <dd className="text-meta break-all text-fg-2">{s.customer.email}</dd>}
          </div>
          <div className="min-w-0 space-y-0.5">
            <dt className="text-meta text-fg-2">Vị trí công trình</dt>
            <dd className="text-body font-bold text-fg">{s.customer.propertyName ?? '—'}</dd>
            {s.customer.address && <dd className="text-meta text-fg-2">Địa chỉ: {s.customer.address}</dd>}
          </div>
        </dl>

        {s.lines.length === 0 ? (
          <p className="text-body text-fg-2">Hợp đồng không ghi các dòng báo giá.</p>
        ) : (
          <Table stack>
            <thead>
              <tr>
                <Th>Sản phẩm, thiết bị</Th>
                <Th className="text-right">Số lượng</Th>
                <Th className="text-right">Đơn giá</Th>
                <Th className="text-right">Thành tiền</Th>
              </tr>
            </thead>
            <tbody>
              {s.lines.map((l, i) => (
                <Tr key={`${l.lineNumber ?? i}-${l.sku ?? l.name}`}>
                  <Td label="Sản phẩm">
                    <span className="font-semibold text-fg">{l.name}</span>
                    {lineIdentity(l) && <p className="text-meta text-fg-2">{lineIdentity(l)}</p>}
                  </Td>
                  <Td label="Số lượng" className="tnum lg:text-right">
                    {l.quantity === null ? '—' : formatQuantity(l.quantity)}
                    {l.unit && ` ${l.unit}`}
                  </Td>
                  <Td label="Đơn giá" className="tnum lg:text-right">
                    {money(l.unitPrice)}
                  </Td>
                  <Td label="Thành tiền" className="tnum font-bold text-fg lg:text-right">
                    {money(l.lineTotal)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}

        {breakdown && breakdown.items.length > 0 && (
          <div className="space-y-3">
            {breakdown.items.map((p) => (
              <PackageBlock key={p.commitmentId} p={p} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-line pt-4">
          {totals.length > 0 && (
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              {totals.map((t) => (
                <Stat key={t.k} label={t.k} value={money(t.v)} />
              ))}
            </dl>
          )}
          <dl className="border-l-2 border-accent pl-3">
            <Stat label="Tổng thanh toán hợp đồng" value={formatMoney(c.totalAmount, c.currency)} tone="accent" />
          </dl>
        </div>
      </div>
    </TechCard>
  )
}
