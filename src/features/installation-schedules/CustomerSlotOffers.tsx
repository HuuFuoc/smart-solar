import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { Radio } from '@/components/common/ui/field'
import { ErrorState } from '@/components/common/ui/states'
import { ContractConfirmDialog } from '@/features/contracts/ContractConfirmDialog'
import { scheduleErrorMessage, scheduleWhen } from '@/features/installation-schedules/scheduleDisplay'
import { customerOfferChoices } from '@/features/installation-schedules/scheduleRules'
import { useCustomerOffersQuery, useSelectOfferMutation } from '@/hooks/useInstallationSchedules'
import type { InstallationSlotOfferView } from '@/types/res/installationSchedulesRes'

// Khung thi công kỹ thuật viên đề xuất, khách chọn một. Khung không giữ chỗ: lúc chọn backend kiểm lại, hết chỗ thì 409 và
// danh sách tải lại. Chọn xong là lịch dự kiến; chỉ xác nhận khi hợp đồng đã thanh toán

export function CustomerSlotOffers({ contractId, paid }: { contractId: string; paid: boolean }) {
  const query = useCustomerOffersQuery(contractId)
  const select = useSelectOfferMutation()
  const [picked, setPicked] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<InstallationSlotOfferView | null>(null)

  if (query.isPending) return null
  if (query.isError)
    return (
      <ErrorState
        title="Không tải được các khung thi công kỹ thuật viên đề xuất."
        message={scheduleErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  const choices = customerOfferChoices(query.data)
  if (choices.length === 0) return null
  const chosen = choices.find((c) => c.offer.offerId === picked && c.choosable)?.offer ?? null
  const note = choices.find((c) => c.offer.note)?.offer.note

  return (
    <fieldset className="space-y-3 border-b border-line pb-4">
      <legend className="text-body font-medium text-fg">
        Kỹ thuật viên {choices[0]?.offer.technicianName} đề xuất {choices.length} khung, chọn một
      </legend>
      {note && <p className="text-body whitespace-pre-line text-fg-2">{note}</p>}
      <ul className="divide-y divide-line border-y border-line">
        {choices.map(({ offer, choosable }) => (
          <li key={offer.offerId} className="py-2">
            <Radio
              name={`slot-offer-${contractId}`}
              checked={picked === offer.offerId}
              disabled={!choosable || select.isPending}
              onChange={() => setPicked(offer.offerId)}
              label={<span className="tnum">{scheduleWhen(offer)}</span>}
              description={choosable ? undefined : 'Khung này không còn trống'}
            />
          </li>
        ))}
      </ul>
      <Button icon="event_available" variant="soft" disabled={!chosen} onClick={() => setConfirming(chosen)}>
        Chọn khung này
      </Button>
      {confirming && (
        <ContractConfirmDialog
          title="Chọn ngày thi công?"
          confirmLabel="Chọn khung này"
          icon="event_available"
          successText={
            paid ? 'Đã chọn ngày thi công.' : 'Đã chọn. Lịch được xác nhận sau khi hợp đồng được thanh toán.'
          }
          formatError={scheduleErrorMessage}
          run={() => select.mutateAsync(confirming.offerId)}
          onClose={() => {
            setConfirming(null)
            setPicked(null)
          }}
        >
          <p className="tnum text-fg">{scheduleWhen(confirming)}</p>
          <p>
            {paid
              ? 'Hợp đồng đã thanh toán nên lịch được xác nhận ngay khi kỹ thuật viên còn trống.'
              : 'Đây là ngày dự kiến, chưa xác nhận. Lịch được xác nhận sau khi hợp đồng được thanh toán.'}{' '}
            Các khung còn lại sẽ bị rút.
          </p>
        </ContractConfirmDialog>
      )}
    </fieldset>
  )
}
