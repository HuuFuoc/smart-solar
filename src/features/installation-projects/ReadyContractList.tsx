import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { Facts } from '@/features/pre-surveys/Facts'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { installationErrorMessage } from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useCreateProjectMutation } from '@/hooks/useManagerInstallations'
import { withId } from '@/routes/paths'
import type { PaidContractSource } from '@/types/res/managerInstallationsRes'
import { formatMoney } from '@/utils/format'

// Hợp đồng đã thanh toán đủ mà chưa có dự án. Chọn một hợp đồng rồi xác nhận mới tạo dự án
// Tiền hợp đồng luôn là VND (QuotationPricing.Currency của backend)

function CreateProjectDialog({
  contract,
  detailPattern,
  onClose,
}: {
  contract: PaidContractSource
  detailPattern: string
  onClose: () => void
}) {
  const navigate = useNavigate()
  const create = useCreateProjectMutation()
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    try {
      const view = await create.mutateAsync(contract.contractId)
      toast.success(`Đã tạo dự án thi công cho hợp đồng ${contract.contractNumber}.`)
      onClose()
      navigate(withId(detailPattern, view.projectId))
    } catch (e) {
      setError(installationErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && onClose()}
      dismissible={!create.isPending}
      className="max-w-lg"
      aria-label="Tạo dự án thi công"
    >
      <DialogTitle>Tạo dự án thi công</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Mỗi hợp đồng chỉ có một dự án thi công, kể cả khi dự án đó bị hủy sau này. Dự án mới ở trạng thái chờ xếp kỹ
        thuật viên.
      </p>
      <Facts
        className="mt-4"
        items={[
          { k: 'Hợp đồng', v: contract.contractNumber },
          { k: 'Giá trị', v: formatMoney(contract.totalAmount, 'VND') },
          { k: 'Thanh toán đủ lúc', v: formatMoment(contract.paidAt) },
        ]}
      />
      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={create.isPending} onClick={onClose}>
          Hủy
        </Button>
        <Button icon="add" variant="primary" disabled={create.isPending} onClick={() => void submit()}>
          {create.isPending ? 'Đang tạo…' : 'Tạo dự án'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function ReadyContractList({
  rows,
  detailPattern,
  contractPattern,
}: {
  rows: PaidContractSource[]
  detailPattern: string
  contractPattern: string
}) {
  const [picked, setPicked] = useState<PaidContractSource | null>(null)
  return (
    <>
      <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
        <Table stack>
          <thead>
            <tr>
              <Th className="border-r border-line">Hợp đồng đã thanh toán</Th>
              <Th className="border-r border-line text-right">Giá trị hợp đồng</Th>
              <Th className="border-r border-line">Thời điểm thanh toán</Th>
              <Th className="border-r border-line">Vị trí công trình</Th>
              <Th className="text-right">
                <span>Thao tác</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((c) => (
              <Tr key={c.contractId} className="hover:bg-surface-2/60 transition-colors">
                <Td label="Hợp đồng" className="border-r border-line">
                  <Link className="font-semibold ui-link" to={withId(contractPattern, c.contractId)}>
                    {c.contractNumber}
                  </Link>
                  <p className="tnum text-meta text-fg-2 mt-0.5">Khảo sát {shortCode(c.surveyRequestId)}</p>
                </Td>
                <Td
                  label="Giá trị"
                  className="border-r border-line tnum lg:text-right font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  {formatMoney(c.totalAmount, 'VND')}
                </Td>
                <Td label="Thanh toán" className="border-r border-line tnum text-meta text-fg-2">
                  {formatMoment(c.paidAt)}
                </Td>
                <Td label="Vị trí" className="border-r border-line">
                  {c.latitude != null && c.longitude != null ? (
                    <a
                      className="tnum ui-link inline-flex items-center gap-1 font-mono text-meta"
                      href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="location_on" className="text-accent text-[16px]" aria-hidden />
                      {c.latitude}, {c.longitude}
                    </a>
                  ) : (
                    <span className="text-fg-3 italic">Chưa có tọa độ</span>
                  )}
                </Td>
                <Td className="lg:text-right">
                  <Button icon="add" size="sm" variant="soft" onClick={() => setPicked(c)}>
                    Tạo dự án
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <div className="border-t border-line bg-surface-2/40 px-4 py-2.5 text-meta text-fg-3 flex items-center justify-between">
          <span>
            Có <strong>{rows.length}</strong> hợp đồng sẵn sàng khởi tạo dự án thi công
          </span>
        </div>
      </div>
      {picked && (
        <CreateProjectDialog
          key={picked.contractId}
          contract={picked}
          detailPattern={detailPattern}
          onClose={() => setPicked(null)}
        />
      )}
    </>
  )
}
