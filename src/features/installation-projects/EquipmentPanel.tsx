import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { installationErrorMessage } from '@/features/installation-projects/projectDisplay'
import { EquipmentDifferences } from '@/features/installations/EquipmentDifferences'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useApproveSubstitutionMutation } from '@/hooks/useManagerInstallations'
import type { InstallationStaffView } from '@/types/res/managerInstallationsRes'

// Tấm pin, inverter đã lắp khác hợp đồng. Quản lý duyệt (ghi lý do) khi đang thi công, đang sửa lại hoặc chờ khách nghiệm
// thu; sau đó khách phải đồng ý mới nghiệm thu được. Quản trị chỉ xem. Khớp hợp đồng hoặc hợp đồng không có thiết bị trong
// danh mục thì không hiện

const STATUS_TEXT: Record<string, { tone: 'warn' | 'info' | 'ok' | 'neutral'; title: string }> = {
  SUBSTITUTION_APPROVAL_REQUIRED: { tone: 'warn', title: 'Thiết bị đã lắp khác hợp đồng, chờ quản lý duyệt' },
  CUSTOMER_APPROVAL_REQUIRED: { tone: 'info', title: 'Quản lý đã duyệt, chờ khách đồng ý' },
  SUBSTITUTION_APPROVED: { tone: 'ok', title: 'Quản lý và khách đã đồng ý thay thiết bị' },
  NOT_CHECKED_AT_HANDOVER: { tone: 'neutral', title: 'Bàn giao trước khi có bước đối chiếu thiết bị' },
}

const canApproveStatus = (status: string) =>
  status === 'IN_PROGRESS' || status === 'REWORK_REQUIRED' || status === 'PENDING_CUSTOMER_ACCEPTANCE'

export function EquipmentPanel({ project: p, canApprove }: { project: InstallationStaffView; canApprove: boolean }) {
  const approve = useApproveSubstitutionMutation(p.projectId)
  const [open, setOpen] = useState(false)
  const equipment = p.equipment
  const meta = equipment && STATUS_TEXT[equipment.status]
  if (!equipment || !meta) return null
  const approvable = canApprove && equipment.status === 'SUBSTITUTION_APPROVAL_REQUIRED' && canApproveStatus(p.status)

  return (
    <Panel>
      <PanelHeader title="Thiết bị khác hợp đồng" />
      <PanelBody className="space-y-4">
        <Notice tone={meta.tone} title={meta.title}>
          {equipment.managerApproval ? (
            <span className="whitespace-pre-line">
              Quản lý duyệt lúc <span className="tnum">{formatMoment(equipment.managerApproval.at)}</span>:{' '}
              {equipment.managerApproval.reason}
            </span>
          ) : equipment.status === 'SUBSTITUTION_APPROVAL_REQUIRED' ? (
            'Kỹ thuật viên chưa gửi được báo cáo hoàn thành cho tới khi quản lý duyệt.'
          ) : (
            'Chênh lệch chỉ để tra cứu, không cần duyệt nữa.'
          )}
          {equipment.customerApproval && (
            <p className="mt-1">
              Khách đồng ý lúc <span className="tnum">{formatMoment(equipment.customerApproval.at)}</span>.
            </p>
          )}
        </Notice>
        <EquipmentDifferences items={equipment.differences} />
        {approvable && (
          <Button icon="fact_check" variant="soft" onClick={() => setOpen(true)}>
            Duyệt thay thiết bị
          </Button>
        )}
      </PanelBody>
      <ReasonDialog
        open={open}
        title="Duyệt thay thiết bị?"
        description="Khách xem lý do này và phải đồng ý trước khi nghiệm thu. Kỹ thuật viên ghi thêm thiết bị sau đó thì phải duyệt lại."
        label="Lý do lắp khác hợp đồng"
        maxLength={400}
        submitLabel="Duyệt"
        icon="fact_check"
        onSubmit={async (reason) => {
          try {
            await approve.mutateAsync({ reason, expectedRevision: p.revision })
          } catch (e) {
            throw new Error(installationErrorMessage(e))
          }
          toast.success('Đã duyệt thay thiết bị. Chờ khách đồng ý.')
        }}
        onClose={() => setOpen(false)}
      />
    </Panel>
  )
}
