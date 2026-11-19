import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import {
  DASHBOARD_METRICS,
  DASHBOARD_HIDDEN_KEYS,
  DASHBOARD_MONEY_KEYS,
  SERVICE_REQUEST_KINDS,
  SERVICE_REQUEST_STATUSES,
} from '@/common/afterSales'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { DateField, Field, Select } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import {
  dashboardCsvName,
  dashboardParams,
  defaultDashboardRanges,
  rangeError,
  type DashboardFilter,
} from '@/features/after-sales/adminAfterSalesRules'
import { formatDay, todayVn } from '@/features/scheduling/schedulingDisplay'
import { AdminOverview } from '@/features/admin-dashboard/AdminOverview'
import { FinanceOverview } from '@/features/admin-dashboard/FinanceOverview'
import { financePeriodError, monthOf } from '@/features/payment-plan/paymentPlanRules'
import { useFinanceOverviewQuery } from '@/hooks/useAdminFinance'
import {
  useAdminOverviewQuery,
  useAfterSalesDashboardQuery,
  useExportDashboardMutation,
} from '@/hooks/useAdminAfterSales'
import { useOperationalZonesQuery } from '@/hooks/useTechnicianAdmin'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf, rateLimitedMessage } from '@/services/api/errors'
import type { DashboardMetric } from '@/types/res/adminAfterSalesRes'
import { cx } from '@/utils/cx'
import { formatMoney } from '@/utils/format'

// Báo cáo thu tiền và hoạt động sau bán (chỉ quản trị, không phải sổ kế toán). Hai khoảng ngày theo giờ Việt Nam, mặc định
// tháng này so với tháng trước như backend. Bộ lọc nằm trên địa chỉ để tải lại trang vẫn giữ; bản CSV gửi đúng bộ lọc đang hiện

const PARAM_KEYS: Record<keyof DashboardFilter, string> = {
  from: 'tu',
  to: 'den',
  compareFrom: 'ss-tu',
  compareTo: 'ss-den',
  zoneId: 'khu',
  serviceType: 'loai',
  status: 'trang-thai',
}

const number = new Intl.NumberFormat('vi-VN')
const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2, signDisplay: 'exceptZero' })

function metricValue(m: DashboardMetric, value: number) {
  return DASHBOARD_METRICS[m.key]?.money ? formatMoney(value, 'VND') : number.format(value)
}

function changeText(m: DashboardMetric) {
  if (m.changePercent == null) return m.previous === 0 && m.current !== 0 ? 'Kỳ trước bằng 0' : '—'
  return `${percent.format(m.changePercent)}%`
}

const rangeLabel = (from: string, to: string) => `${formatDay(from, { year: true })} – ${formatDay(to, { year: true })}`

