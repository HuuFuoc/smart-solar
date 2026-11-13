import { useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { QUOTATION_LIMITS } from '@/common/quotation'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Field, Radio, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { PriceAdjustmentTable, PricingApprovalHistory } from '@/features/quotations/PricingApproval'
import { QuotationLines, QuotationTerms, QuotationTotals } from '@/features/quotations/QuotationContent'
import {
  formatDateVn,
  formatQuotationMoney,
  pricingApprovalMeta,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import {
  approvalReasonError,
  canDecidePricingApproval,
  priceAdjustments,
  pricingApprovalStatus,
  totalReduction,
} from '@/features/quotations/quotationRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useApprovalQuotationQuery,
  useDecidePricingApprovalMutation,
  usePricingApprovalsQuery,
} from '@/hooks/useManagerQuotationApprovals'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Quản lý duyệt bộ giá của bản nháp báo giá lắp đặt có giảm giá, đơn giá dưới giá danh mục hoặc giá 0. Chỉ vai trò Manager;
// kinh doanh phụ trách không tự duyệt. Quyết định gắn với đúng bộ giá lúc xin: kinh doanh sửa giá sau đó thì yêu cầu hết hiệu
// lực (backend trả QUOTATION_PRICING_APPROVAL_NOT_PENDING), dữ liệu tự tải lại

const requestedAt = (q: QuotationView) => q.pricingApproval?.request?.at ?? null

export function ManagePricingApprovalsPage() {
  const query = usePricingApprovalsQuery()
  const items = [...(query.data ?? [])].sort((a, b) => (requestedAt(a) ?? '').localeCompare(requestedAt(b) ?? ''))
  return (
    <>
      <PageHeader
        title="Duyệt giá"
        description={items.length > 0 ? <Badge tone="danger">{items.length} báo giá chờ duyệt</Badge> : undefined}
      />
      <section aria-label="Báo giá chờ duyệt giá" aria-busy={query.isFetching}>
        {query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, 'Không tải được báo giá chờ duyệt.')}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Không có báo giá nào chờ duyệt giá"
            description="Khi kinh doanh xin duyệt giảm giá hoặc đơn giá thấp hơn giá danh mục, báo giá hiện ở đây."
          />
        ) : (
          <Table stack>
            <thead>
              <tr>
                <Th>Báo giá</Th>
                <Th className="text-right">Tổng cộng</Th>
                <Th className="text-right">Giảm so với danh mục</Th>
                <Th>Xin duyệt lúc</Th>
                <Th className="text-right">
                  <span className="sr-only">Thao tác</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => {
                const reduction = totalReduction(priceAdjustments(q))
                return (
                  <Tr key={q.quotationId}>
                    <Td label="Báo giá">
                      <p className="tnum font-medium text-fg">{quotationTitle(q)}</p>
                      {q.pricingApproval?.request?.reason && (
                        <p className="line-clamp-2 text-meta text-fg-2">{q.pricingApproval.request.reason}</p>
                      )}
                    </Td>
                    <Td label="Tổng cộng" className="tnum whitespace-nowrap lg:text-right">
                      {formatQuotationMoney(q.totalAmount, q.currency)}
                    </Td>
                    <Td label="Giảm so với danh mục" className="tnum whitespace-nowrap lg:text-right">
                      {reduction != null ? formatQuotationMoney(reduction, q.currency) : '—'}
                    </Td>
                    <Td label="Xin duyệt lúc" className="tnum">
                      {formatMoment(requestedAt(q))}
                    </Td>
                    <Td className="text-right">
                      <ButtonLink
                        to={withId(ROUTES.manage.pricingApproval, q.quotationId)}
                        size="sm"
                        variant="info"
                        icon="fact_check"
                      >
                        Xét giá
                      </ButtonLink>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </section>
    </>
  )
}

function DecisionPanel({ quotation: q }: { quotation: QuotationView }) {
  const decide = useDecidePricingApprovalMutation()
  const [approve, setApprove] = useState(true)
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reasonError = checked ? approvalReasonError(reason) : undefined

  async function submit() {
    if (decide.isPending) return
    setChecked(true)
    setError(null)
    if (approvalReasonError(reason)) return
    try {
      await decide.mutateAsync({ quotationId: q.quotationId, revision: q.revision, approve, reason: reason.trim() })
      toast.success(
        approve ? 'Đã duyệt giá. Kinh doanh gửi được báo giá cho khách.' : 'Đã báo kinh doanh không duyệt giá.',
      )
    } catch (e) {
      // Kinh doanh vừa sửa giá hoặc người khác vừa quyết định: dữ liệu đã tải lại
      if (
        isApiError(e) &&
        (e.code === 'QUOTATION_PRICING_APPROVAL_NOT_PENDING' || e.code === 'QUOTATION_STALE_REVISION')
      )
        toast.error(e.message)
      else setError(errorMessage(e))
    }
  }

  return (
    <Panel>
      <PanelHeader title="Quyết định" />
      <PanelBody>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="space-y-4"
        >
          <fieldset className="space-y-2">
            <legend className="text-body font-medium text-fg">Xét bộ giá này</legend>
            <Radio
              name="pricing-decision"
              label="Duyệt, cho gửi khách với giá này"
              checked={approve}
              disabled={decide.isPending}
              onChange={() => setApprove(true)}
            />
            <Radio
              name="pricing-decision"
              label="Không duyệt"
              checked={!approve}
              disabled={decide.isPending}
              onChange={() => setApprove(false)}
            />
          </fieldset>
          <Field
            label="Lý do"
            htmlFor="pricing-decision-reason"
            required
            hint={`Kinh doanh đọc được lý do này. Tối đa ${QUOTATION_LIMITS.approvalReasonLength} ký tự.`}
            error={reasonError}
          >
            <Textarea
              id="pricing-decision-reason"
              rows={3}
              value={reason}
              maxLength={QUOTATION_LIMITS.approvalReasonLength}
              aria-required
              aria-invalid={reasonError ? true : undefined}
              disabled={decide.isPending}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {error && (
            <div role="alert">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <Button
            type="submit"
            icon={approve ? 'check_circle' : 'block'}
            variant={approve ? 'primary' : 'danger'}
            disabled={decide.isPending}
          >
            {decide.isPending ? 'Đang gửi…' : approve ? 'Duyệt giá' : 'Không duyệt'}
          </Button>
        </form>
      </PanelBody>
    </Panel>
  )
}

export function ManagePricingApprovalPage() {
  const { id } = useParams()
  const query = useApprovalQuotationQuery(id)
  usePageCrumb(query.data ? quotationTitle(query.data) : null)
  return (
    <QueryBoundary query={query}>
      {(q) => {
        const status = pricingApprovalMeta(pricingApprovalStatus(q), 'manager')
        return (
          <>
            <PageHeader
              meta={<Badge tone={status.tone}>{status.label}</Badge>}
              title={quotationTitle(q)}
              description={<span className="tnum">Tổng cộng {formatQuotationMoney(q.totalAmount, q.currency)}</span>}
            />
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                  {canDecidePricingApproval(q) ? (
                    <DecisionPanel key={`${q.quotationId}-${q.revision}`} quotation={q} />
                  ) : (
                    <Notice tone="neutral">
                      {q.status !== 'DRAFT'
                        ? 'Báo giá đã gửi khách hoặc không còn là bản nháp.'
                        : 'Bộ giá hiện tại không chờ duyệt (đã có quyết định, hoặc kinh doanh đã sửa giá sau khi xin).'}
                    </Notice>
                  )}
                </div>
                <Panel>
                  <PanelHeader title="Yêu cầu của kinh doanh" />
                  <PanelBody className="space-y-4">
                    <PricingApprovalHistory approval={q.pricingApproval} />
                    <KeyValueList
                      items={[
                        { k: 'Hiệu lực đến', v: q.validUntil ? `Hết ngày ${formatDateVn(q.validUntil)}` : '—' },
                        {
                          k: 'Lập bởi',
                          v: q.origin === 'AUTOMATIC' ? 'Hệ thống tự lập, kinh doanh sửa' : 'Kinh doanh',
                        },
                      ]}
                    />
                  </PanelBody>
                </Panel>
              </div>
              <Panel>
                <PanelHeader title="Điểm lệch giá danh mục" />
                <PanelBody>
                  <PriceAdjustmentTable quotation={q} />
                </PanelBody>
              </Panel>
              <Panel>
                <PanelHeader title="Dòng hàng" />
                <PanelBody className="space-y-6">
                  <QuotationLines quotation={q} showCatalogPrice />
                  <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
                    <QuotationTerms quotation={q} />
                    <QuotationTotals quotation={q} />
                  </div>
                </PanelBody>
              </Panel>
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}
