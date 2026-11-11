import { Icon } from '@/components/common/stitch-ui/Icon'
import type { Tone } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Panel } from '@/components/common/ui/panel'
import { contractStatusMeta, formatContractMoney, versionLabel } from '@/features/contracts/contractDisplay'
import { latestPerContract } from '@/features/contracts/customerContractRules'
import { StatusBadge } from '@/features/pre-surveys/components/StatusBadge'
import {
  formatQuotationMoney,
  latestPerRequest,
  quotationStatusMeta,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useMyQuotationsQuery } from '@/hooks/useCustomerQuotations'
import { ROUTES, withId } from '@/routes/paths'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { QuotationView } from '@/types/res/quotationsRes'

type DocumentRow = {
  id: string
  icon: string
  kind: string
  code: string
  statusLabel: string
  tone: Tone
  amount: string
  to: string
}

/** Chuẩn hoá tone sang hệ màu xanh thương hiệu + xám trung tính; chỉ dùng warn/danger khi thực sự cần chú ý. */
function calmQuotationTone(q: QuotationView, rawTone: Tone): Tone {
  if (q.status === 'ISSUED' && q.isExpired) return 'warn'
  if (q.status === 'REVISION_REQUESTED') return 'warn'
  if (q.status === 'ISSUED') return 'accent'
  if (q.status === 'ACCEPTED') return 'ok'
  return rawTone === 'info' ? 'neutral' : rawTone
}

function calmContractTone(c: ContractView, rawTone: Tone): Tone {
  if (c.status === 'SIGNATURE_REJECTED') return 'warn'
  if (c.status === 'AWAITING_SIGNATURE' || c.status === 'SIGNED') return 'accent'
  if (c.status === 'PAID') return 'ok'
  return rawTone === 'info' ? 'neutral' : rawTone
}

/** Khối gộp Báo giá & Hợp đồng thành từng hàng gọn trong "Tài liệu liên quan". Chỉ hiện hàng có dữ liệu. */
export function RelatedDocuments({ surveyRequestId }: { surveyRequestId: string }) {
  const quotations = useMyQuotationsQuery()
  const contracts = useMyContractsQuery()

  const latestQuotation = quotations.data
    ? latestPerRequest(quotations.data).find((q) => q.surveyRequestId === surveyRequestId)
    : undefined

  const relatedContracts = (contracts.data ?? []).filter((c) => c.surveyRequestId === surveyRequestId)
  const latestContract = latestPerContract(relatedContracts)[0]

  const rows: DocumentRow[] = []

  if (latestQuotation) {
    const status = quotationStatusMeta(latestQuotation, 'customer')
    rows.push({
      id: `quotation-${latestQuotation.quotationId}`,
      icon: 'request_quote',
      kind: 'Báo giá',
      code: quotationTitle(latestQuotation),
      statusLabel: status.label,
      tone: calmQuotationTone(latestQuotation, status.tone),
      amount: formatQuotationMoney(latestQuotation.totalAmount, latestQuotation.currency),
      to: withId(ROUTES.customer.quotation, latestQuotation.quotationId),
    })
  }

  if (latestContract) {
    const status = contractStatusMeta(latestContract.status, 'customer')
    rows.push({
      id: `contract-${latestContract.contractId}`,
      icon: 'description',
      kind: 'Hợp đồng',
      code: `${latestContract.contractNumber}, ${versionLabel(latestContract).toLowerCase()}`,
      statusLabel: status.label,
      tone: calmContractTone(latestContract, status.tone),
      amount: formatContractMoney(latestContract),
      to: withId(ROUTES.customer.contract, latestContract.contractId),
    })
  }

  if (rows.length === 0) return null

  return (
    <Panel raised aria-labelledby="related-documents-heading">
      <h2 id="related-documents-heading" className="mb-3 text-title font-semibold text-fg">
        Tài liệu liên quan
      </h2>
      <ul className="divide-y divide-line">
        {rows.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-col gap-3 py-3 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-2 text-accent-fg"
              >
                <Icon name={doc.icon} className="text-[20px]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-semibold text-fg">{doc.kind}</span>
                  <span className="tnum text-body text-fg-2">{doc.code}</span>
                  <StatusBadge label={doc.statusLabel} tone={doc.tone} size="sm" />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 pl-12 sm:justify-end sm:pl-0">
              <span className="tnum text-body font-semibold text-fg">{doc.amount}</span>
              <ButtonLink
                to={doc.to}
                variant="secondary"
                size="sm"
                icon="visibility"
                aria-label={`Xem ${doc.kind.toLowerCase()} ${doc.code}`}
              >
                Xem
              </ButtonLink>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
