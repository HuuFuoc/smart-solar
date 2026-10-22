import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { QUOTATION_LIMITS } from '@/common/quotation'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { AcceptQuotationDialog } from '@/features/quotations/AcceptQuotationDialog'
import { QuotationLines, QuotationTerms, QuotationTotals } from '@/features/quotations/QuotationContent'
import {
  byVersionDesc,
  formatDateVn,
  quotationStatusMeta,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import {
  useMyQuotationQuery,
  useMyQuotationsQuery,
  useRequestQuotationRevisionMutation,
} from '@/hooks/useCustomerQuotations'
import { ROUTES, withId } from '@/routes/paths'
import type { QuotationView } from '@/types/res/quotationsRes'

/* Một câu nói báo giá đang ở đâu và việc tiếp theo là của ai */
function describe(q: QuotationView) {
  if (q.canAccept)
    return `Xem các hạng mục bên dưới rồi đồng ý hoặc yêu cầu sửa trước hết ngày ${formatDateVn(q.validUntil)}.`
  if (q.status === 'ISSUED')
    return `Báo giá đã hết hạn ngày ${formatDateVn(q.validUntil)}. Liên hệ nhân viên kinh doanh để nhận bản mới.`
  if (q.status === 'ACCEPTED')
    return `Bạn đã đồng ý lúc ${formatMoment(q.acceptedAt)}. Smart Solar sẽ lập hợp đồng theo đúng báo giá này.`
  if (q.status === 'REVISION_REQUESTED')
    return 'Nhân viên kinh doanh đang sửa báo giá theo yêu cầu của bạn và sẽ gửi bản mới.'
  if (q.status === 'SUPERSEDED') return 'Bản này đã được thay bằng bản mới.'
  return undefined
}

// Chi tiết một bản báo giá lắp đặt của khách: đồng ý hoặc yêu cầu sửa khi còn hiệu lực
export function CustomerQuotationPage() {
  const { id } = useParams()
  const query = useMyQuotationQuery(id)
  // Các bản khác của cùng công trình và tên công trình: không có thì trang vẫn đủ dùng
  const all = useMyQuotationsQuery()
  const requests = useMyRequestsQuery()
  const askRevision = useRequestQuotationRevisionMutation()
  const [accepting, setAccepting] = useState(false)
  const [revising, setRevising] = useState(false)
  usePageCrumb(query.data ? quotationTitle(query.data) : null)

  return (
    <QueryBoundary query={query}>
      {(q) => {
        const status = quotationStatusMeta(q, 'customer')
        const propertyName = requests.data?.find((r) => r.surveyRequestId === q.surveyRequestId)?.propertyName
        const versions = (all.data ?? []).filter((v) => v.surveyRequestId === q.surveyRequestId).sort(byVersionDesc)
        const newest = versions[0]
        const newer = newest && newest.version > q.version ? newest : null
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="tnum">Số {quotationTitle(q)}</span>
                </>
              }
              title={propertyName || 'Báo giá lắp đặt'}
              description={describe(q)}
              actions={
                q.canAccept ? (
                  <>
                    <Button icon="check_circle" variant="primary" onClick={() => setAccepting(true)}>
                      Đồng ý báo giá
                    </Button>
                    <Button icon="edit_note" variant="soft" onClick={() => setRevising(true)}>
                      Yêu cầu sửa
                    </Button>
                  </>
                ) : undefined
              }
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                {newer && (
                  <Notice tone="info" title={`Đã có bản ${newer.version} mới hơn`}>
                    Bản bạn đang xem không còn hiệu lực.
                    <span className="mt-3 flex">
                      <ButtonLink
                        icon="visibility"
                        variant="info"
                        size="sm"
                        to={withId(ROUTES.customer.quotation, newer.quotationId)}
                      >
                        Xem bản {newer.version}
                      </ButtonLink>
                    </span>
                  </Notice>
                )}
                {q.status === 'REVISION_REQUESTED' && q.revisionReason && (
                  <Notice title="Điều bạn yêu cầu sửa">
                    <span className="whitespace-pre-line">{q.revisionReason}</span>
                  </Notice>
                )}
                <Panel>
                  <PanelHeader title="Hạng mục" />
                  <PanelBody className="space-y-6">
                    <QuotationLines quotation={q} />
                    <div className="flex justify-end">
                      <QuotationTotals quotation={q} />
                    </div>
                  </PanelBody>
                </Panel>
                {(q.terms || q.notes) && (
                  <Panel>
                    <QuotationTerms quotation={q} />
                  </Panel>
                )}
              </div>

              <PanelAside aria-label="Thông tin báo giá">
                <Panel>
                  <PanelHeader title="Thông tin" />
                  <PanelBody>
                    <KeyValueList
                      items={[
                        { k: 'Số báo giá', v: <span className="tnum">{q.quoteNumber}</span> },
                        { k: 'Bản', v: <span className="tnum">{q.version}</span> },
                        { k: 'Gửi lúc', v: <span className="tnum">{formatMoment(q.issuedAt)}</span> },
                        { k: 'Hiệu lực đến hết', v: <span className="tnum">{formatDateVn(q.validUntil)}</span> },
                        ...(q.acceptedAt
                          ? [{ k: 'Đồng ý lúc', v: <span className="tnum">{formatMoment(q.acceptedAt)}</span> }]
                          : []),
                        {
                          k: 'Công trình',
                          v: (
                            <Link className="ui-link" to={withId(ROUTES.customer.request, q.surveyRequestId)}>
                              {propertyName || 'Xem yêu cầu khảo sát'}
                            </Link>
                          ),
                        },
                      ]}
                    />
                  </PanelBody>
                </Panel>
                {versions.length > 1 && (
                  <Panel>
                    <PanelHeader title="Các bản" />
                    <PanelBody>
                      <ul className="space-y-2">
                        {versions.map((v) => {
                          const meta = quotationStatusMeta(v, 'customer')
                          const here = v.quotationId === q.quotationId
                          return (
                            <li key={v.quotationId} className="flex flex-wrap items-center gap-2 text-body">
                              {here ? (
                                <span aria-current="page" className="font-semibold text-fg">
                                  Bản {v.version} (đang xem)
                                </span>
                              ) : (
                                <Link className="ui-link" to={withId(ROUTES.customer.quotation, v.quotationId)}>
                                  Bản {v.version}
                                </Link>
                              )}
                              <Badge tone={meta.tone}>{meta.label}</Badge>
                            </li>
                          )
                        })}
                      </ul>
                    </PanelBody>
                  </Panel>
                )}
              </PanelAside>
            </div>

            <AcceptQuotationDialog open={accepting} quotation={q} onClose={() => setAccepting(false)} />
            <ReasonDialog
              open={revising}
              title="Yêu cầu sửa báo giá?"
              description="Ghi rõ điều bạn muốn đổi (hạng mục, số lượng, giá…). Bản này giữ nguyên, nhân viên kinh doanh sẽ gửi bản mới để bạn xem lại."
              label="Điều muốn sửa"
              maxLength={QUOTATION_LIMITS.reasonLength}
              submitLabel="Gửi yêu cầu sửa"
              icon="send"
              onSubmit={async (reason) => {
                await askRevision.mutateAsync({ quotationId: q.quotationId, reason })
                toast.success('Đã gửi yêu cầu sửa. Nhân viên kinh doanh sẽ gửi bản mới.')
              }}
              onClose={() => setRevising(false)}
            />
          </>
        )
      }}
    </QueryBoundary>
  )
}
