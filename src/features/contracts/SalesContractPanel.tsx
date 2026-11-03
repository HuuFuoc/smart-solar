import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, UnavailableState } from '@/components/common/ui/states'
import { ContractTermsDialog } from '@/features/contracts/ContractTermsDialog'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import { contractStatusMeta } from '@/features/contracts/contractDisplay'
import { acceptedQuotation, canCreateContract, currentContract } from '@/features/contracts/contractRules'
import { useSurveyRequestContractsQuery } from '@/hooks/useContracts'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Hợp đồng trên trang yêu cầu khảo sát của kinh doanh: lập từ báo giá khách đã đồng ý, rồi mở từng phiên bản để phát hành,
// gắn PDF, gửi ký, duyệt bản ký, lập phụ lục. Chỉ hiện khi đã có báo giá ACCEPTED (trước đó backend không lập được)

export function SalesContractPanel({
  surveyRequestId,
  quotations,
}: {
  surveyRequestId: string
  quotations: QuotationView[] | undefined
}) {
  const navigate = useNavigate()
  const accepted = acceptedQuotation(quotations ?? [])
  const query = useSurveyRequestContractsQuery(surveyRequestId, { enabled: accepted !== null })
  const [creating, setCreating] = useState(false)
  if (!accepted) return null

  const current = query.data ? currentContract(query.data) : null
  const status = current ? contractStatusMeta(current.status) : null

  return (
    <Panel id="contracts" className="scroll-mt-6">
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Hợp đồng {status && <Badge tone={status.tone}>{status.label}</Badge>}
          </span>
        }
        description={current ? `${current.contractNumber}` : undefined}
      />
      <PanelBody className="space-y-4">
        {query.isPending ? (
          <p className="text-body text-fg-2">Đang tải hợp đồng…</p>
        ) : query.data === undefined ? (
          isFeatureUnavailable(query.error) ? (
            <UnavailableState
              message="Chưa lập hoặc xem được hợp đồng trên web."
              pendingMigrations={pendingMigrationsOf(query.error)}
            />
          ) : (
            <ErrorState
              title="Không tải được hợp đồng."
              message={errorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          )
        ) : (
          <>
            {canCreateContract(accepted, query.data) && (
              <EmptyState
                title="Chưa có hợp đồng"
                description={`Lập hợp đồng theo báo giá ${accepted.quoteNumber} khách đã đồng ý. Giá được chép nguyên từ báo giá.`}
                action={
                  <Button icon="add" variant="soft" onClick={() => setCreating(true)}>
                    Lập hợp đồng
                  </Button>
                }
              />
            )}
            {query.data.length > 0 && <ContractVersionList versions={query.data} detailPattern={ROUTES.ops.contract} />}
          </>
        )}
      </PanelBody>
      {creating && (
        <ContractTermsDialog
          target={{ mode: 'create', quotation: accepted }}
          onClose={() => setCreating(false)}
          onDone={(view) => void navigate(withId(ROUTES.ops.contract, view.contractId))}
        />
      )}
    </Panel>
  )
}
