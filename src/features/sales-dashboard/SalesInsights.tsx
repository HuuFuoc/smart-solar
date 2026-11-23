import { useMemo } from 'react'
import { BarList } from '@/components/common/charts/BarList'
import { ColumnChart, TrendChart, type CategoryRow } from '@/components/common/charts/CartesianCharts'
import { ChartPanel } from '@/components/common/charts/ChartPanel'
import {
  ORDINAL,
  SERIES,
  STATUS_COLOR,
  formatCount,
  formatVndCompact,
  formatVndFull,
} from '@/components/common/charts/chartTheme'
import { DonutChart, type DonutSlice } from '@/components/common/charts/DonutChart'
import { FunnelChart } from '@/components/common/charts/FunnelChart'
import { KpiLabel } from '@/components/common/charts/KpiLabel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Skeleton } from '@/components/common/ui/states'
import { CONTRACT_STATUSES } from '@/common/contract'
import { COLLECTION_STATUSES, PAYMENT_PLAN_STAGES } from '@/common/paymentPlan'
import { ActionList, type ActionItem } from '@/features/dashboard/ActionList'
import { foldTail, monthAxisLabel, monthTitle, monthsEndingAt } from '@/features/dashboard/dashboardStats'
import {
  collectionStats,
  contractsByGroup,
  contractsByMonth,
  myLiveContracts,
  salesFunnel,
} from '@/features/sales-dashboard/salesStats'
import { formatDateVn } from '@/features/scheduling/schedulingDisplay'
import { useCollectionsSummaryQuery } from '@/hooks/useCollections'
import { useContractDirectorySummaryQuery } from '@/hooks/usePaymentPlan'
import { rateLimitedMessage } from '@/services/api/errors'
import { ROUTES, withId } from '@/routes/paths'
import type { MySurveyRequestItem } from '@/types/res/surveyRequestsRes'

// Phân tích kinh doanh trên /ops/dashboard. Hợp đồng chỉ đọc (kinh doanh không duyệt báo giá, không thu tiền: kỹ thuật viên chốt báo
// giá tại công trình, tiền do khách trả online hoặc quản lý xác nhận tiền mặt), nên ở đây chỉ có số và link xem

const MONTHS = 6

const STAGE_COLORS: Record<string, string> = {
  DRAFT_CREATED: ORDINAL[0],
  DEPOSIT_VERIFIED: ORDINAL[1],
  READY_FOR_INSTALLATION: ORDINAL[2],
  BALANCE_DUE: ORDINAL[3],
  FULLY_PAID: ORDINAL[4],
  BALANCE_OVERDUE: STATUS_COLOR.danger,
}

const groupLabel = (key: string) =>
  key.startsWith('LEGACY_')
    ? `Cách cũ: ${CONTRACT_STATUSES[key.slice(7)]?.staff ?? key.slice(7)}`
    : (PAYMENT_PLAN_STAGES[key]?.staff ?? key)

