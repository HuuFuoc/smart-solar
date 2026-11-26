import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Radio } from '@/components/common/ui/field'
import { ReportFaultDialog } from '@/features/after-sales/ReportFaultDialog'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useWarrantyQuery } from '@/hooks/useCustomerServiceRequests'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'

// Báo lỗi từ trang "Bảo hành, sửa chữa" (không phải từ một công trình): chỉ công trình đã bàn giao mới báo lỗi được (backend
// AFTER_SALES_NOT_HANDED_OVER). Một công trình thì mở thẳng hộp báo lỗi, nhiều công trình thì hỏi chọn trước

export function FaultReportFlow({ projects, onClose }: { projects: InstallationCustomerView[]; onClose: () => void }) {
  const [projectId, setProjectId] = useState<string | null>(projects.length === 1 ? projects[0]!.projectId : null)
  const [picked, setPicked] = useState<string | null>(null)
  const contracts = useMyContractsQuery()
  const numbers = new Map((contracts.data ?? []).map((c) => [c.contractId, c.contractNumber]))
  if (projectId) return <FaultFor projectId={projectId} onClose={onClose} />
  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && onClose()}
      aria-label="Báo lỗi cho công trình nào"
      className="max-w-lg"
    >
      <DialogTitle>Báo lỗi cho công trình nào?</DialogTitle>
      <fieldset className="mt-4">
        <legend className="sr-only">Công trình đã bàn giao</legend>
        <ul className="divide-y divide-line border-y border-line">
          {projects.map((p) => (
            <li key={p.projectId} className="py-2">
              <Radio
                name="fault-project"
                checked={picked === p.projectId}
                onChange={() => setPicked(p.projectId)}
                label={`Hợp đồng ${numbers.get(p.contractId) ?? shortCode(p.contractId)}`}
                description={p.handoverAt ? `Bàn giao ${formatMoment(p.handoverAt)}` : undefined}
              />
            </li>
          ))}
        </ul>
      </fieldset>
      <DialogFooter>
        <Button icon="close" variant="secondary" onClick={onClose}>
          Đóng
        </Button>
        <Button icon="arrow_forward" variant="primary" disabled={!picked} onClick={() => setProjectId(picked)}>
          Tiếp tục
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

/** Hộp báo lỗi của một công trình; chờ thông tin bảo hành (thiết bị, gói thiên tai) rồi mới mở để form đủ lựa chọn */
function FaultFor({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const warranty = useWarrantyQuery(projectId)
  if (warranty.isPending) return null
  return (
    <ReportFaultDialog
      open
      projectId={projectId}
      assets={warranty.data?.assets ?? []}
      subscriptions={warranty.data?.subscriptions ?? []}
      onClose={onClose}
    />
  )
}
