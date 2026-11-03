import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { KeyValueList } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { QuotationForm } from '@/features/after-sales/QuotationForm'
import { QuotationDetail, ServiceItemList, ServiceVisitList } from '@/features/after-sales/ServiceRequestParts'
import { isQuotationTask, requestKindLabel, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useClaimTaskMutation,
  useMyTasksQuery,
  useOpenTasksQuery,
  useSalesServiceRequestQuery,
} from '@/hooks/useSalesAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

const isWorking = (t: SalesTaskView) => t.status === 'CLAIMED' || t.status === 'IN_PROGRESS'

function nextStep(
  r: ServiceRequestView,
  mine: SalesTaskView | undefined,
  open: SalesTaskView | undefined,
): TrackerNext {
  if (r.status === 'AWAITING_QUOTATION') {
    if (mine)
      return {
        tone: 'danger',
        title: 'Lập báo giá cho khách',
        body: 'Gửi xong, khách duyệt và thanh toán trên web.',
        action: { label: 'Lập báo giá', icon: 'request_quote', target: 'quotation-form' },
      }
    if (open) return { tone: 'danger', title: 'Việc báo giá chưa ai nhận', body: 'Nhận việc để lập báo giá.' }
    return { tone: 'info', title: 'Một nhân viên kinh doanh khác đang lập báo giá' }
  }
  if (r.status === 'AWAITING_CUSTOMER') return { tone: 'info', title: 'Chờ khách duyệt và thanh toán báo giá' }
  return { tone: 'neutral', title: requestStatusMeta(r.status, 'sales').label }
}

// Chi tiết yêu cầu cho kinh doanh: nội dung, hạng mục khách trả tiền, lập báo giá khi đã nhận việc
export function OpsAfterSalesRequestPage() {
  const { id } = useParams()
  const query = useSalesServiceRequestQuery(id)
  const myTasks = useMyTasksQuery()
  const openTasks = useOpenTasksQuery()
  const claim = useClaimTaskMutation()
  usePageCrumb(query.data ? query.data.requestNumber : null)

  const forRequest = (t: SalesTaskView) => t.requestId === id && isQuotationTask(t)
  const mine = myTasks.data?.find((t) => forRequest(t) && isWorking(t))
  const open = openTasks.data?.find(forRequest)

  async function claimTask(taskId: string) {
    try {
      await claim.mutateAsync(taskId)
      toast.success('Đã nhận việc.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <QueryBoundary query={query}>
      {(r) => {
        const status = requestStatusMeta(r.status, 'sales')
        const next = nextStep(r, mine, open)
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                  <span className="tnum">Gửi {formatMoment(r.createdAt)}</span>
                </>
              }
              title={
                <>
                  {requestKindLabel(r.kind)} <span className="tnum">{r.requestNumber}</span>
                </>
              }
              actions={
                r.status === 'AWAITING_QUOTATION' &&
                !mine &&
                open && (
                  <Button
                    icon="assignment_turned_in"
                    variant="primary"
                    disabled={claim.isPending}
                    onClick={() => void claimTask(open.taskId)}
                  >
                    Nhận việc
                  </Button>
                )
              }
            />
            <div className="space-y-6">
              <ProgressTracker
                steps={[
                  { label: 'Nhận việc', state: mine || r.status !== 'AWAITING_QUOTATION' ? 'done' : 'current' },
                  {
                    label: 'Lập báo giá',
                    state: r.status === 'AWAITING_QUOTATION' ? (mine ? 'current' : 'todo') : 'done',
                  },
                  {
                    label: 'Khách duyệt, thanh toán',
                    state:
                      r.status === 'AWAITING_CUSTOMER'
                        ? 'current'
                        : r.status === 'AWAITING_QUOTATION'
                          ? 'todo'
                          : 'done',
                  },
                ]}
                next={next}
              />
              {r.status === 'AWAITING_QUOTATION' && mine && (
                <Panel id="quotation-form" className="scroll-mt-6">
                  <PanelHeader
                    title="Lập báo giá"
                    description={r.kind === 'FAULT' ? 'Mỗi hạng mục khách trả tiền một dòng.' : undefined}
                  />
                  <PanelBody>
                    <QuotationForm request={r} />
                  </PanelBody>
                </Panel>
              )}
              <Panel>
                <PanelHeader title="Nội dung yêu cầu" />
                <PanelBody className="space-y-4">
                  <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{r.description}</p>
                  <KeyValueList
                    columns={2}
                    items={[
                      { k: 'Loại', v: requestKindLabel(r.kind) },
                      { k: 'Giờ khách muốn hẹn', v: formatMoment(r.preferredStartsAt) },
                    ]}
                  />
                </PanelBody>
              </Panel>
              {r.items.length > 0 && (
                <Panel>
                  <PanelHeader title="Kết quả kiểm tra" description={`${r.items.length} hạng mục`} />
                  <PanelBody>
                    <ServiceItemList items={r.items} />
                  </PanelBody>
                </Panel>
              )}
              {r.quotations.length > 0 && (
                <Panel>
                  <PanelHeader title="Báo giá đã gửi" />
                  <PanelBody className="space-y-6">
                    {[...r.quotations].reverse().map((q) => (
                      <QuotationDetail key={q.quotationId} quotation={q} />
                    ))}
                  </PanelBody>
                </Panel>
              )}
              {r.visits.length > 0 && (
                <Panel>
                  <PanelHeader title="Buổi hẹn" />
                  <PanelBody>
                    <ServiceVisitList visits={r.visits} />
                  </PanelBody>
                </Panel>
              )}
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}
