import { Link } from 'react-router'
import { ChartPanel, LegendItem } from '@/components/common/charts/ChartPanel'
import {
  ORDINAL,
  STATUS_COLOR,
  formatPercent,
  formatVndCompact,
  formatVndFull,
} from '@/components/common/charts/chartTheme'
import { KpiLabel } from '@/components/common/charts/KpiLabel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { CUSTOMER_INSTALLATION_LABELS, INSTALLATION_STATUS_LABELS } from '@/common/installation'
import { earliest, installmentSplit, isLiveContract } from '@/features/dashboard/dashboardStats'
import { PROJECT_GROUPS, projectGroupOf, isOpenProject } from '@/features/dashboard/projectGroups'
import { whenText } from '@/features/dashboard/whenText'
import { formatDateVn, formatTime } from '@/features/scheduling/schedulingDisplay'
import { useCustomerSchedulesQuery } from '@/hooks/useInstallationSchedules'
import { useNow } from '@/hooks/useNow'
import { ROUTES, withId } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'

// Tiền và tiến độ trên trang Tổng quan của khách. Số tiền là số backend trả trong gói 30/70 của từng hợp đồng (đã trả, còn lại,
// hạn kế tiếp): không tự tính tiền điện tiết kiệm, hoàn vốn hay hiệu suất. Hợp đồng cũ trả 100% chỉ tính khi đã thanh toán xong

const PARTS = [
  { key: 'paid', label: 'Đã trả', color: STATUS_COLOR.ok },
  { key: 'due', label: 'Cần trả bây giờ', color: STATUS_COLOR.info },
  { key: 'overdue', label: 'Quá hạn', color: STATUS_COLOR.danger },
  { key: 'notYetDue', label: 'Chưa tới lúc trả (sau nghiệm thu)', color: STATUS_COLOR.neutral },
] as const

/** Các bước tiến độ khách thấy, bỏ "Cần sửa lại" (là một vòng của bước nghiệm thu) */
const PROGRESS_STEPS = PROJECT_GROUPS.filter((g) => g.key !== 'REWORK')

