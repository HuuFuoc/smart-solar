import { COLLECTION_STATUSES, PAYMENT_PLAN_STAGES } from '@/common/paymentPlan'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { FinanceOverviewView, MoneyBucket } from '@/types/res/paymentPlanRes'

// Báo cáo tài chính hợp đồng lắp đặt (backend 7d27054). Số lượng và số tiền tách cột. "Hiện tại" là trạng thái lúc tạo báo cáo,
// "Trong kỳ" chỉ tính tiền đã xác minh trong khoảng ngày (PayOS báo nhận hoặc quản lý xác nhận tiền mặt); tiền chờ, cần đối soát,
// phải hoàn không bao giờ tính là đã thu. Đây là tiền đã thu, không phải doanh thu kế toán. Nhóm không làm hoàn tiền nên không hiện
// `refunded` của backend

const METHOD_LABELS: Record<string, string> = { ONLINE: 'PayOS', CASH: 'Tiền mặt' }

type Row = { label: string; hint?: string; bucket: MoneyBucket }

function BucketTable({ rows, caption }: { rows: Row[]; caption: string }) {
  return (
    <Table stack aria-label={caption}>
      <thead>
        <tr>
          <Th>Chỉ số</Th>
          <Th className="text-right">Số lượng</Th>
          <Th className="text-right">Số tiền</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Tr key={r.label}>
            <Td label="Chỉ số">
              <span className="text-fg">{r.label}</span>
              {r.hint && <p className="text-meta text-fg-2">{r.hint}</p>}
            </Td>
            <Td label="Số lượng" className="tnum lg:text-right">
              {r.bucket.count.toLocaleString('vi-VN')}
            </Td>
            <Td label="Số tiền" className="tnum lg:text-right">
              {formatVnd(r.bucket.amount)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

function Breakdown({
  title,
  buckets,
  labels,
}: {
  title: string
  buckets: MoneyBucket[]
  labels: (key: string) => string
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-body font-medium text-fg">{title}</h3>
      {buckets.length === 0 ? (
        <p className="text-body text-fg-2">Không có dữ liệu.</p>
      ) : (
        <BucketTable caption={title} rows={buckets.map((b) => ({ label: labels(b.key), bucket: b }))} />
      )}
    </section>
  )
}

export function FinanceOverview({ view: v }: { view: FinanceOverviewView }) {
  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title="Hiện tại" description={`Tính lúc ${formatMoment(v.generatedAt)}.`} />
        <PanelBody className="space-y-6">
          <BucketTable
            caption="Hợp đồng và các khoản hiện tại"
            rows={[
              { label: 'Hợp đồng trả 30/70', bucket: v.paymentPlanContracts },
              { label: 'Hợp đồng trả 100% (cách cũ)', bucket: v.legacyContracts },
              { label: 'Khoản 30% đã trả', bucket: v.depositsPaid },
              { label: 'Khoản 30% chờ trả', bucket: v.depositsDue },
              { label: 'Khoản 70% chưa tới lúc trả', hint: 'Chờ khách nghiệm thu', bucket: v.balancesPending },
              { label: 'Khoản 70% đến hạn', bucket: v.balancesDue },
              { label: 'Khoản 70% quá hạn', bucket: v.balancesOverdue },
              {
                label: 'Khoản 70% đã trả',
                hint: `${v.balancesPaidLate.toLocaleString('vi-VN')} khoản trả sau hạn`,
                bucket: v.balancesPaid,
              },
              { label: 'Còn phải thu', hint: 'Gồm cả khoản 70% chưa tới lúc trả', bucket: v.outstanding },
              { label: 'Phải thu ngay', hint: 'Chỉ các khoản đến hạn', bucket: v.outstandingDueNow },
              { label: 'Chờ khách nghiệm thu', bucket: v.awaitingAcceptance },
              { label: 'Đã nghiệm thu, chưa trả 70%', bucket: v.acceptedUnpaid },
              { label: 'Đã trả đủ 100%', bucket: v.fullyPaid },
              { label: 'Đang thương lượng công nợ', bucket: v.negotiations },
              { label: 'Đã chuyển quản lý / pháp lý', bucket: v.escalations },
            ]}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Breakdown
              title="Hợp đồng theo chặng"
              buckets={v.contractsByStage}
              labels={(k) => PAYMENT_PLAN_STAGES[k]?.staff ?? k}
            />
            <Breakdown
              title="Hồ sơ công nợ đang mở"
              buckets={v.openCollectionCasesByStatus}
              labels={(k) => COLLECTION_STATUSES[k]?.label ?? k}
            />
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Trong kỳ"
          description={`Tiền đã xác minh từ ${v.from.split('-').reverse().join('/')} đến ${v.to.split('-').reverse().join('/')}.`}
        />
        <PanelBody className="space-y-6">
          <BucketTable
            caption="Tiền đã thu trong kỳ"
            rows={[
              { label: 'Đã thu khoản 30%', bucket: v.depositsCollected },
              { label: 'Đã thu khoản 70%', bucket: v.balancesCollected },
              { label: 'Đã thu hợp đồng cách cũ', bucket: v.legacyContractPaymentsCollected },
              { label: 'Tiền chưa áp', hint: 'Chưa áp vào khoản nào, không tính là đã thu', bucket: v.unapplied },
            ]}
          />
          <Breakdown
            title="Các khoản đã thu theo cách trả"
            buckets={v.installmentsCollectedByMethod}
            labels={(k) => METHOD_LABELS[k] ?? k}
          />
          <Notice>Số đã thu là tiền đã xác minh, không phải doanh thu kế toán.</Notice>
        </PanelBody>
      </Panel>
    </div>
  )
}
