import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import {
  awaitsCustomerDecision,
  formatInstallationWindow,
  installationStatusMeta,
} from '@/features/installations/installationDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { ROUTES, withId } from '@/routes/paths'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'

// Công trình lắp đặt của khách. Chờ nghiệm thu lên đầu, rồi đang làm theo lịch gần nhất, rồi đã bàn giao, cuối cùng đã huỷ
function rank(p: InstallationCustomerView) {
  if (awaitsCustomerDecision(p)) return 0
  if (p.status === 'COMPLETED') return 2
  if (p.status === 'CANCELLED') return 3
  return 1
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY)

function byNextAction(a: InstallationCustomerView, b: InstallationCustomerView) {
  const diff = rank(a) - rank(b)
  if (diff !== 0) return diff
  if (a.status === 'COMPLETED' && b.status === 'COMPLETED') return time(b.handoverAt) - time(a.handoverAt)
  return time(a.scheduledStartsAt) - time(b.scheduledStartsAt)
}

function summary(p: InstallationCustomerView) {
  if (p.status === 'COMPLETED') return `Bàn giao ${formatMoment(p.handoverAt)}`
  if (p.status === 'CANCELLED') return `Đã huỷ ${formatMoment(p.cancelledAt)}`
  const range = formatInstallationWindow(p.scheduledStartsAt, p.scheduledEndsAt)
  return range ? `Lắp đặt ${range}` : 'Chưa có lịch lắp đặt'
}

export function CustomerProjectsPage() {
  const query = useMyInstallationsQuery()
  const waiting = query.data?.filter(awaitsCustomerDecision).length ?? 0

  return (
    <>
      <PageHeader
        title="Công trình lắp đặt"
        description={
          waiting > 0 ? (
            <Badge tone="danger" icon="task_alt">
              {waiting} công trình chờ bạn nghiệm thu
            </Badge>
          ) : undefined
        }
      />
      <QueryBoundary query={query}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title="Chưa có công trình lắp đặt"
              description="Công trình hiện ở đây khi hợp đồng đã thanh toán và Smart Solar lập kế hoạch lắp đặt."
            />
          ) : (
            <ul className="divide-y divide-line">
              {[...rows].sort(byNextAction).map((p) => {
                const status = installationStatusMeta(p.status, 'customer')
                const decide = awaitsCustomerDecision(p)
                return (
                  <ListRow key={p.projectId}>
                    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <h2 className="text-title font-semibold">
                          Công trình <span className="tnum">{shortCode(p.projectId)}</span>
                        </h2>
                        <p className="mt-1 text-body text-fg-2">
                          Hợp đồng <span className="tnum">{shortCode(p.contractId)}</span>
                        </p>
                        <p className="mt-2 text-body text-fg">
                          {summary(p)}
                          {p.technicianName && <span className="text-fg-2">, kỹ thuật viên {p.technicianName}</span>}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <ButtonLink to={withId(ROUTES.customer.project, p.projectId)} size="sm" variant="soft">
                          {decide ? 'Xem và nghiệm thu' : 'Xem tiến độ'}
                        </ButtonLink>
                      </div>
                    </div>
                  </ListRow>
                )
              })}
            </ul>
          )
        }
      </QueryBoundary>
    </>
  )
}
