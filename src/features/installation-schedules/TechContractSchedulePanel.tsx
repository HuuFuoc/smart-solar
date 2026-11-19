import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState } from '@/components/common/ui/states'
import { ScheduleDialog } from '@/features/installation-schedules/ScheduleDialog'
import { ScheduleHistory } from '@/features/installation-schedules/ScheduleHistory'
import {
  rescheduleReasonText,
  scheduleErrorMessage,
  scheduleStatusMeta,
  scheduleWhen,
} from '@/features/installation-schedules/scheduleDisplay'
import { liveSchedule, projectLocksSchedule } from '@/features/installation-schedules/scheduleRules'
import { useTechnicianContractScheduleQuery } from '@/hooks/useInstallationSchedules'
import { ROUTES, withId } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'

// Lịch thi công trên trang hợp đồng 30/70 của kỹ thuật viên đã khảo sát: hẹn ngày đã thống nhất trực tiếp với khách từ khi khoản
// 30% được xác minh. Chưa chốt các trang hợp đồng giấy thì lịch chỉ là dự kiến (`awaitingContractSignature`); chốt xong backend tự
// xác nhận, lập dự án thi công và phân công. Không có khung để khách tự chọn (đã bỏ)

export function TechContractSchedulePanel({ contract }: { contract: ContractView }) {
  const query = useTechnicianContractScheduleQuery(contract.contractId)
  const [planning, setPlanning] = useState(false)
  const history = query.data ?? []
  const live = liveSchedule(history)
  const status = live ? scheduleStatusMeta(live.status, 'staff') : null
  const locked = projectLocksSchedule(live?.projectStatus)

  return (
    <Panel id="installation-schedule" className="scroll-mt-6">
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Lịch thi công {status && <Badge tone={status.tone}>{status.label}</Badge>}
          </span>
        }
        description={live ? scheduleWhen(live) : undefined}
      />
      <PanelBody className="space-y-4">
        {query.isPending ? (
          <p className="text-body text-fg-2">Đang tải lịch thi công…</p>
        ) : query.data === undefined ? (
          <ErrorState
            title="Không tải được lịch thi công."
            message={scheduleErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            {!live ? (
              <p className="text-body text-fg-2">Chưa hẹn ngày. Thống nhất ngày với khách rồi ghi lại ở đây.</p>
            ) : live.status === 'PLANNED' && live.awaitingContractSignature ? (
              <Notice title="Lịch dự kiến, chờ ký hợp đồng giấy">
                Chốt đủ các trang hợp đồng giấy đã ký thì lịch được xác nhận tự động.
              </Notice>
            ) : live.status === 'RESCHEDULE_REQUIRED' ? (
              <Notice tone="warn" title="Lịch không xác nhận được, cần hẹn lại">
                {rescheduleReasonText(live.rescheduleReasonCode)}
              </Notice>
            ) : null}
            <div className="flex flex-wrap gap-3">
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
            {locked && <p className="text-meta text-fg-2">Đã bắt đầu thi công nên không đổi lịch ở đây.</p>}
            {history.length > 0 && <ScheduleHistory history={history} viewer="staff" />}
          </>
        )}
      </PanelBody>
      {planning && (
        <ScheduleDialog
          contractId={contract.contractId}
          title={`Hợp đồng ${contract.contractNumber}`}
          live={live}
          by="technician"
          onClose={() => setPlanning(false)}
        />
      )}
    </Panel>
  )
}
