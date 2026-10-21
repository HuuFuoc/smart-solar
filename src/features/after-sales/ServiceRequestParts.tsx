import { Badge } from '@/components/common/ui/badge'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import {
  coverageLabel,
  formatVnd,
  itemStatusMeta,
  quotationStatusMeta,
  visitPurposeLabel,
  visitStatusMeta,
} from '@/features/after-sales/serviceDisplay'
import { formatAppointment, formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { ServiceItemView, ServiceQuotationView, ServiceVisitView } from '@/types/res/customerAfterSalesRes'

// Các khối chỉ để xem của một yêu cầu bảo hành, sửa chữa, bảo trì; khách và nhân viên dùng chung

/** Hạng mục kỹ thuật viên chẩn đoán, ai chịu chi phí và kết quả làm */
export function ServiceItemList({ items }: { items: ServiceItemView[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const status = itemStatusMeta(item.status)
        return (
          <li key={item.itemId} className="space-y-1 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body font-medium text-fg">{item.description}</p>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <p className="text-body text-fg-2">Chẩn đoán: {item.diagnosis}</p>
            {item.requiredParts && <p className="text-body text-fg-2">Vật tư cần: {item.requiredParts}</p>}
            <p className="text-body text-fg-2">
              Chi phí: {coverageLabel(item.coverage)}
              {item.coverageReason && ` (${item.coverageReason})`}
            </p>
            {item.workResult && <p className="text-body text-fg">Kết quả: {item.workResult}</p>}
            {item.partsUsed && <p className="text-body text-fg-2">Vật tư đã dùng: {item.partsUsed}</p>}
          </li>
        )
      })}
    </ul>
  )
}

/** Các buổi hẹn, mới nhất lên đầu */
export function ServiceVisitList({ visits }: { visits: ServiceVisitView[] }) {
  return (
    <ul className="divide-y divide-line">
      {[...visits].reverse().map((visit) => {
        const status = visitStatusMeta(visit.status)
        const waitingTechnician = visit.status === 'SCHEDULED' && visit.assignmentStatus === 'PENDING'
        return (
          <li key={visit.visitId} className="space-y-1 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body font-medium text-fg">{visitPurposeLabel(visit.purpose)}</p>
              <Badge tone={status.tone}>{waitingTechnician ? 'Chờ kỹ thuật viên nhận' : status.label}</Badge>
            </div>
            <p className="tnum text-body text-fg-2">
              {formatAppointment(visit.startsAt, visit.endsAt)}
              {visit.technicianName && `, kỹ thuật viên ${visit.technicianName}`}
            </p>
            {visit.companyRescheduleReason && (
              <p className="text-body text-fg-2">Lý do đổi lịch: {visit.companyRescheduleReason}</p>
            )}
            {visit.report && (
              <div className="pt-1">
                <p className="tnum text-meta text-fg-3">Báo cáo lúc {formatMoment(visit.reportedAt)}</p>
                <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{visit.report}</p>
              </div>
            )}
            {visit.findingNote && <p className="text-body text-fg-2">Phát hiện thêm: {visit.findingNote}</p>}
          </li>
        )
      })}
    </ul>
  )
}

/** Các dòng của một báo giá và tổng tiền */
export function QuotationDetail({ quotation }: { quotation: ServiceQuotationView }) {
  const status = quotationStatusMeta(quotation.status)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body font-medium text-fg">Báo giá lần {quotation.version}</p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <Table stack>
        <thead>
          <tr>
            <Th>Hạng mục</Th>
            <Th className="text-right">Vật tư</Th>
            <Th className="text-right">Công</Th>
            <Th className="text-right">Cộng</Th>
          </tr>
        </thead>
        <tbody>
          {quotation.lines.map((line, index) => (
            <Tr key={line.itemId ?? index}>
              <Td label="Hạng mục" className="text-fg">
                {line.description}
              </Td>
              <Td label="Vật tư" className="tnum lg:text-right">
                {formatVnd(line.partsAmount)}
              </Td>
              <Td label="Công" className="tnum lg:text-right">
                {formatVnd(line.laborAmount)}
              </Td>
              <Td label="Cộng" className="tnum font-medium text-fg lg:text-right">
                {formatVnd(line.partsAmount + line.laborAmount)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <p className="tnum text-body text-fg">
        Khách trả: <span className="font-semibold">{formatVnd(quotation.customerAmount)}</span>
        {quotation.disasterSupportAmount > 0 && ` (gói thiên tai hỗ trợ ${formatVnd(quotation.disasterSupportAmount)})`}
      </p>
      <p className="tnum text-meta text-fg-2">
        Gửi {formatMoment(quotation.issuedAt)}, hiệu lực tới {formatMoment(quotation.expiresAt)}
        {quotation.repairWarrantyMonths ? `. Bảo hành phần sửa ${quotation.repairWarrantyMonths} tháng` : ''}
        {quotation.paidAt && `. Đã thanh toán ${formatMoment(quotation.paidAt)}`}
      </p>
      {quotation.note && <p className="text-body whitespace-pre-line text-fg-2">Ghi chú: {quotation.note}</p>}
    </div>
  )
}
