import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { contractStatusMeta, formatContractMoney, versionLabel } from '@/features/contracts/contractDisplay'
import { isCustomerTodo, latestPerContract } from '@/features/contracts/customerContractRules'
import { stageMeta } from '@/features/payment-plan/paymentPlanDisplay'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { ROUTES, withId } from '@/routes/paths'

// Trên trang yêu cầu khảo sát / báo giá của khách: hợp đồng lập từ đó (phiên bản mới nhất), dẫn sang trang hợp đồng.
// Chưa có hợp đồng khách thấy được thì không hiện gì
export function ContractLinkPanel({
  surveyRequestId,
  quotationId,
}: {
  surveyRequestId?: string
  quotationId?: string
}) {
  const query = useMyContractsQuery()
  const related = (query.data ?? []).filter(
    (c) =>
      (!surveyRequestId || c.surveyRequestId === surveyRequestId) && (!quotationId || c.quotationId === quotationId),
  )
  const latest = latestPerContract(related)[0]
  if (!latest) return null
  // Hợp đồng 30/70 hiện chặng (trả 30%, ký giấy, trả 70%…), hợp đồng cũ hiện trạng thái
  const status = latest.paymentPlan
    ? stageMeta(latest.paymentPlan.stage, 'customer')
    : contractStatusMeta(latest.status, 'customer')
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Hợp đồng <Badge tone={isCustomerTodo(latest) ? 'danger' : status.tone}>{status.label}</Badge>
          </span>
        }
        description={
          <span className="tnum">
            Số {latest.contractNumber}, {versionLabel(latest).toLowerCase()}, {formatContractMoney(latest)}.
          </span>
        }
        action={
          <ButtonLink
            icon="visibility"
            variant="info"
            size="sm"
            to={withId(ROUTES.customer.contract, latest.contractId)}
          >
            Xem hợp đồng
          </ButtonLink>
        }
      />
    </Panel>
  )
}
