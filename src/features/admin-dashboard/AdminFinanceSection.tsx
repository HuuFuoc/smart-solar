import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BarList } from '@/components/common/charts/BarList'
import { ColumnChart, TrendChart, type CategoryRow } from '@/components/common/charts/CartesianCharts'
import { ChartPanel, ScopeTag } from '@/components/common/charts/ChartPanel'
import {
  ORDINAL,
  SERIES,
  STATUS_COLOR,
  formatCount,
  formatVndAxis,
  formatVndCompact,
  formatVndFull,
} from '@/components/common/charts/chartTheme'
import { DonutChart, type DonutSlice } from '@/components/common/charts/DonutChart'
import { KpiLabel } from '@/components/common/charts/KpiLabel'
import { Segmented } from '@/components/common/ui/segmented'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { COLLECTION_STATUSES, PAYMENT_PLAN_STAGES } from '@/common/paymentPlan'
import {
  collectedSplit,
  financeKpis,
  installmentsByStatus,
  openCasesRanked,
  STAGE_ORDER,
} from '@/features/admin-dashboard/financeMapping'
import { monthAxisLabel, monthTitle, trendPeriods } from '@/features/dashboard/dashboardStats'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useFinanceOverviewQuery, useFinanceTrendQueries } from '@/hooks/useAdminFinance'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf, rateLimitedMessage } from '@/services/api/errors'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

// Tài chính hợp đồng lắp đặt trên trang Tổng quan của quản trị (GET /api/admin/finance/overview). Ô "Hiện tại" là trạng thái lúc
// backend tạo báo cáo (không đổi theo khoảng ngày), ô "Trong kỳ" là tiền đã xác minh trong khoảng ngày đã chọn. Cả hai theo khu vực
// đã chọn. Xu hướng: mỗi tháng là một lần gọi báo cáo với đúng khoảng ngày của tháng đó

const PLAN = 'DEPOSIT_30_BALANCE_70'

const STAGE_COLORS: Record<string, string> = {
  DRAFT_CREATED: ORDINAL[0],
  DEPOSIT_VERIFIED: ORDINAL[1],
  READY_FOR_INSTALLATION: ORDINAL[2],
  BALANCE_DUE: ORDINAL[3],
  FULLY_PAID: ORDINAL[4],
  BALANCE_OVERDUE: STATUS_COLOR.danger,
}

const INSTALLMENT_SERIES = [
  { key: 'paid', label: 'Đã trả', color: STATUS_COLOR.ok },
  { key: 'due', label: 'Đến hạn, chưa trả', color: STATUS_COLOR.info },
  { key: 'overdue', label: 'Quá hạn', color: STATUS_COLOR.danger },
  { key: 'pending', label: 'Chưa tới lúc trả (chờ nghiệm thu)', color: STATUS_COLOR.neutral },
] as const

const COLLECTED_SERIES = [
  { key: 'deposit', label: 'Khoản 30%', color: SERIES[0] },
  { key: 'balance', label: 'Khoản 70%', color: SERIES[1] },
  { key: 'legacy', label: 'Hợp đồng trả 100% (cách cũ)', color: SERIES[2] },
]

/** "01/11/2026" */
const dayLabel = (d: string) => d.split('-').reverse().join('/')
/** "05/11" */
const shortDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

