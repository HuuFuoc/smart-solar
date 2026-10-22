import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import {
  formatQuotationMoney,
  latestPerRequest,
  quotationStatusMeta,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import { useMyQuotationsQuery } from '@/hooks/useCustomerQuotations'
import { ROUTES, withId } from '@/routes/paths'

// Trên trang yêu cầu khảo sát của khách: bản báo giá mới nhất của công trình này, dẫn sang trang báo giá
// Chưa có báo giá thì không hiện gì
export function RequestQuotationPanel({ surveyRequestId }: { surveyRequestId: string }) {
  const query = useMyQuotationsQuery()
  const latest = query.data && latestPerRequest(query.data).find((q) => q.surveyRequestId === surveyRequestId)
  if (!latest) return null
  const status = quotationStatusMeta(latest, 'customer')
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Báo giá <Badge tone={status.tone}>{status.label}</Badge>
          </span>
        }
        description={
          <span className="tnum">
            Số {quotationTitle(latest)}, tổng cộng {formatQuotationMoney(latest.totalAmount, latest.currency)}.
          </span>
        }
        action={
          <ButtonLink
            icon="visibility"
            variant="info"
            size="sm"
            to={withId(ROUTES.customer.quotation, latest.quotationId)}
          >
            Xem báo giá
          </ButtonLink>
        }
      />
    </Panel>
  )
}