export function SalesInsights({
  mySurveys,
  surveysLoading,
  today,
}: {
  mySurveys: MySurveyRequestItem[]
  surveysLoading: boolean
  today: string
}) {
  const directory = useContractDirectorySummaryQuery({})
  const collections = useCollectionsSummaryQuery()
  const months = useMemo(() => monthsEndingAt(today.slice(0, 7), MONTHS), [today])

  const contracts = useMemo(() => myLiveContracts(directory.data?.items ?? [], mySurveys), [directory.data, mySurveys])
  const funnel = salesFunnel(mySurveys, contracts)
  const contractValue = contracts.reduce((s, c) => s + c.totalAmount, 0)
  const coll = useMemo(
    () => collectionStats(collections.data?.items ?? [], months, today),
    [collections.data, months, today],
  )
  const contactAmount = coll.contactRequired.reduce((s, c) => s + c.amountDue, 0)

  const contractsLoading = directory.isPending || surveysLoading
  const contractState = contractsLoading
    ? 'loading'
    : directory.isError
      ? 'error'
      : contracts.length === 0
        ? 'empty'
        : 'ready'
  const collectionsState = collections.isPending ? 'loading' : collections.isError ? 'error' : 'ready'

  // ---- hợp đồng theo tháng
  const byMonth = contractsByMonth(contracts, months)
  const monthRows: CategoryRow[] = byMonth.map((m) => ({
    key: m.month,
    label: monthAxisLabel(m.month),
    title: monthTitle(m.month),
    values: { plan: m.plan, legacy: m.legacy },
  }))
  const inWindow = byMonth.reduce((s, m) => s + m.plan + m.legacy, 0)

  // ---- trạng thái hợp đồng
  const groups = contractsByGroup(contracts)
  const slices: DonutSlice[] = foldTail(
    [...groups.entries()].map(([key, b]): DonutSlice => ({
      key,
      label: groupLabel(key),
      value: b.count,
      color: STAGE_COLORS[key] ?? (key === 'LEGACY_PAID' ? SERIES[1] : STATUS_COLOR.neutral),
      note: formatVndCompact(b.amount),
    })),
    6,
    (value, folded): DonutSlice => ({
      key: 'other',
      label: `Khác (${folded.map((f) => f.label).join(', ')})`,
      value,
      color: STATUS_COLOR.neutral,
    }),
  )

  // ---- công nợ theo bước
  const caseBars = [...coll.byStatus.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([status, b]) => ({
      key: status,
      label: COLLECTION_STATUSES[status]?.label ?? status,
      value: b.amount,
      note: `${formatCount(b.count)} hồ sơ`,
      color:
        COLLECTION_STATUSES[status]?.tone === 'danger'
          ? STATUS_COLOR.danger
          : COLLECTION_STATUSES[status]?.tone === 'warn'
            ? STATUS_COLOR.warn
            : STATUS_COLOR.info,
      href: `${ROUTES.ops.collections}?trang-thai=${status}`,
    }))
  const trendRows: CategoryRow[] = coll.trend.map((t) => ({
    key: t.month,
    label: monthAxisLabel(t.month),
    title: monthTitle(t.month),
    values: { opened: t.opened, resolved: t.resolved },
  }))
  const trendTotal = coll.trend.reduce((s, t) => s + t.opened + t.resolved, 0)

  const actions: ActionItem[] = [
    {
      key: 'contact',
      label: 'Công nợ cần liên hệ khách',
      hint: 'Khoản 70% quá hạn; ghi lại lần liên hệ trên hồ sơ',
      count: coll.contactRequired.length,
      href: `${ROUTES.ops.collections}?trang-thai=SALES_CONTACT_REQUIRED`,
      urgent: true,
      items: [...coll.contactRequired]
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 4)
        .map((c) => ({
          key: c.caseId,
          label: `${c.customerName}, ${c.contractNumber}`,
          meta: `${formatVndCompact(c.amountDue)}, ${c.daysOverdue} ngày`,
          href: withId(ROUTES.ops.collection, c.caseId),
        })),
    },
    {
      key: 'promise',
      label: 'Khách hẹn trả đã quá ngày hẹn',
      hint: 'Hồ sơ "Khách đã hẹn trả" mà ngày hẹn đã qua',
      count: coll.brokenPromises.length,
      href: `${ROUTES.ops.collections}?trang-thai=AGREEMENT_RECORDED`,
      urgent: true,
      items: coll.brokenPromises.slice(0, 3).map((c) => ({
        key: c.caseId,
        label: `${c.customerName}, ${c.contractNumber}`,
        meta: c.promisedPaymentDate ? `hẹn ${formatDateVn(`${c.promisedPaymentDate}T12:00:00+07:00`)}` : undefined,
        href: withId(ROUTES.ops.collection, c.caseId),
      })),
    },
  ]

  return (
    <div className="space-y-4">
      {contractsLoading && collections.isPending ? (
        <Skeleton className="h-24" />
      ) : (
        <StatRow framed className="md:grid-cols-3 xl:grid-cols-6">
          <Stat
            label={<KpiLabel label="Yêu cầu đang theo dõi" hint="Yêu cầu bạn đã nhận, chưa đóng / huỷ" />}
            value={formatCount(mySurveys.length - funnel.closed)}
            note={`${formatCount(mySurveys.length)} đã nhận`}
          />
          <Stat
            label={<KpiLabel label="Hợp đồng" hint="Từ yêu cầu của bạn; bỏ bản đã thay và đã huỷ" />}
            value={directory.isError ? '—' : formatCount(contracts.length)}
            note="Khách của bạn"
          />
          <Stat
            label="Giá trị hợp đồng"
            value={directory.isError ? '—' : formatVndCompact(contractValue)}
            note={directory.data?.partial ? 'Chỉ đọc 2.000 hợp đồng đầu' : 'Khách của bạn'}
          />
          <Stat
            label="Đã nhận tiền"
            value={formatCount(funnel.stages[4]!.value)}
            unit="hợp đồng"
            note="30% hoặc 100%"
          />
          <Stat
            label={<KpiLabel label="Công nợ cần liên hệ" hint="Hồ sơ ở bước Cần liên hệ khách (toàn hệ thống)" />}
            value={collections.isError ? '—' : formatCount(coll.contactRequired.length)}
            tone={coll.contactRequired.length > 0 ? 'danger' : 'default'}
            note={formatVndCompact(contactAmount)}
          />
          <Stat
            label="Hồ sơ công nợ đã đóng"
            value={collections.isError ? '—' : formatCount(coll.resolved)}
            note={`${formatCount(coll.resolvedLast30Days)} trong 30 ngày qua`}
          />
        </StatRow>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <ChartPanel
          className="lg:col-span-7"
          title="Phễu khách của bạn"
          scope="Hiện tại"
          description={`Mỗi yêu cầu đếm một lần ở mỗi bước; % là tỉ lệ so với bước trước.${funnel.closed > 0 ? ` ${formatCount(funnel.closed)} yêu cầu đã đóng / huỷ vẫn tính ở bước đầu.` : ''}`}
          state={contractsLoading ? 'loading' : mySurveys.length === 0 ? 'empty' : 'ready'}
          emptyText="Bạn chưa nhận yêu cầu khảo sát nào."
          table={{
            caption: 'Phễu khách của bạn',
            columns: [{ label: 'Bước' }, { label: 'Yêu cầu', numeric: true }],
            rows: funnel.stages.map((s) => ({ key: s.key, cells: [s.label, formatCount(s.value)] })),
          }}
        >
          <FunnelChart
            ariaLabel="Phễu chuyển đổi từ yêu cầu đã nhận tới khách đã trả tiền"
            steps={funnel.stages.map((s, i) => ({ ...s, color: ORDINAL[i]! }))}
          />
        </ChartPanel>
        <ActionList
          className="lg:col-span-5"
          title="Công nợ cần bạn xử lý"
          actions={actions}
          loading={collections.isPending}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Hợp đồng mới theo tháng"
          scope={`${MONTHS} tháng gần nhất`}
          description="Hợp đồng của khách bạn theo ngày tạo (giờ Việt Nam)."
          state={contractState === 'ready' && inWindow === 0 ? 'empty' : contractState}
          emptyText="Chưa có hợp đồng nào trong 6 tháng gần nhất."
          errorText={rateLimitedMessage(directory.error)}
          onRetry={() => void directory.refetch()}
          table={{
            caption: 'Hợp đồng mới theo tháng',
            columns: [{ label: 'Tháng' }, { label: 'Trả 30/70', numeric: true }, { label: 'Cách cũ', numeric: true }],
            rows: monthRows.map((r) => ({
              key: r.key,
              cells: [r.title, formatCount(r.values.plan ?? 0), formatCount(r.values.legacy ?? 0)],
            })),
          }}
        >
          <ColumnChart
            rows={monthRows}
            series={[
              { key: 'plan', label: 'Trả 30/70', color: SERIES[0] },
              { key: 'legacy', label: 'Trả 100% (cách cũ)', color: SERIES[2] },
            ]}
            height={220}
            ariaLabel="Biểu đồ cột số hợp đồng mới mỗi tháng"
          />
        </ChartPanel>

        <ChartPanel
          title="Hợp đồng theo trạng thái"
          scope="Hiện tại"
          description="Gói 30/70 theo chặng thanh toán, hợp đồng cũ theo trạng thái; số dưới tên là giá trị."
          state={contractState}
          emptyText="Chưa có hợp đồng nào từ yêu cầu của bạn."
          errorText={rateLimitedMessage(directory.error)}
          onRetry={() => void directory.refetch()}
          table={{
            caption: 'Hợp đồng theo trạng thái',
            columns: [
              { label: 'Trạng thái' },
              { label: 'Hợp đồng', numeric: true },
              { label: 'Giá trị', numeric: true },
            ],
            rows: [...groups.entries()].map(([key, b]) => ({
              key,
              cells: [groupLabel(key), formatCount(b.count), formatVndFull(b.amount)],
            })),
          }}
        >
          <DonutChart
            slices={slices}
            centerValue={formatCount(contracts.length)}
            centerLabel="hợp đồng"
            ariaLabel={`Biểu đồ tròn ${contracts.length} hợp đồng theo trạng thái`}
          />
        </ChartPanel>

        <ChartPanel
          title="Công nợ đang mở theo bước"
          scope="Toàn hệ thống"
          description="Số tiền quá hạn đang theo dõi; bấm một dòng để mở danh sách hồ sơ."
          state={collectionsState === 'ready' && caseBars.length === 0 ? 'empty' : collectionsState}
          emptyText="Không có hồ sơ công nợ nào đang mở."
          errorText={rateLimitedMessage(collections.error)}
          onRetry={() => void collections.refetch()}
          table={{
            caption: 'Công nợ đang mở theo bước',
            columns: [{ label: 'Bước' }, { label: 'Hồ sơ', numeric: true }, { label: 'Số tiền', numeric: true }],
            rows: caseBars.map((b) => ({ key: b.key, cells: [b.label, b.note, formatVndFull(b.value)] })),
          }}
          footer={collections.data?.partial ? 'Chỉ đọc 1.000 hồ sơ đầu.' : undefined}
        >
          <BarList
            items={caseBars}
            formatValue={formatVndCompact}
            ariaLabel="Số tiền công nợ đang mở theo bước xử lý"
          />
        </ChartPanel>

        <ChartPanel
          title="Hồ sơ công nợ phát sinh và đóng"
          scope={`${MONTHS} tháng gần nhất`}
          description="Phát sinh theo ngày mở hồ sơ, đóng theo ngày đóng (giờ Việt Nam)."
          state={collectionsState === 'ready' && trendTotal === 0 ? 'empty' : collectionsState}
          emptyText="Chưa có hồ sơ công nợ nào trong 6 tháng gần nhất."
          errorText={rateLimitedMessage(collections.error)}
          onRetry={() => void collections.refetch()}
          table={{
            caption: 'Hồ sơ công nợ phát sinh và đóng theo tháng',
            columns: [{ label: 'Tháng' }, { label: 'Phát sinh', numeric: true }, { label: 'Đã đóng', numeric: true }],
            rows: trendRows.map((r) => ({
              key: r.key,
              cells: [r.title, formatCount(r.values.opened ?? 0), formatCount(r.values.resolved ?? 0)],
            })),
          }}
        >
          <TrendChart
            rows={trendRows}
            series={[
              { key: 'opened', label: 'Phát sinh', color: SERIES[2] },
              { key: 'resolved', label: 'Đã đóng', color: SERIES[0] },
            ]}
            height={220}
            ariaLabel="Biểu đồ đường số hồ sơ công nợ phát sinh và đã đóng mỗi tháng"
          />
        </ChartPanel>
      </div>
    </div>
  )
}
