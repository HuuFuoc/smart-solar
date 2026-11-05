import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Field, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import {
  changedMeanwhile,
  claimStatusMeta,
  disasterTypeLabel,
  managerActionError,
} from '@/features/after-sales/managerAfterSalesDisplay'
import { CLAIM_REASON_MAX, canDecideClaim, claimReasonError } from '@/features/after-sales/managerAfterSalesRules'
import { formatVnd } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useDecideClaimMutation } from '@/hooks/useManagerAfterSales'
import type { DisasterClaimView, ServiceRequestView } from '@/types/res/customerAfterSalesRes'

// Hỗ trợ của gói thiên tai cho một yêu cầu báo lỗi. Quản lý duyệt hoặc từ chối dựa trên ảnh, báo cáo của kỹ thuật viên;
// khách được xin xét lại một lần (backend trả `canRequestReconsideration`). Số tiền hỗ trợ do backend tính trên báo giá:
// tỷ lệ × chi phí hợp lệ, không vượt hạn mức còn lại của sự cố và của kỳ, làm tròn xuống đồng. FE không tự tính

function ClaimFacts({ claim }: { claim: DisasterClaimView }) {
  const items = [
    { k: 'Loại thiên tai', v: disasterTypeLabel(claim.disasterType) },
    { k: 'Xảy ra lúc', v: formatMoment(claim.incidentOccurredAt) },
    { k: 'Tỷ lệ hỗ trợ của gói', v: <span className="tnum">{claim.coveragePercent} %</span> },
    { k: 'Hạn mức mỗi sự cố', v: <span className="tnum">{formatVnd(claim.perIncidentLimit)}</span> },
    { k: 'Đã giữ cho yêu cầu này', v: <span className="tnum">{formatVnd(claim.supportReserved)}</span> },
    { k: 'Đã chi', v: <span className="tnum">{formatVnd(claim.supportConsumed)}</span> },
  ]
  if (claim.reconsiderationRequestedAt)
    items.push({ k: 'Khách xin xét lại lúc', v: formatMoment(claim.reconsiderationRequestedAt) })
  if (claim.decisionReason) items.push({ k: 'Lý do quyết định', v: claim.decisionReason })
  return <KeyValueList items={items} columns={2} />
}

function DecisionForm({ request }: { request: ServiceRequestView }) {
  const decide = useDecideClaimMutation()
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const again = request.claim?.status === 'RECONSIDERATION_REQUESTED'

  async function submit(approve: boolean) {
    if (decide.isPending) return
    const problem = claimReasonError(approve, reason)
    setFieldError(problem)
    setError(null)
    if (problem) return
    try {
      await decide.mutateAsync({ requestId: request.requestId, body: { approve, reason: reason.trim() || null } })
      toast.success(approve ? 'Đã duyệt hỗ trợ của gói thiên tai.' : 'Đã từ chối hỗ trợ của gói thiên tai.')
      setReason('')
    } catch (e) {
      // Người khác vừa quyết định: khối tải lại và ẩn form, nên báo bằng toast
      if (changedMeanwhile(e)) toast.error(managerActionError(e))
      else setError(managerActionError(e))
    }
  }

  return (
    <div className="space-y-4">
      {again && (
        <Notice tone="info">
          Khách xin xét lại sau lần từ chối trước. Đây là lần xét lại duy nhất; quyết định lần này là cuối cùng.
        </Notice>
      )}
      <Field
        label="Lý do"
        htmlFor="claim-reason"
        hint={`Bắt buộc khi từ chối, khách đọc được. Tối đa ${CLAIM_REASON_MAX} ký tự.`}
        error={fieldError}
      >
        <Textarea
          id="claim-reason"
          rows={3}
          maxLength={CLAIM_REASON_MAX}
          value={reason}
          disabled={decide.isPending}
          onChange={(e) => {
            setReason(e.target.value)
            setFieldError(undefined)
          }}
        />
      </Field>
      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button icon="verified" variant="primary" disabled={decide.isPending} onClick={() => void submit(true)}>
          {decide.isPending ? 'Đang gửi…' : 'Duyệt hỗ trợ'}
        </Button>
        <Button icon="block" variant="danger" disabled={decide.isPending} onClick={() => void submit(false)}>
          Từ chối
        </Button>
      </div>
    </div>
  )
}

export function ClaimDecisionPanel({ request }: { request: ServiceRequestView }) {
  const claim = request.claim
  if (!claim) return null
  const status = claimStatusMeta(claim.status)
  return (
    <Panel id="claim" className="scroll-mt-6">
      <PanelHeader title="Hỗ trợ của gói thiên tai" action={<Badge tone={status.tone}>{status.label}</Badge>} />
      <PanelBody className="space-y-4">
        <ClaimFacts claim={claim} />
        {claim.status === 'NOT_ELIGIBLE' && (
          <Notice tone="neutral">
            Không có gói bảo vệ thiên tai nào còn hiệu lực cho loại thiên tai và thời điểm này nên không xét hỗ trợ
            được.
          </Notice>
        )}
        {claim.status === 'APPROVED' && (
          <Notice tone="neutral">
            Xét bảo hành các hạng mục bị thiên tai làm hỏng là "Gói bảo vệ thiên tai". Số tiền gói hỗ trợ hiện trên báo
            giá của kinh doanh.
          </Notice>
        )}
        {claim.status === 'REJECTED' && (
          <p className="text-body text-fg-2">
            {claim.canRequestReconsideration ? 'Khách còn được xin xét lại một lần.' : 'Khách đã dùng lần xin xét lại.'}
          </p>
        )}
        {canDecideClaim(request) && <DecisionForm request={request} />}
      </PanelBody>
    </Panel>
  )
}
