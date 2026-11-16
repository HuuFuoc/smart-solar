import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink } from '@/components/common/ui/button'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { isTodo, requestKindLabel, requestStatusMeta, type ServiceViewer } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

// Danh sách yêu cầu dạng cột của quản lý. `detailPattern` là đường dẫn chi tiết có ":id"

const COLUMNS = 'lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_7rem]'
const LABELS = ['Yêu cầu & nội dung sự cố', 'Phân loại', 'Ngày gửi', 'Tình hình', 'Thao tác']

const TAG_TONES = ['ok', 'info', 'warn', 'danger'] as const
const DOT: Record<string, string> = { danger: 'bg-danger', ok: 'bg-ok', info: 'bg-info', neutral: 'bg-fg-3' }
/** Yêu cầu đã đóng mà không hoàn thành */
const DROPPED = ['CANCELLED', 'NOT_COMPLETED', 'CLOSED_DUPLICATE']

export function ServiceRequestList({
  rows,
  viewer,
  detailPattern,
}: {
  rows: ServiceRequestSummary[]
  viewer: ServiceViewer
  detailPattern: string
}) {
  return (
    <div>
      <div className="bg-surface-2 px-4">
        <ListHead columns={COLUMNS} labels={LABELS} />
      </div>
      <ul className="divide-y divide-line border-t border-line px-4">
        {rows.map((r) => {
          const status = requestStatusMeta(r.status, viewer)
          const todo = isTodo(r.status, viewer)
          const fault = r.kind === 'FAULT'
          const to = withId(detailPattern, r.requestId)
          const when = formatMoment(r.createdAt)
          const [day, time] = [when.slice(0, 10), when.slice(11)]
          return (
            <ListRow key={r.requestId}>
              <ListCells columns={COLUMNS}>
                <ListCell wide>
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-2 size-2 shrink-0 rounded-full ${DOT[status.tone] ?? 'bg-fg-3'}`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <Link to={to} className="tnum font-semibold text-fg hover:underline">
                          {r.requestNumber}
                        </Link>
                        <span className="sv-tag" data-tone={fault ? 'warn' : 'info'}>
                          {fault ? 'Báo lỗi' : 'Bảo trì'}
                        </span>
                      </p>
                      <p className="mt-1 line-clamp-2 text-body text-fg-2">{r.description}</p>
                    </div>
                  </div>
                </ListCell>
                <ListCell label="Phân loại">
                  <span className="sv-tag" data-tone="plain">
                    {requestKindLabel(r.kind)}
                  </span>
                </ListCell>
                <ListCell label="Ngày gửi" className="tnum">
                  <span className="flex items-center gap-1.5">
                    <Icon name="calendar_today" className="text-[16px] text-fg-3" />
                    <span>
                      {day} <span className="text-fg-3">{time}</span>
                    </span>
                  </span>
                </ListCell>
                <ListCell label="Tình hình">
                  <span
                    className="sv-tag"
                    data-tone={TAG_TONES.find((t) => t === status.tone) ?? 'neutral'}
                    data-shape="pill"
                  >
                    {status.tone === 'ok' && <Icon name="check" className="text-[16px]" />}
                    {DROPPED.includes(r.status) && <Icon name="close" className="text-[16px]" />}
                    {status.label}
                  </span>
                </ListCell>
                <ListCell wide className="lg:justify-self-end">
                  <ButtonLink icon={todo ? 'arrow_forward' : 'visibility'} variant="info" to={to} size="sm">
                    {todo ? 'Xử lý' : 'Xem'}
                  </ButtonLink>
                </ListCell>
              </ListCells>
            </ListRow>
          )
        })}
      </ul>
    </div>
  )
}
