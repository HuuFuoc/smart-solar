import { Badge } from '@/components/common/ui/badge'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, UnavailableState } from '@/components/common/ui/states'
import { QuotationLines, QuotationTerms, QuotationTotals } from '@/features/quotations/QuotationContent'
import {
  currentQuotation,
  formatDateVn,
  formatQuotationMoney,
  quotationErrorMessage,
  quotationOriginLabel,
  quotationStatusMeta,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useQuotationsQuery } from '@/hooks/useSalesQuotations'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'

// Báo giá lắp đặt của một yêu cầu, chỉ xem, cho kinh doanh phụ trách (tư vấn khách). Kỹ thuật viên đã khảo sát lập và gửi báo
// giá; khách trả lời trên cổng khách hàng. Bản nháp vẫn hiện để kinh doanh biết kỹ thuật viên đang soạn

export function QuotationReadPanel({ surveyRequestId, enabled }: { surveyRequestId: string; enabled: boolean }) {
  const query = useQuotationsQuery(surveyRequestId, { enabled })
  if (!enabled) return null
  const list = query.data ?? []
  const q = list.length > 0 ? currentQuotation(list) : undefined
  const status = q ? quotationStatusMeta(q, 'staff') : null
  return (
    <Panel id="quotation" className="scroll-mt-6">
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Báo giá {status && <Badge tone={status.tone}>{status.label}</Badge>}
          </span>
        }
        description={q ? quotationTitle(q) : undefined}
      />
      <PanelBody className="space-y-4">
        {query.isPending ? (
          <p className="text-body text-fg-2">Đang tải báo giá…</p>
        ) : query.data === undefined ? (
          isFeatureUnavailable(query.error) ? (
            <UnavailableState message="Chưa xem được báo giá." pendingMigrations={pendingMigrationsOf(query.error)} />
          ) : (
            <ErrorState
              title="Không tải được báo giá."
              message={quotationErrorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          )
        ) : !q ? (
          <EmptyState
            title="Chưa có báo giá"
            description="Kỹ thuật viên đã khảo sát lập báo giá từ danh mục sản phẩm."
          />
        ) : (
          <>
            {q.status === 'DRAFT' && <p className="text-body text-fg-2">Kỹ thuật viên đang soạn, khách chưa thấy.</p>}
            {q.status === 'ISSUED' && (
              <p className="text-body text-fg-2">
                Gửi khách lúc {formatMoment(q.issuedAt)}, hiệu lực đến hết ngày {formatDateVn(q.validUntil)}.
              </p>
            )}
            {q.status === 'REVISION_REQUESTED' && (
              <Notice title="Khách yêu cầu sửa, kỹ thuật viên lập bản sửa">
                <span className="whitespace-pre-line">{q.revisionReason || 'Khách không ghi lý do.'}</span>
              </Notice>
            )}
            {q.origin !== 'TECHNICIAN' && <p className="text-meta text-fg-2">{quotationOriginLabel(q.origin)}.</p>}
            <QuotationLines quotation={q} showCatalogPrice />
            <QuotationTotals quotation={q} className="ml-auto" />
            <QuotationTerms quotation={q} />
            {list.length > 1 && (
              <details className="border-t border-line pt-4">
                <summary className="tap cursor-pointer text-body font-medium text-fg">Các bản ({list.length})</summary>
                <ul className="mt-3 space-y-2">
                  {[...list]
                    .sort((a, b) => b.version - a.version)
                    .map((v) => {
                      const meta = quotationStatusMeta(v, 'staff')
                      return (
                        <li
                          key={v.quotationId}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 text-body"
                        >
                          <span className="tnum text-fg">
                            Bản {v.version}, {formatQuotationMoney(v.totalAmount, v.currency)}
                          </span>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </li>
                      )
                    })}
                </ul>
              </details>
            )}
          </>
        )}
      </PanelBody>
    </Panel>
  )
}
