import { ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { StatusTableSection } from '@/components/common/ui/status-tables'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { pricingBlockers } from '@/features/quotations/quotationRules'
import { quotationTitle } from '@/features/quotations/quotationDisplay'
import { usePendingReviewQuotationsQuery } from '@/hooks/useSalesQuotations'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { MySurveyRequestItem } from '@/types/res/surveyRequestsRes'

// Đầu tab "Của tôi" của kinh doanh: báo giá phải xem lại (bản tạo từ biên bản khảo sát còn vấn đề về giá, hoặc biên bản
// khảo sát đổi sau khi lập). Việc làm ở khối Báo giá của trang yêu cầu nên mỗi dòng chỉ dẫn sang đó. Không có thì không hiện
export function PendingReviewQuotations({ requests }: { requests: MySurveyRequestItem[] }) {
  const query = usePendingReviewQuotationsQuery()
  if (query.data === undefined && query.isError)
    return <Notice tone="danger">{`Không tải được báo giá cần xem lại. ${errorMessage(query.error)}`}</Notice>
  const list = query.data ?? []
  if (list.length === 0) return null
  const nameOf = (id: string) =>
    requests.find((r) => r.surveyRequestId === id)?.propertyName || 'Công trình chưa đặt tên'
  return (
    <StatusTableSection title="Báo giá cần xem lại" count={list.length} emptyText="">
      <Table stack>
        <thead>
          <tr>
            <Th>Công trình</Th>
            <Th>Báo giá</Th>
            <Th>Cần làm</Th>
            <Th className="text-right">
              <span className="sr-only">Thao tác</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {list.map((q) => (
            <Tr key={q.quotationId}>
              <Td label="Công trình" className="font-medium text-fg">
                {nameOf(q.surveyRequestId)}
              </Td>
              <Td label="Báo giá" className="tnum text-fg-2">
                {quotationTitle(q)}
              </Td>
              <Td label="Cần làm" className="text-meta text-fg-2">
                {(q.status === 'DRAFT' ? pricingBlockers(q) : ['Biên bản khảo sát đã đổi: lập bản sửa.']).map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </Td>
              <Td className="whitespace-nowrap lg:text-right">
                <ButtonLink
                  size="sm"
                  variant="info"
                  icon="visibility"
                  to={withId(ROUTES.ops.survey, q.surveyRequestId)}
                >
                  Mở yêu cầu
                </ButtonLink>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </StatusTableSection>
  )
}
