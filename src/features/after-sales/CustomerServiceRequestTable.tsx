import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink, IconButton } from '@/components/common/ui/button'
import {
  customerRequestKindBadge,
  customerRequestStatusBadge,
  formatRequestCreatedAt,
} from '@/features/after-sales/customerAfterSalesDisplay'
import { isTodo } from '@/features/after-sales/serviceDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'
import { cx } from '@/utils/cx'

export function CustomerServiceRequestTable({
  rows,
  projectContracts,
  detailPattern,
}: {
  rows: ServiceRequestSummary[]
  projectContracts: Map<string, string>
  detailPattern: string
}) {
  return (
    <div className="overflow-hidden rounded-container border border-line bg-canvas">
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-2/40 text-meta font-semibold text-fg-2">
              <th scope="col" className="px-4 py-3 font-semibold">
                Mã yêu cầu
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Loại
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Hợp đồng
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Thời gian tạo
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Trạng thái
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const todo = isTodo(r.status, 'customer')
              const kindBadge = customerRequestKindBadge(r.kind)
              const statusBadge = customerRequestStatusBadge(r.status)
              const contractCode = projectContracts.get(r.projectId) ?? shortCode(r.projectId)

              return (
                <tr key={r.requestId} className="transition-colors hover:bg-surface-2/40">
                  {/* Mã yêu cầu */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-line/30 bg-accent-soft text-primary">
                        <Icon name="build" className="text-[20px]" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={withId(detailPattern, r.requestId)}
                          className="tnum block text-body font-bold text-fg hover:underline"
                        >
                          {r.requestNumber}
                        </Link>
                        <p className="mt-0.5 line-clamp-1 text-meta text-fg-2">
                          {r.description || 'Dịch vụ bảo hành/sửa chữa'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Loại */}
                  <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                    <span
                      className={cx(
                        'inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-meta font-medium select-none',
                        kindBadge.className,
                      )}
                    >
                      <Icon name={kindBadge.icon} className="text-[16px]" />
                      <span>{kindBadge.label}</span>
                    </span>
                  </td>

                  {/* Hợp đồng */}
                  <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-1.5 text-meta text-fg">
                      <Icon name="description" className="text-[16px] text-fg-2 shrink-0" />
                      <span className="tnum font-medium">{contractCode}</span>
                    </div>
                  </td>

                  {/* Thời gian tạo */}
                  <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-1.5 text-meta text-fg">
                      <Icon name="calendar_today" className="text-[16px] text-fg-3 shrink-0" />
                      <span className="tnum">{formatRequestCreatedAt(r.createdAt)}</span>
                    </div>
                  </td>

                  {/* Trạng thái */}
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

                  {/* Thao tác */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-right align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <ButtonLink
                        to={withId(detailPattern, r.requestId)}
                        size="sm"
                        variant="secondary"
                        icon={todo ? 'arrow_forward' : 'visibility'}
                        className="rounded-control border-primary font-medium text-primary hover:bg-accent-soft"
                      >
                        {todo ? 'Xử lý' : 'Xem'}
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
