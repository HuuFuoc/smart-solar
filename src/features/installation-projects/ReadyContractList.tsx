import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
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
        Mỗi hợp đồng chỉ có một dự án thi công, kể cả khi dự án đó bị huỷ sau này. Dự án mới ở trạng thái chờ xếp kỹ
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
          Huỷ
        </Button>
        <Button icon="add" variant="primary" disabled={create.isPending} onClick={() => void submit()}>
          {create.isPending ? 'Đang tạo…' : 'Tạo dự án'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

export function ReadyContractList({ rows, detailPattern }: { rows: PaidContractSource[]; detailPattern: string }) {
  const [picked, setPicked] = useState<PaidContractSource | null>(null)
  return (
    <>
      <Table stack>
        <thead>
          <tr>
            <Th>Hợp đồng</Th>
            <Th className="text-right">Giá trị</Th>
            <Th>Thanh toán đủ lúc</Th>
            <Th>Vị trí công trình</Th>
            <Th>
              <span className="sr-only">Thao tác</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <Tr key={c.contractId}>
              <Td label="Hợp đồng">
                <p className="font-medium text-fg">{c.contractNumber}</p>
                <p className="tnum text-meta text-fg-2">Yêu cầu khảo sát {shortCode(c.surveyRequestId)}</p>
              </Td>
              <Td label="Giá trị" className="tnum lg:text-right">
                {formatMoney(c.totalAmount, 'VND')}
              </Td>
              <Td label="Thanh toán đủ lúc" className="tnum">
                {formatMoment(c.paidAt)}
              </Td>
              <Td label="Vị trí công trình">
                {c.latitude != null && c.longitude != null ? (
                  <a
                    className="tnum ui-link"
                    href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {c.latitude}, {c.longitude}
                    <span className="sr-only"> (mở bản đồ ở tab mới)</span>
                  </a>
                ) : (
                  <span className="text-fg-3">Chưa có toạ độ</span>
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
