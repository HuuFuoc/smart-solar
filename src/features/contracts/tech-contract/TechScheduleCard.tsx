import { useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { CardTitle, TechCard } from '@/features/contracts/tech-contract/TechCardParts'
import { TONE_TEXT } from '@/features/contracts/tech-contract/techContractDisplay'
import { ScheduleDialog } from '@/features/installation-schedules/ScheduleDialog'
import { ScheduleHistory } from '@/features/installation-schedules/ScheduleHistory'
import {
  rescheduleReasonText,
  scheduleErrorMessage,
  scheduleStatusMeta,
  scheduleWhen,
} from '@/features/installation-schedules/scheduleDisplay'
import { liveSchedule, projectLocksSchedule } from '@/features/installation-schedules/scheduleRules'
import { formatDay, formatMoment, formatTimeRange, vnDate } from '@/features/scheduling/schedulingDisplay'
import { useTechnicianContractScheduleQuery } from '@/hooks/useInstallationSchedules'
import { ROUTES, withId } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'
import { cx } from '@/utils/cx'

// Thẻ "Lịch thi công" của trang hợp đồng 30/70 phía kỹ thuật viên đã khảo sát: cùng luật với TechContractSchedulePanel (hẹn ngày
// từ khi khoản 30% được xác minh, chốt hợp đồng giấy thì backend tự xác nhận và lập dự án thi công), vẽ theo thiết kế 26/11/2026

export function TechScheduleCard({ contract }: { contract: ContractView }) {
  const query = useTechnicianContractScheduleQuery(contract.contractId)
  const [planning, setPlanning] = useState(false)
  const history = query.data ?? []
  const live = liveSchedule(history)
  const status = live ? scheduleStatusMeta(live.status, 'staff') : null
  const locked = projectLocksSchedule(live?.projectStatus)
  const sameDay = live ? vnDate(live.startsAt) === vnDate(live.endsAt) : false

  return (
    <TechCard id="installation-schedule" className="scroll-mt-6" aria-labelledby="tech-schedule">
      <CardTitle
        id="tech-schedule"
        icon="calendar_month"
        aside={status && <span className={cx('font-semibold', TONE_TEXT[status.tone])}>{status.label}</span>}
      >
        Lịch thi công, người phụ trách
      </CardTitle>
      {query.isPending ? (
        <Skeleton className="h-24" />
      ) : query.data === undefined ? (
        <ErrorState
          title="Không tải được lịch thi công."
          message={scheduleErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {live ? (
              <div className="min-w-0 space-y-1">
                <p className="text-title font-bold text-fg">
                  {sameDay ? formatDay(vnDate(live.startsAt), { year: true }) : scheduleWhen(live)}
                </p>
                {sameDay && (
                  <p className="text-body text-fg">
                    Khung giờ: <span className="tnum font-semibold">{formatTimeRange(live.startsAt, live.endsAt)}</span>
                  </p>
                )}
                <p className="text-meta text-fg-2">
                  Kỹ thuật viên: <span className="font-medium text-fg">{live.technicianName}</span>, ghi lúc{' '}
                  <span className="tnum">{formatMoment(live.createdAt)}</span>
                </p>
              </div>
            ) : (
              <p className="min-w-0 flex-1 text-body text-fg-2">
                Chưa hẹn ngày. Thống nhất ngày với khách rồi ghi lại ở đây.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {!locked && (
                <Button icon="event_available" variant="soft" onClick={() => setPlanning(true)}>
                  {live ? 'Đổi ngày' : 'Hẹn ngày'}
                </Button>
              )}
              {/* Lịch xác nhận thì backend đã lập dự án thi công: bắt đầu, ảnh, thiết bị, báo cáo hoàn thành làm ở đó */}
              {live?.projectId && (
                <ButtonLink to={withId(ROUTES.tech.installation, live.projectId)} variant="info" icon="construction">
                  Mở công trình
                </ButtonLink>
              )}
            </div>
          </div>

          {live?.status === 'PLANNED' && live.awaitingContractSignature ? (
            <Notice title="Lịch dự kiến, chờ ký hợp đồng giấy">
              Chốt đủ các trang hợp đồng giấy đã ký thì lịch được xác nhận tự động.
            </Notice>
          ) : live?.status === 'RESCHEDULE_REQUIRED' ? (
            <Notice tone="warn" title="Lịch không xác nhận được, cần hẹn lại">
              {rescheduleReasonText(live.rescheduleReasonCode)}
            </Notice>
          ) : null}
          {locked && <p className="text-meta text-fg-2">Đã bắt đầu thi công nên không đổi lịch ở đây.</p>}

          {history.length > 1 && (
            <details className="ct-dashed group px-3 py-1.5">
              <summary className="tap flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-body font-semibold text-fg [&::-webkit-details-marker]:hidden">
                Lịch sử hẹn ({history.length})
                <Icon name="expand_more" className="text-[20px] text-fg-2 group-open:rotate-180" />
              </summary>
              <div className="pt-2 pb-2">
                <ScheduleHistory history={history} viewer="staff" />
              </div>
            </details>
          )}
        </div>
      )}
      {planning && (
        <ScheduleDialog
          contractId={contract.contractId}
          title={`Hợp đồng ${contract.contractNumber}`}
          live={live}
          by="technician"
          onClose={() => setPlanning(false)}
        />
      )}
    </TechCard>
  )
}