export function CustomerPaymentOverview({
  contracts,
  installations,
}: {
  contracts: ContractView[]
  installations: InstallationCustomerView[]
}) {
  const schedules = useCustomerSchedulesQuery()
  const now = useNow(60_000)
  const live = contracts.filter((c) => isLiveContract(c))
  const plans = live.filter((c) => c.paymentPlan)
  const legacyPaid = live.filter((c) => !c.paymentPlan && c.paymentCompleted)
  const paid = plans.reduce((s, c) => s + c.paymentPlan!.paid, 0) + legacyPaid.reduce((s, c) => s + c.totalAmount, 0)
  const outstanding = plans.reduce((s, c) => s + c.paymentPlan!.outstanding, 0)
  const nextDue = earliest(plans.filter((c) => !c.paymentPlan!.fullyPaid).map((c) => c.paymentPlan!.nextDueAt))
  const anyOverdue = plans.some((c) => c.paymentPlan!.overdue)
  // Lắp xong trước ngày hẹn thì lịch vẫn CONFIRMED: bỏ lịch của công trình đã bàn giao hoặc đã huỷ
  const nextSchedule = (schedules.data ?? [])
    .filter(
      (s) =>
        s.status === 'CONFIRMED' &&
        new Date(s.endsAt).getTime() >= now &&
        (!s.projectStatus || isOpenProject(s.projectStatus)),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
  const project = installations.find((p) => isOpenProject(p.status))

  if (plans.length === 0 && legacyPaid.length === 0 && !project) return null

  const stepIndex = project ? PROGRESS_STEPS.findIndex((g) => g.key === projectGroupOf(project.status)) : -1
  const rework = project?.status === 'REWORK_REQUIRED'
  // Đang sửa lại: vẫn ở bước nghiệm thu
  const current = rework ? PROGRESS_STEPS.findIndex((g) => g.key === 'ACCEPTANCE') : stepIndex

  return (
    <section aria-label="Thanh toán và tiến độ" className="space-y-4">
      <StatRow framed>
        <Stat
          label={<KpiLabel label="Đã thanh toán" hint="Tiền đã xác minh của hợp đồng 30/70 và hợp đồng đã trả đủ" />}
          value={formatVndCompact(paid)}
          note={formatVndFull(paid)}
        />
        <Stat
          label={<KpiLabel label="Còn lại" hint="Các khoản 30/70 chưa trả, gồm cả 70% chưa tới lúc trả" />}
          value={formatVndCompact(outstanding)}
          tone={anyOverdue ? 'danger' : 'default'}
          note={anyOverdue ? 'Có khoản quá hạn' : outstanding > 0 ? 'Chưa phải trả hết ngay' : 'Không còn khoản nào'}
        />
        <Stat
          label="Hạn thanh toán tiếp theo"
          value={nextDue ? formatDateVn(nextDue) : '—'}
          note={nextDue ? `Trước ${formatTime(nextDue)}` : 'Khoản 70% có hạn sau khi bạn nghiệm thu'}
        />
        <Stat
          label="Lịch thi công"
          value={nextSchedule ? formatDateVn(nextSchedule.startsAt) : '—'}
          note={
            nextSchedule
              ? `${whenText(nextSchedule.startsAt, nextSchedule.endsAt)}, ${nextSchedule.propertyName}`
              : schedules.isPending
                ? 'Đang tải…'
                : 'Chưa có lịch đã xác nhận'
          }
        />
      </StatRow>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {plans.length > 0 && (
          <ChartPanel
            title="Thanh toán theo hợp đồng"
            scope="Gói 30/70"
            description="Mỗi thanh là một hợp đồng: phần đã trả, cần trả và chưa tới lúc trả. Bấm để mở hợp đồng."
            table={{
              caption: 'Thanh toán theo hợp đồng',
              columns: [{ label: 'Hợp đồng' }, ...PARTS.map((p) => ({ label: p.label, numeric: true }))],
              rows: plans.map((c) => {
                const split = installmentSplit(c.paymentPlan!.installments)
                return {
                  key: c.contractId,
                  cells: [c.contractNumber, ...PARTS.map((p) => formatVndFull(split[p.key]))],
                }
              }),
            }}
          >
            <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
              {PARTS.map((p) => (
                <LegendItem key={p.key} color={p.color} label={p.label} />
              ))}
            </ul>
            <ul className="space-y-3">
              {plans.map((c) => {
                const split = installmentSplit(c.paymentPlan!.installments)
                const total = PARTS.reduce((s, p) => s + split[p.key], 0)
                return (
                  <li key={c.contractId}>
                    <Link
                      to={withId(ROUTES.customer.contract, c.contractId)}
                      className="-mx-2 block rounded-control px-2 py-1 hover:bg-hover"
                      aria-label={`Hợp đồng ${c.contractNumber}: ${PARTS.map((p) => `${p.label} ${formatVndFull(split[p.key])}`).join(', ')}`}
                    >
                      <span className="flex items-baseline gap-2 text-body">
                        <span className="tnum font-medium text-fg">{c.contractNumber}</span>
                        <span className="tnum ml-auto text-meta text-fg-2">
                          Đã trả {formatPercent(split.paid, total)} / {formatVndCompact(total)}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="mt-1.5 flex h-3 w-full gap-0.5 overflow-hidden rounded-control bg-surface-2"
                      >
                        {PARTS.map((p) =>
                          split[p.key] > 0 ? (
                            <span
                              key={p.key}
                              className="h-3 first:rounded-l-control last:rounded-r-control"
                              style={{ width: `${(split[p.key] / total) * 100}%`, backgroundColor: p.color }}
                            />
                          ) : null,
                        )}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </ChartPanel>
        )}

        {project && (
          <ChartPanel
            title="Tiến độ lắp đặt"
            scope="Hiện tại"
            description={`Trạng thái: ${CUSTOMER_INSTALLATION_LABELS[project.status] ?? INSTALLATION_STATUS_LABELS[project.status] ?? project.status}.`}
            action={
              <Link to={withId(ROUTES.customer.project, project.projectId)} className="ui-link text-meta">
                Xem công trình
              </Link>
            }
          >
            <ol className="space-y-2" aria-label={`Bước ${current + 1} trên ${PROGRESS_STEPS.length}`}>
              {PROGRESS_STEPS.map((g, i) => {
                const state = i < current ? 'done' : i === current ? 'active' : 'upcoming'
                return (
                  <li key={g.key} className="flex items-center gap-3 text-body">
                    <span
                      aria-hidden
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-meta font-semibold"
                      style={{
                        backgroundColor:
                          state === 'upcoming' ? 'var(--surface-2)' : ORDINAL[Math.min(i, ORDINAL.length - 1)],
                        color: state === 'upcoming' ? 'var(--fg-3)' : i >= 2 ? 'var(--on-accent)' : 'var(--fg)',
                      }}
                    >
                      {state === 'done' ? '✓' : i + 1}
                    </span>
                    <span
                      className={
                        state === 'upcoming' ? 'text-fg-3' : state === 'active' ? 'font-semibold text-fg' : 'text-fg-2'
                      }
                    >
                      {g.key === 'ACCEPTANCE' && rework ? 'Đang sửa lại theo yêu cầu của bạn' : g.label}
                    </span>
                    {state === 'active' && <span className="sr-only">(bước hiện tại)</span>}
                  </li>
                )
              })}
            </ol>
          </ChartPanel>
        )}
      </div>
    </section>
  )
}
