import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink, IconButton } from '@/components/common/ui/button'
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

export function CustomerInstallationTable({ items }: { items: InstallationCustomerView[] }) {
  return (
    <div className="overflow-hidden rounded-container border border-line bg-canvas">
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2/40 text-meta font-semibold text-fg-2">
              <th scope="col" className="px-4 py-3 font-semibold">
                Công trình
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Hợp đồng
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Trạng thái
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Thời gian
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Kỹ thuật viên
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p) => {
              const decide = awaitsCustomerDecision(p)
              const phaseLabel = formatProjectPhaseLabel(p)
              const timeInfo = formatProjectDateTime(p)
              const statusBadge = customerProjectStatusBadge(p)

              return (
                <tr key={p.projectId} className="transition-colors hover:bg-surface-2/40">
                  {/* Cột Công trình */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-line/30 bg-accent-soft text-primary">
                        <Icon name="solar_power" className="text-[20px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-body font-bold text-fg">
                          Công trình <span className="tnum">{shortCode(p.projectId)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-meta text-fg-2">
                          <Icon name="location_on" className="text-[16px] text-fg-3 shrink-0" />
                          <span>{phaseLabel}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Cột Hợp đồng */}
                  <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-1.5 text-meta text-fg">
                      <Icon name="description" className="text-[16px] text-fg-2 shrink-0" />
                      <span className="tnum font-medium">{shortCode(p.contractId)}</span>
                    </div>
                  </td>

                  {/* Cột Trạng thái */}
                  <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                    <span
                      className={cx(
                        'inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-meta font-medium select-none',
                        statusBadge.className,
                      )}
                    >
                      <Icon name={statusBadge.icon} className="text-[16px]" />
                      <span>{statusBadge.label}</span>
                    </span>
                  </td>

                  {/* Cột Thời gian */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-start gap-1.5 text-meta text-fg">
                      <Icon name="calendar_today" className="mt-0.5 shrink-0 text-[16px] text-fg-3" />
                      {timeInfo.isRange ? (
                        <div className="tnum leading-snug">
                          <div>{timeInfo.start} –</div>
                          <div>{timeInfo.end}</div>
                        </div>
                      ) : (
                        <span className="tnum">{timeInfo.start}</span>
                      )}
                    </div>
                  </td>

                  {/* Cột Kỹ thuật viên */}
                  <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-1.5 text-meta text-fg">
                      <Icon name="person" className="text-[16px] text-fg-3 shrink-0" />
                      <span>Kỹ thuật viên {p.technicianName ?? 'Kỹ sư dự án'}</span>
                    </div>
                  </td>

                  {/* Cột Thao tác */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-right align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <ButtonLink
                        to={withId(ROUTES.customer.project, p.projectId)}
                        size="sm"
                        variant="secondary"
                        icon="visibility"
                        className="rounded-control border-primary font-medium text-primary hover:bg-accent-soft"
                      >
                        {decide ? 'Xem và nghiệm thu' : 'Xem tiến độ'}
                      </ButtonLink>
                      <IconButton
                        icon="more_vert"
                        label="Tuỳ chọn"
                        size="sm"
                        variant="ghost"
                        className="text-fg-3 hover:text-fg"
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
