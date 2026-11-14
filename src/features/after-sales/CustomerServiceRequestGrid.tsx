import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink } from '@/components/common/ui/button'
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

export function CustomerServiceRequestGrid({
  rows,
  projectContracts,
  detailPattern,
}: {
  rows: ServiceRequestSummary[]
  projectContracts: Map<string, string>
  detailPattern: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => {
        const todo = isTodo(r.status, 'customer')
        const kindBadge = customerRequestKindBadge(r.kind)
        const statusBadge = customerRequestStatusBadge(r.status)
        const contractCode = projectContracts.get(r.projectId) ?? shortCode(r.projectId)

        return (
          <div
            key={r.requestId}
            className="flex flex-col justify-between rounded-container border border-line bg-canvas p-4 transition-colors hover:bg-surface-2/30"
          >
            <div>
              {/* Header: Icon + Request ID + Kind Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-line/30 bg-accent-soft text-primary">
                    <Icon name="build" className="text-[20px]" />
                  </div>
                  <div>
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

                <span
                  className={cx(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-control px-2.5 py-1 text-meta font-medium select-none',
                    kindBadge.className,
                  )}
                >
                  <Icon name={kindBadge.icon} className="text-[16px]" />
                  <span>{kindBadge.label}</span>
                </span>
              </div>

              {/* Meta details */}
              <div className="mt-4 space-y-2 border-t border-line/60 pt-3 text-meta text-fg">
                <div className="flex items-center gap-2">
                  <Icon name="description" className="text-[16px] text-fg-2 shrink-0" />
                  <span className="text-fg-2">Hợp đồng:</span>
                  <span className="tnum font-medium text-fg">{contractCode}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Icon name="calendar_today" className="text-[16px] text-fg-3 shrink-0" />
                  <span className="text-fg-2">Thời gian tạo:</span>
                  <span className="tnum text-fg">{formatRequestCreatedAt(r.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Icon name="info" className="text-[16px] text-fg-3 shrink-0" />
                  <span className="text-fg-2">Trạng thái:</span>
                  <span
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-meta font-medium select-none',
                      statusBadge.className,
                    )}
                  >
                    <Icon name={statusBadge.icon} className="text-[16px]" />
                    <span>{statusBadge.label}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="mt-4 pt-2">
              <ButtonLink
                to={withId(detailPattern, r.requestId)}
                size="sm"
                variant="secondary"
                icon={todo ? 'arrow_forward' : 'visibility'}
                className="w-full justify-center rounded-control border-primary font-medium text-primary hover:bg-accent-soft"
              >
                {todo ? 'Xử lý' : 'Xem'}
              </ButtonLink>
            </div>
          </div>
        )
      })}
    </div>
  )
}
