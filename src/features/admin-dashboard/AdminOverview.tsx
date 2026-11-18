import { Link } from 'react-router'
import { KeyValueList } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { OVERVIEW_LABELS as L, bucketTotal } from '@/features/admin-dashboard/overviewDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { ROUTES } from '@/routes/paths'
import type { AdminOverviewView, OverviewBucket } from '@/types/res/adminAfterSalesRes'
import { formatMoney } from '@/utils/format'

// Tổng quan vận hành của quản trị, chỉ hiện đúng số backend trả (không cộng lại ở máy). "Hiện tại" là trạng thái lúc tải,
// không đổi theo khoảng ngày; "trong kỳ" theo khoảng ngày đã chọn. Giá trị báo giá là tiền chào, tiền mặt chờ thu chưa phải tiền
// đã nhận, tiền chưa áp không phải doanh thu

const number = new Intl.NumberFormat('vi-VN')
const vnd = (amount: number | null | undefined) => formatMoney(amount ?? 0, 'VND')

/** Một phân bố: mỗi dòng một nhóm, thanh tỉ lệ chỉ để đọc nhanh (số nằm ngay cạnh) */
function Distribution({
  title,
  buckets,
  label,
  money = false,
}: {
  title: string
  buckets: OverviewBucket[]
  label: (key: string) => string
  money?: boolean
}) {
  const total = bucketTotal(buckets)
  return (
    <Panel>
      <PanelHeader title={title} description={total > 0 ? `${number.format(total)} tổng cộng` : undefined} />
      <PanelBody>
        {buckets.length === 0 ? (
          <p className="text-body text-fg-2">Không có dữ liệu.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nhóm</Th>
                <Th className="w-1/3">
                  <span className="sr-only">Tỉ lệ</span>
                </Th>
                <Th className="text-right">Số lượng</Th>
                {money && <Th className="text-right">Số tiền</Th>}
              </tr>
            </thead>
            <tbody>
              {[...buckets]
                .sort((a, b) => b.count - a.count)
                .map((b) => {
                  const share = total > 0 ? Math.round((b.count / total) * 100) : 0
                  return (
                    <Tr key={b.key}>
                      <Td>{label(b.key)}</Td>
                      <Td>
                        <span aria-hidden className="block h-2 w-full rounded-control bg-surface-2">
                          <span className="block h-2 rounded-control bg-chart-1" style={{ width: `${share}%` }} />
                        </span>
                      </Td>
                      <Td className="tnum text-right">
                        {number.format(b.count)} <span className="text-meta text-fg-3">({share}%)</span>
                      </Td>
                      {money && <Td className="tnum text-right">{vnd(b.amount)}</Td>}
                    </Tr>
                  )
                })}
            </tbody>
          </Table>
        )}
      </PanelBody>
    </Panel>
  )
}

