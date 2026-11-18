import { Badge } from '@/components/common/ui/badge'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, UnavailableState } from '@/components/common/ui/states'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import { contractStatusMeta } from '@/features/contracts/contractDisplay'
import { acceptedQuotation, currentContract } from '@/features/contracts/contractRules'
import { useSurveyRequestContractsQuery } from '@/hooks/useContracts'
import { ROUTES } from '@/routes/paths'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Hợp đồng trên trang yêu cầu khảo sát của kinh doanh, chỉ xem. Khách trả tiền báo giá thì backend tự lập bản nháp; quản lý / quản
// trị hoàn thiện, phát hành, gửi ký, duyệt bản ký. Chỉ hiện khi đã có báo giá ACCEPTED (trước đó chưa có hợp đồng)

export function SalesContractPanel({
  surveyRequestId,
  quotations,
}: {
  surveyRequestId: string
  quotations: QuotationView[] | undefined
}) {
  const accepted = acceptedQuotation(quotations ?? [])
  const query = useSurveyRequestContractsQuery(surveyRequestId, { enabled: accepted !== null })
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
              message="Chưa xem được hợp đồng trên web."
              pendingMigrations={pendingMigrationsOf(query.error)}
            />
          ) : (
            <ErrorState
              title="Không tải được hợp đồng."
              message={errorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          )
        ) : query.data.length === 0 ? (
          <EmptyState
            title="Hợp đồng đang được chuẩn bị"
            description={`Khách đã đồng ý báo giá ${accepted.quoteNumber} với kỹ thuật viên. Hợp đồng tự lập khi tiền được xác minh; quản lý hoàn thiện hồ sơ để khách ký.`}
          />
        ) : (
          <ContractVersionList versions={query.data} detailPattern={ROUTES.ops.contract} />
        )}
      </PanelBody>
    </Panel>
  )
}