function download(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

type Tab = '' | 'thu-tien' | 'tai-chinh'
const TABS: { value: Tab; label: string }[] = [
  { value: '', label: 'Tổng quan vận hành' },
  { value: 'tai-chinh', label: 'Tài chính hợp đồng' },
  { value: 'thu-tien', label: 'Thu tiền, sau bán' },
]

export function AdminReportsPage() {
  const [search, setSearch] = useSearchParams()
  const muc = search.get('muc')
  const tab: Tab = muc === 'thu-tien' || muc === 'tai-chinh' ? muc : ''
  return (
    <>
      <PageHeader title="Báo cáo" />
      <FilterChips
        className="mb-4"
        label="Báo cáo"
        chips={TABS}
        value={tab}
        onChange={(next) => setSearch(next ? { muc: next } : {}, { replace: true })}
      />
      {tab === 'thu-tien' ? <AfterSalesReport /> : tab === 'tai-chinh' ? <FinanceReport /> : <OverviewReport />}
    </>
  )
}

// Tổng quan: một khoảng ngày (mặc định tháng này như backend, tối đa 366 ngày) cho các khối "trong kỳ"
function OverviewReport() {
  const [search, setSearch] = useSearchParams()
  const defaults = useMemo(() => defaultDashboardRanges(todayVn()), [])
  const from = search.get('tu') ?? defaults.from
  const to = search.get('den') ?? defaults.to
  const error =
    !from || !to ? 'Chọn đủ hai ngày.' : to < from ? 'Ngày kết thúc phải từ ngày bắt đầu trở đi.' : undefined
  const query = useAdminOverviewQuery(from, to, { enabled: !error })
  const set = (key: 'tu' | 'den', value: string) =>
    setSearch(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (value) p.set(key, value)
        else p.delete(key)
        return p
      },
      { replace: true },
    )

  return (
    <>
      <fieldset className="mb-6 flex flex-col gap-2">
        <legend className="mb-2 text-body font-medium text-fg">Kỳ xem (cho các khối trong kỳ)</legend>
        <div className="flex flex-wrap items-center gap-2">
          <DateField className="w-40" label="Từ ngày" value={from} onChange={(v) => set('tu', v)} />
          <span aria-hidden className="text-fg-3">
            –
          </span>
          <DateField className="w-40" label="Đến ngày" value={to} onChange={(v) => set('den', v)} />
        </div>
        {error && (
          <p className="text-meta text-danger" role="alert">
            {error}
          </p>
        )}
      </fieldset>
      <section aria-busy={query.isFetching} className={cx(query.isPlaceholderData && 'opacity-70')}>
        {error ? null : query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        ) : query.isError && isFeatureUnavailable(query.error) ? (
          <UnavailableState
            title="Tổng quan chưa sẵn sàng."
            message={errorMessage(query.error)}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : query.data ? (
          <AdminOverview view={query.data} />
        ) : (
          <ErrorState message={rateLimitedMessage(query.error)} onRetry={() => void query.refetch()} />
        )}
      </section>
    </>
  )
}

// Tài chính hợp đồng lắp đặt (30/70 và cách cũ): khoảng ngày theo giờ Việt Nam (mặc định tháng này, tối đa 366 ngày), lọc khu vực
function FinanceReport() {
  const [search, setSearch] = useSearchParams()
  const defaults = useMemo(() => monthOf(todayVn()), [])
  const from = search.get('tu') ?? defaults.from
  const to = search.get('den') ?? defaults.to
  const zoneId = search.get('khu') ?? ''
  const error = financePeriodError(from, to) ?? undefined
  const zones = useOperationalZonesQuery()
  const query = useFinanceOverviewQuery({ from, to, zoneId: zoneId || undefined }, { enabled: !error })
  const set = (key: 'tu' | 'den' | 'khu', value: string) =>
    setSearch(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (value) p.set(key, value)
        else p.delete(key)
        return p
      },
      { replace: true },
    )

  return (
    <>
      <fieldset className="mb-6 flex flex-col gap-2">
        <legend className="mb-2 text-body font-medium text-fg">Kỳ xem và khu vực</legend>
        <div className="flex flex-wrap items-center gap-2">
          <DateField className="w-40" label="Từ ngày" value={from} onChange={(v) => set('tu', v)} />
          <span aria-hidden className="text-fg-3">
            –
          </span>
          <DateField className="w-40" label="Đến ngày" value={to} onChange={(v) => set('den', v)} />
          <Select
            aria-label="Khu vực"
            active={Boolean(zoneId)}
            value={zoneId}
            disabled={zones.isPending}
            onChange={(e) => set('khu', e.target.value)}
          >
            <option value="">Mọi khu vực</option>
            {(zones.data ?? []).map((z) => (
              <option key={z.zoneId} value={z.zoneId}>
                {z.name}
              </option>
            ))}
          </Select>
        </div>
        {error && (
          <p className="text-meta text-danger" role="alert">
            {error}
          </p>
        )}
        {zoneId && <p className="text-meta text-fg-2">Lọc khu vực bỏ qua hợp đồng chưa có dự án thi công.</p>}
      </fieldset>
      <section aria-busy={query.isFetching} className={cx(query.isPlaceholderData && 'opacity-70')}>
        {error ? null : query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-40" />
          </div>
        ) : query.isError && isFeatureUnavailable(query.error) ? (
          <UnavailableState
            title="Báo cáo tài chính chưa sẵn sàng."
            message={errorMessage(query.error)}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : query.data ? (
          <FinanceOverview view={query.data} />
        ) : (
          <ErrorState message={rateLimitedMessage(query.error)} onRetry={() => void query.refetch()} />
        )}
      </section>
    </>
  )
}

