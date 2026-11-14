import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink } from '@/components/common/ui/button'
import {
  customerProjectStatusBadge,
  formatProjectDateTime,
  formatProjectPhaseLabel,
} from '@/features/installations/customerInstallationDisplay'
import { awaitsCustomerDecision } from '@/features/installations/installationDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import { cx } from '@/utils/cx'

export function CustomerInstallationGrid({ items }: { items: InstallationCustomerView[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => {
        const decide = awaitsCustomerDecision(p)
        const phaseLabel = formatProjectPhaseLabel(p)
        const timeInfo = formatProjectDateTime(p)
        const statusBadge = customerProjectStatusBadge(p)

        return (
          <div
            key={p.projectId}
            className="flex flex-col justify-between rounded-container border border-line bg-canvas p-4 transition-colors hover:bg-surface-2/30"
          >
            <div>
              {/* Card Header: Icon + Project ID + Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-line/30 bg-accent-soft text-primary">
                    <Icon name="solar_power" className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="text-body font-bold text-fg">
                      Công trình <span className="tnum">{shortCode(p.projectId)}</span>
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1 text-meta text-fg-2">
                      <Icon name="location_on" className="text-[16px] text-fg-3 shrink-0" />
                      <span>{phaseLabel}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={cx(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-control px-2.5 py-1 text-meta font-medium select-none',
                    statusBadge.className,
                  )}
                >
                  <Icon name={statusBadge.icon} className="text-[16px]" />
                  <span>{statusBadge.label}</span>
                </span>
              </div>

              {/* Card Meta details */}
              <div className="mt-4 space-y-2 border-t border-line/60 pt-3 text-meta text-fg">
                <div className="flex items-center gap-2">
                  <Icon name="description" className="text-[16px] text-fg-2 shrink-0" />
                  <span className="text-fg-2">Hợp đồng:</span>
                  <span className="tnum font-medium text-fg">{shortCode(p.contractId)}</span>
                </div>

                <div className="flex items-start gap-2">
                  <Icon name="calendar_today" className="mt-0.5 text-[16px] text-fg-3 shrink-0" />
                  <div className="min-w-0">
                    {timeInfo.isRange ? (
                      <span className="tnum">
                        {timeInfo.start} – {timeInfo.end}
                      </span>
                    ) : (
                      <span className="tnum">{timeInfo.start}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Icon name="person" className="text-[16px] text-fg-3 shrink-0" />
                  <span>Kỹ thuật viên {p.technicianName ?? 'Kỹ sư dự án'}</span>
                </div>
              </div>
            </div>

            {/* Card Action */}
            <div className="mt-4 pt-2">
              <ButtonLink
                to={withId(ROUTES.customer.project, p.projectId)}
                size="sm"
                variant="secondary"
                icon="visibility"
                className="w-full justify-center rounded-control border-primary font-medium text-primary hover:bg-accent-soft"
              >
                {decide ? 'Xem và nghiệm thu' : 'Xem tiến độ'}
              </ButtonLink>
            </div>
          </div>
        )
      })}
    </div>
  )
}