export function AdminOverview({ view }: { view: AdminOverviewView }) {
  const online = view.collectedByMethod.find((b) => b.key === 'ONLINE')
  const cash = view.collectedByMethod.find((b) => b.key === 'CASH')
  return (
    <div className="space-y-6">
      <p className="tnum text-meta text-fg-2">Số liệu hiện tại tính lúc {formatMoment(view.generatedAt)}.</p>

      <Panel>
        <PanelHeader title="Tiền trong kỳ" />
        <StatRow framed>
          <Stat
            label="Đã nhận qua PayOS"
            value={vnd(online?.amount)}
            note={`${number.format(online?.count ?? 0)} lần`}
          />
          <Stat label="Đã thu tiền mặt" value={vnd(cash?.amount)} note={`${number.format(cash?.count ?? 0)} lần`} />
          <Stat
            label="Thanh toán gộp hợp đồng và gói"
            value={vnd(view.combinedCheckoutsPaid.amount)}
            note={`${number.format(view.combinedCheckoutsPaid.count)} lần`}
          />
          <Stat
            label="Tiền mặt chờ xác nhận"
            value={vnd(view.pendingCashChoices.amount)}
            tone={view.pendingCashChoices.count > 0 ? 'danger' : 'default'}
            note={
              view.pendingCashChoices.count > 0 ? (
                <Link to={ROUTES.admin.payments} className="ui-link">
                  {number.format(view.pendingCashChoices.count)} lần chờ thu, chưa phải tiền đã nhận
                </Link>
              ) : (
                'Hiện tại, chưa phải tiền đã nhận'
              )
            }
          />
        </StatRow>
      </Panel>

      <Panel>
        <PanelHeader title="Báo giá đã gửi trong kỳ" description="Tiền chào khách, không phải tiền đã nhận." />
        <StatRow framed>
          <Stat
            label="Báo giá lắp đặt"
            value={vnd(view.installationQuotationValueIssued.amount)}
            note={`${number.format(view.installationQuotationValueIssued.count)} bản`}
          />
          <Stat
            label="Báo giá sửa chữa, bảo trì"
            value={vnd(view.serviceQuotationValueIssued.amount)}
            note={`${number.format(view.serviceQuotationValueIssued.count)} bản`}
          />
          <Stat
            label="Hợp đồng có PDF chính thức"
            value={number.format(view.contractsWithOfficialPdf)}
            note="Hiện tại"
          />
          <Stat
            label="Hợp đồng có bản ký"
            value={number.format(view.contractsWithSignedScan)}
            note={`${number.format(view.signedScansUploadedByStaff)} bản do nhân viên tải`}
          />
        </StatRow>
      </Panel>

      <Panel>
        <PanelHeader title="Tài khoản" description="Hiện tại" />
        <PanelBody>
          <Table stack>
            <thead>
              <tr>
                <Th>Vai trò</Th>
                <Th className="text-right">Tổng</Th>
                <Th className="text-right">Đang hoạt động</Th>
                <Th className="text-right">Chờ xác minh email</Th>
                <Th className="text-right">Đã khoá</Th>
              </tr>
            </thead>
            <tbody>
              {view.accounts.map((a) => (
                <Tr key={a.role}>
                  <Td label="Vai trò">{L.role(a.role)}</Td>
                  <Td label="Tổng" className="tnum lg:text-right">
                    {number.format(a.total)}
                  </Td>
                  <Td label="Đang hoạt động" className="tnum lg:text-right">
                    {number.format(a.active)}
                  </Td>
                  <Td label="Chờ xác minh email" className="tnum lg:text-right">
                    {number.format(a.pendingVerification)}
                  </Td>
                  <Td label="Đã khoá" className="tnum lg:text-right">
                    {number.format(a.inactive)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </PanelBody>
      </Panel>

      <section aria-label="Khảo sát và lắp đặt, hiện tại" className="grid gap-6 xl:grid-cols-2">
        <Distribution title="Yêu cầu khảo sát" buckets={view.surveyRequestsByStatus} label={L.survey} />
        <Distribution title="Báo giá lắp đặt" buckets={view.installationQuotationsByStatus} label={L.quotation} />
        <Distribution title="Hợp đồng (mỗi phiên bản một dòng)" buckets={view.contractsByStatus} label={L.contract} />
        <Distribution title="Dự án thi công" buckets={view.installationProjectsByStatus} label={L.project} />
        <Distribution title="Lịch thi công" buckets={view.installationSchedulesByStatus} label={L.schedule} />
        <Panel>
          <PanelHeader title="Việc đang chờ" />
          <PanelBody>
            <KeyValueList
              items={[
                {
                  k: 'Lịch khảo sát chưa làm',
                  v: <span className="tnum">{number.format(view.outstandingSurveyAppointments)}</span>,
                },
                {
                  k: 'Khung thi công chờ khách chọn',
                  v: <span className="tnum">{number.format(view.openInstallationSlotOffers)}</span>,
                },
              ]}
            />
          </PanelBody>
        </Panel>
      </section>

      <section aria-label="Sau bán, hiện tại" className="grid gap-6 xl:grid-cols-2">
        <Distribution title="Yêu cầu sau bán" buckets={view.serviceRequestsByKindAndStatus} label={L.serviceRequest} />
        <Distribution title="Báo giá sau bán" buckets={view.serviceQuotationsByStatus} label={L.serviceQuotation} />
        <Distribution
          title="Báo giá sau bán theo người lập"
          buckets={view.serviceQuotationsByIssuer}
          label={L.issuer}
        />
        <Distribution title="Gói dịch vụ đã mua" buckets={view.subscriptionsByKindAndStatus} label={L.subscription} />
        <Distribution title="Hỗ trợ thiên tai" buckets={view.disasterClaimsByStatus} label={L.claim} />
        <Distribution title="Việc kinh doanh đang mở" buckets={view.openSalesTasksByType} label={L.salesTask} />
        <Distribution title="Buổi hẹn sau bán đang mở" buckets={view.openServiceVisitsByStatus} label={L.visit} />
        <Distribution
          title="Tiền chưa áp vào khoản nào"
          buckets={view.refundRecordsByStatus}
          label={L.unapplied}
          money
        />
      </section>

      <section aria-label="Thanh toán trong kỳ" className="grid gap-6 xl:grid-cols-2">
        <Distribution
          title="Lần thanh toán đã tạo (số cần thu)"
          buckets={view.paymentAttemptsCreatedByMethodAndStatus}
          label={L.attempt}
          money
        />
        <Distribution
          title="Tiền gói theo cách bán"
          buckets={view.packageRevenueBySaleChannel}
          label={L.channel}
          money
        />
      </section>
    </div>
  )
}