function AfterSalesReport() {
  const [search, setSearch] = useSearchParams()
  const defaults = useMemo(() => defaultDashboardRanges(todayVn()), [])
  const filter: DashboardFilter = {
    from: search.get(PARAM_KEYS.from) ?? defaults.from,
    to: search.get(PARAM_KEYS.to) ?? defaults.to,
    compareFrom: search.get(PARAM_KEYS.compareFrom) ?? defaults.compareFrom,
    compareTo: search.get(PARAM_KEYS.compareTo) ?? defaults.compareTo,
    zoneId: search.get(PARAM_KEYS.zoneId) ?? '',
    serviceType: search.get(PARAM_KEYS.serviceType) ?? '',
    status: search.get(PARAM_KEYS.status) ?? '',
  }
  const currentError = rangeError(filter.from, filter.to)
  const compareError = rangeError(filter.compareFrom, filter.compareTo)
  const valid = !currentError && !compareError
  const params = dashboardParams(filter)

  const query = useAfterSalesDashboardQuery(params, { enabled: valid })
  const exporter = useExportDashboardMutation()
  const zones = useOperationalZonesQuery()

  const set = (patch: Partial<DashboardFilter>) =>
    setSearch(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch) as [keyof DashboardFilter, string][]) {
          if (value) p.set(PARAM_KEYS[key], value)
          else p.delete(PARAM_KEYS[key])
        }
        return p
      },
      { replace: true },
    )
  const reset = () => setSearch(new URLSearchParams({ muc: 'thu-tien' }), { replace: true })
  const isDefault =
    filter.from === defaults.from &&
    filter.to === defaults.to &&
    filter.compareFrom === defaults.compareFrom &&
    filter.compareTo === defaults.compareTo &&
    !filter.zoneId &&
    !filter.serviceType &&
    !filter.status

  const view = query.data
  // Số đang hiện là của bộ lọc khác (đang tải bộ lọc mới) thì chưa cho xuất, để tệp khớp đúng bảng
  const showingCurrent = Boolean(view) && !query.isPlaceholderData && valid
  const metrics = view?.metrics ?? []
  const money = DASHBOARD_MONEY_KEYS.map((key) => metrics.find((m) => m.key === key)).filter(
    (m): m is DashboardMetric => Boolean(m),
  )
  const activity = metrics.filter(
    (m) => !DASHBOARD_MONEY_KEYS.includes(m.key) && !DASHBOARD_HIDDEN_KEYS.includes(m.key),
  )
  const unavailable = query.isError && isFeatureUnavailable(query.error)

  async function exportCsv() {
    if (!showingCurrent || exporter.isPending) return
    try {
      const csv = await exporter.mutateAsync(params)
      download(csv, dashboardCsvName(filter))
      toast.success('Đã tải tệp CSV.')
    } catch (e) {
      toast.error(rateLimitedMessage(e))
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          icon="download"
          variant="secondary"
          disabled={!showingCurrent || exporter.isPending || query.isFetching}
          onClick={() => void exportCsv()}
        >
          {exporter.isPending ? 'Đang tạo tệp…' : 'Tải CSV'}
        </Button>
      </div>

      <form
        aria-label="Bộ lọc báo cáo"
        className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[auto_auto_1fr]"
        onSubmit={(e) => e.preventDefault()}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body font-medium text-fg">Kỳ xem</legend>
          <div className="flex flex-wrap items-center gap-2">
            <DateField className="w-40" label="Kỳ xem từ ngày" value={filter.from} onChange={(from) => set({ from })} />
            <span aria-hidden className="text-fg-3">
              –
            </span>
            <DateField className="w-40" label="Kỳ xem đến ngày" value={filter.to} onChange={(to) => set({ to })} />
          </div>
          {currentError && (
            <p className="text-meta text-danger" role="alert">
              {currentError}
            </p>
          )}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-body font-medium text-fg">So với</legend>
          <div className="flex flex-wrap items-center gap-2">
            <DateField
              className="w-40"
              label="So với từ ngày"
              value={filter.compareFrom}
              onChange={(compareFrom) => set({ compareFrom })}
            />
            <span aria-hidden className="text-fg-3">
              –
            </span>
            <DateField
              className="w-40"
              label="So với đến ngày"
              value={filter.compareTo}
              onChange={(compareTo) => set({ compareTo })}
            />
          </div>
          {compareError && (
            <p className="text-meta text-danger" role="alert">
              {compareError}
            </p>
          )}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3 md:col-span-2 xl:col-span-3 xl:max-w-5xl">
          <Field label="Khu vực" htmlFor="report-zone">
            <Select
              id="report-zone"
              active={filter.zoneId !== ''}
              value={filter.zoneId}
              onChange={(e) => set({ zoneId: e.target.value })}
            >
              <option value="">Mọi khu vực</option>
              {(zones.data ?? []).map((z) => (
                <option key={z.zoneId} value={z.zoneId}>
                  {z.name} ({z.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Loại dịch vụ" htmlFor="report-kind">
            <Select
              id="report-kind"
              active={filter.serviceType !== ''}
              value={filter.serviceType}
              onChange={(e) => set({ serviceType: e.target.value })}
            >
              <option value="">Mọi loại</option>
              {Object.entries(SERVICE_REQUEST_KINDS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Trạng thái yêu cầu" htmlFor="report-status">
            <Select
              id="report-status"
              active={filter.status !== ''}
              value={filter.status}
              onChange={(e) => set({ status: e.target.value })}
            >
              <option value="">Mọi trạng thái</option>
              {Object.entries(SERVICE_REQUEST_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {!isDefault && (
          <div className="md:col-span-2 xl:col-span-3">
            <Button variant="ghost" icon="filter_alt_off" onClick={reset}>
              Về mặc định (tháng này so với tháng trước)
            </Button>
          </div>
        )}
      </form>

      <section
        aria-label="Số liệu"
        aria-busy={query.isFetching}
        className={cx(query.isPlaceholderData && 'opacity-70')}
      >
        {!valid ? null : query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        ) : unavailable ? (
          <UnavailableState
            title="Báo cáo sau bán chưa sẵn sàng."
            message={errorMessage(query.error)}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : query.isError && !view ? (
          <ErrorState message={rateLimitedMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : view ? (
          <div className="space-y-6">
            <p className="tnum text-body text-fg-2">
              Kỳ xem <span className="font-medium text-fg">{rangeLabel(view.from, view.to)}</span>, so với{' '}
              <span className="font-medium text-fg">{rangeLabel(view.compareFrom, view.compareTo)}</span>
            </p>
            <Panel>
              <PanelHeader title="Tiền" />
              <StatRow framed>
                {money.map((m) => (
                  <Stat
                    key={m.key}
                    label={DASHBOARD_METRICS[m.key]?.label ?? m.description}
                    value={metricValue(m, m.current)}
                    note={`Kỳ trước ${metricValue(m, m.previous)} (${changeText(m)})`}
                  />
                ))}
              </StatRow>
            </Panel>
            <Panel>
              <PanelHeader title="Hoạt động" />
              <Table stack>
                <thead>
                  <tr>
                    <Th>Chỉ số</Th>
                    <Th className="text-right">Kỳ xem</Th>
                    <Th className="text-right">Kỳ so sánh</Th>
                    <Th className="text-right">Thay đổi</Th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((m) => (
                    <Tr key={m.key}>
                      <Td label="Chỉ số">{DASHBOARD_METRICS[m.key]?.label ?? m.description}</Td>
                      <Td label="Kỳ xem" className="tnum text-right">
                        {metricValue(m, m.current)}
                      </Td>
                      <Td label="Kỳ so sánh" className="tnum text-right text-fg-2">
                        {metricValue(m, m.previous)}
                      </Td>
                      <Td label="Thay đổi" className="tnum text-right text-fg-2">
                        {changeText(m)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </div>
        ) : null}
      </section>
    </>
  )
}