export function AdminFinanceSection({
  from,
  to,
  zoneId,
  today,
}: {
  from: string
  to: string
  zoneId: string | undefined
  today: string
}) {
  const query = useFinanceOverviewQuery({ from, to, zoneId })
  const { slices, extended, truncated } = useMemo(() => trendPeriods(from, to, today), [from, to, today])
  const trend = useFinanceTrendQueries(slices, zoneId, { enabled: query.isSuccess })
  const [trendMode, setTrendMode] = useState<'total' | 'split'>('total')
  // Danh sách hợp đồng / công nợ chưa lọc được theo khu vực: đang lọc khu vực thì không gắn link để số không lệch danh sách
  const linkable = !zoneId

  if (query.isPending)
    return (
      <div aria-busy="true" aria-label="Đang tải tài chính" className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    )
  if (query.isError && isFeatureUnavailable(query.error))
    return (
      <UnavailableState
        title="Báo cáo tài chính chưa sẵn sàng."
        message={errorMessage(query.error)}
        pendingMigrations={pendingMigrationsOf(query.error)}
      />
    )
  if (!query.data)
    return (
      <ErrorState
        title="Không tải được số liệu tài chính."
        message={rateLimitedMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )

  const v = query.data
  const k = financeKpis(v)
  const period = `${dayLabel(v.from)} – ${dayLabel(v.to)}`

  // ---- xu hướng
  const trendRows: CategoryRow[] = slices.map((s, i) => {
    const data = trend.data[i]
    const split = data ? collectedSplit(data) : { deposit: 0, balance: 0, legacy: 0 }
    return {
      key: s.month,
      label: monthAxisLabel(s.month),
      title: `${monthTitle(s.month)}${s.partial ? ` (${shortDay(s.from)} – ${shortDay(s.to)})` : ''}`,
      values: { ...split, total: split.deposit + split.balance + split.legacy },
    }
  })
  const trendTotal = trendRows.reduce((s, r) => s + (r.values.total ?? 0), 0)
  const trendState = trend.isError ? 'error' : trend.isPending ? 'loading' : trendTotal === 0 ? 'empty' : 'ready'

  // ---- chặng của hợp đồng 30/70
  const stageSlices: DonutSlice[] = [...v.contractsByStage]
    .filter((b) => b.count > 0)
    .sort((a, b) => order(a.key) - order(b.key))
    .map((b) => ({
      key: b.key,
      label: PAYMENT_PLAN_STAGES[b.key]?.staff ?? b.key,
      value: b.count,
      color: STAGE_COLORS[b.key] ?? STATUS_COLOR.neutral,
      note: formatVndCompact(b.amount),
      href: linkable ? stageHref(b.key) : undefined,
    }))
  const stageTotal = stageSlices.reduce((s, x) => s + x.value, 0)

  // ---- các khoản 30/70 theo trạng thái
  const installments = installmentsByStatus(v)
  const installmentRows: CategoryRow[] = installments.map((g) => ({
    key: g.key,
    label: g.label,
    values: g.amount,
  }))
  const installmentTotal = installments.reduce(
    (s, g) => s + g.amount.paid + g.amount.due + g.amount.overdue + g.amount.pending,
    0,
  )
  const unpaidOnChart = installments.reduce((s, g) => s + g.amount.due + g.amount.overdue + g.amount.pending, 0)

  // ---- công nợ đang mở
  const cases = openCasesRanked(v)

  return (
    <div className="space-y-6">
      <p className="tnum text-meta text-fg-3">
        Số liệu hiện tại tính lúc {formatMoment(v.generatedAt)}. Tiền đã thu là tiền đã xác minh (PayOS báo nhận hoặc quản lý xác
        nhận tiền mặt), không phải doanh thu kế toán.
      </p>

      <section aria-label="Chỉ số hiện tại" className="space-y-2">
        <h3 className="flex items-center gap-2 text-body font-semibold text-fg">
          Hợp đồng và công nợ <ScopeTag>Hiện tại</ScopeTag>
        </h3>
        <StatRow framed>
          <Stat
            label={<KpiLabel label="Giá trị hợp đồng" hint="Mọi hợp đồng trừ bản đã thay và bản đã huỷ" />}
            value={formatVndCompact(k.contractValue.amount)}
            note={`${formatCount(k.contractValue.count)} hợp đồng, ${formatCount(k.planContracts.count)} trả 30/70`}
          />
          <Stat
            label={<KpiLabel label="Còn phải thu (30/70)" hint="Mọi khoản 30/70 chưa trả, gồm cả 70% chưa tới hạn" />}
            value={formatVndCompact(k.outstanding.amount)}
            note={`Phải thu ngay ${formatVndCompact(k.outstandingDueNow.amount)} (${formatCount(k.outstandingDueNow.count)} khoản)`}
          />
          <Stat
            label={<KpiLabel label="Khoản 70% quá hạn" hint="Khoản 70% đến hạn đã qua hạn trả" />}
            value={formatVndCompact(k.overdue.amount)}
            tone={k.overdue.count > 0 ? 'danger' : 'default'}
            note={
              k.overdue.count > 0 && linkable ? (
                <Link className="ui-link" to={`${ROUTES.admin.contracts}?goi=${PLAN}&qua-han=1`}>
                  {formatCount(k.overdue.count)} khoản, xem hợp đồng
                </Link>
              ) : (
                `${formatCount(k.overdue.count)} khoản`
              )
            }
          />
          <Stat
            label={<KpiLabel label="Đã trả đủ 100%" hint="Hợp đồng 30/70 đã nhận đủ cả hai khoản" />}
            value={formatCount(k.fullyPaid.count)}
            unit="hợp đồng"
            note={formatVndCompact(k.fullyPaid.amount)}
          />
        </StatRow>
      </section>

      <section aria-label="Chỉ số trong kỳ" className="space-y-2">
        <h3 className="flex flex-wrap items-center gap-2 text-body font-semibold text-fg">
          Tiền đã thu <ScopeTag>Trong kỳ {period}</ScopeTag>
        </h3>
        <StatRow framed>
          <Stat
            label={<KpiLabel label="Tổng đã thu" hint="Khoản 30% + khoản 70% + hợp đồng cách cũ" />}
            value={formatVndCompact(k.collected.amount)}
            note={formatVndFull(k.collected.amount)}
          />
          <Stat
            label="Khoản 30% (cọc)"
            value={formatVndCompact(k.depositsCollected.amount)}
            note={`${formatCount(k.depositsCollected.count)} khoản`}
          />
          <Stat
            label="Khoản 70% (còn lại)"
            value={formatVndCompact(k.balancesCollected.amount)}
            note={`${formatCount(k.balancesCollected.count)} khoản`}
          />
          <Stat
            label={<KpiLabel label="Tiền chưa áp" hint="Đã nhận nhưng chưa áp vào khoản nào; không tính là đã thu" />}
            value={formatVndCompact(k.unapplied.amount)}
            tone={k.unapplied.count > 0 ? 'warn' : 'default'}
            note={`${formatCount(k.unapplied.count)} lần, hợp đồng cũ đã thu ${formatVndCompact(k.legacyCollected.amount)}`}
          />
        </StatRow>
      </section>

      <ChartPanel
        title="Tiền đã thu theo tháng"
        scope="Theo tháng"
        description={
          extended
            ? `6 tháng gần nhất tính tới ${dayLabel(to)}; mỗi cột là tiền đã xác minh trong tháng đó.`
            : `Mỗi cột là tiền đã xác minh trong tháng, cắt theo kỳ ${period}.${truncated ? ' Chỉ hiện 12 tháng cuối của kỳ.' : ''}`
        }
        state={trendState}
        emptyText="Chưa có khoản tiền nào được xác minh trong các tháng này."
        errorText="Không tải được đủ các tháng (có thể do giới hạn số lần đọc mỗi phút)."
        onRetry={() => void trend.refetch()}
        action={
          <Segmented
            size="sm"
            label="Cách xem"
            value={trendMode}
            onChange={setTrendMode}
            options={[
              { value: 'total', label: 'Tổng' },
              { value: 'split', label: 'Theo khoản' },
            ]}
          />
        }
        table={{
          caption: 'Tiền đã thu theo tháng',
          columns: [
            { label: 'Tháng' },
            { label: 'Khoản 30%', numeric: true },
            { label: 'Khoản 70%', numeric: true },
            { label: 'Hợp đồng cũ', numeric: true },
            { label: 'Tổng', numeric: true },
          ],
          rows: trendRows.map((r) => ({
            key: r.key,
            cells: [
              r.title,
              formatVndFull(r.values.deposit ?? 0),
              formatVndFull(r.values.balance ?? 0),
              formatVndFull(r.values.legacy ?? 0),
              formatVndFull(r.values.total ?? 0),
            ],
          })),
        }}
        footer={`Tổng ${slices.length} tháng: ${formatVndFull(trendTotal)}.`}
      >
        <div className={cx(trend.isFetching && 'opacity-70')}>
          {trendMode === 'total' ? (
            <TrendChart
              variant="area"
              rows={trendRows}
              series={[{ key: 'total', label: 'Tổng đã thu', color: SERIES[0] }]}
              formatValue={formatVndFull}
              formatAxis={formatVndAxis}
              ariaLabel="Biểu đồ vùng tiền đã thu theo tháng"
            />
          ) : (
            <ColumnChart
              rows={trendRows}
              series={COLLECTED_SERIES}
              formatValue={formatVndFull}
              formatAxis={formatVndAxis}
              ariaLabel="Biểu đồ cột chồng tiền đã thu theo tháng, chia khoản 30%, khoản 70% và hợp đồng cũ"
            />
          )}
        </div>
      </ChartPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Hợp đồng 30/70 theo chặng"
          scope="Hiện tại"
          description="Số hợp đồng ở mỗi chặng thanh toán; số dưới tên là tổng giá trị."
          state={stageTotal === 0 ? 'empty' : 'ready'}
          emptyText="Chưa có hợp đồng trả 30/70."
          table={{
            caption: 'Hợp đồng 30/70 theo chặng',
            columns: [{ label: 'Chặng' }, { label: 'Hợp đồng', numeric: true }, { label: 'Giá trị', numeric: true }],
            rows: v.contractsByStage.map((b) => ({
              key: b.key,
              cells: [PAYMENT_PLAN_STAGES[b.key]?.staff ?? b.key, formatCount(b.count), formatVndFull(b.amount)],
            })),
          }}
        >
          <DonutChart
            slices={stageSlices}
            centerValue={formatCount(stageTotal)}
            centerLabel="hợp đồng"
            ariaLabel={`Biểu đồ tròn ${stageTotal} hợp đồng 30/70 theo chặng thanh toán`}
          />
        </ChartPanel>

        <ChartPanel
          title="Các khoản 30/70 theo trạng thái"
          scope="Hiện tại"
          description="Số tiền của từng khoản; 70% chỉ mở sau khi khách nghiệm thu."
          state={installmentTotal === 0 ? 'empty' : 'ready'}
          emptyText="Chưa có khoản 30/70 nào."
          table={{
            caption: 'Các khoản 30/70 theo trạng thái',
            columns: [
              { label: 'Khoản' },
              ...INSTALLMENT_SERIES.map((s) => ({ label: s.label, numeric: true })),
            ],
            rows: installments.map((g) => ({
              key: g.key,
              cells: [
                g.label,
                ...INSTALLMENT_SERIES.map(
                  (s) => `${formatVndFull(g.amount[s.key])} (${formatCount(g.count[s.key])})`,
                ),
              ],
            })),
          }}
          footer={
            unpaidOnChart === k.outstanding.amount
              ? `Chưa trả ${formatVndFull(unpaidOnChart)}, bằng ô "Còn phải thu".`
              : `Chưa trả trên biểu đồ ${formatVndFull(unpaidOnChart)}; ô "Còn phải thu" ${formatVndFull(k.outstanding.amount)}.`
          }
        >
          <ColumnChart
            rows={installmentRows}
            series={[...INSTALLMENT_SERIES]}
            formatValue={formatVndFull}
            formatAxis={formatVndAxis}
            ariaLabel="Biểu đồ cột chồng số tiền khoản 30% và khoản 70% theo trạng thái"
          />
        </ChartPanel>

        <ChartPanel
          className="lg:col-span-2"
          title="Công nợ đang theo dõi"
          scope="Hiện tại"
          description="Hồ sơ thu hồi đang mở theo bước xử lý, xếp theo số tiền."
          state={cases.length === 0 ? 'empty' : 'ready'}
          emptyText="Không có hồ sơ công nợ nào đang mở."
          table={{
            caption: 'Hồ sơ công nợ đang mở',
            columns: [{ label: 'Bước' }, { label: 'Hồ sơ', numeric: true }, { label: 'Số tiền', numeric: true }],
            rows: cases.map((b) => ({
              key: b.key,
              cells: [COLLECTION_STATUSES[b.key]?.label ?? b.key, formatCount(b.count), formatVndFull(b.amount)],
            })),
          }}
          footer={`Đang thương lượng ${formatVndCompact(v.negotiations.amount)}, đã chuyển quản lý / pháp lý ${formatVndCompact(v.escalations.amount)}.`}
        >
          <BarList
            ariaLabel="Số tiền công nợ đang mở theo bước xử lý"
            formatValue={formatVndCompact}
            items={cases.map((b) => ({
              key: b.key,
              label: COLLECTION_STATUSES[b.key]?.label ?? b.key,
              value: b.amount,
              note: `${formatCount(b.count)} hồ sơ`,
              color: caseColor(b.key),
              href: linkable ? `${ROUTES.admin.collections}?trang-thai=${b.key}` : undefined,
            }))}
          />
        </ChartPanel>
      </div>
    </div>
  )
}

function order(stage: string) {
  if (stage === 'BALANCE_OVERDUE') return STAGE_ORDER.indexOf('BALANCE_DUE') + 0.5
  const i = (STAGE_ORDER as readonly string[]).indexOf(stage)
  return i === -1 ? 99 : i
}

/** Chỉ hai chặng có bộ lọc khớp đúng trên danh sách hợp đồng */
function stageHref(stage: string) {
  if (stage === 'BALANCE_OVERDUE') return `${ROUTES.admin.contracts}?goi=${PLAN}&qua-han=1`
  if (stage === 'FULLY_PAID') return `${ROUTES.admin.contracts}?goi=${PLAN}&trang-thai=PAID`
  return undefined
}

function caseColor(status: string) {
  const tone = COLLECTION_STATUSES[status]?.tone
  return tone === 'danger' ? STATUS_COLOR.danger : tone === 'warn' ? STATUS_COLOR.warn : STATUS_COLOR.info
}
