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
import { useAfterSalesDashboardQuery, useExportDashboardMutation } from '@/hooks/useAdminAfterSales'
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

export function AdminReportsPage() {
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
  const reset = () => setSearch(new URLSearchParams(), { replace: true })
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
      <PageHeader
        title="Báo cáo sau bán"
        actions={
          <Button
            icon="download"
            disabled={!showingCurrent || exporter.isPending || query.isFetching}
            onClick={() => void exportCsv()}
          >
            {exporter.isPending ? 'Đang tạo tệp…' : 'Tải CSV'}
          </Button>
        }
      />

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
